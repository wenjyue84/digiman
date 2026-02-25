#!/usr/bin/env node
/**
 * scripts/migrate-all.mjs — Multi-tenant migration runner for digiman
 *
 * Applies SQL migration files from migrations/ to all configured tenant databases.
 * Tracks applied migrations in a _digiman_migrations table on each database.
 * Safe to re-run: already-applied migrations are skipped by tracking table + error codes.
 *
 * Usage:
 *   node scripts/migrate-all.mjs                      # Dev DBs only (default)
 *   node scripts/migrate-all.mjs --prod               # All 4 DBs (dev + prod)
 *   node scripts/migrate-all.mjs --dry-run            # Show what would run, no changes
 *   node scripts/migrate-all.mjs --status             # Show migration state per tenant
 *   node scripts/migrate-all.mjs --tenant=pelangi-dev # Single tenant only
 *
 * Production DB URLs are NOT stored in git. Provide them via:
 *   1. .env.prod-migrations file (gitignored) with PELANGI_PROD_DB_URL / SOUTHERN_PROD_DB_URL
 *   2. Shell env vars: PELANGI_PROD_DB_URL=... node scripts/migrate-all.mjs --prod
 *   3. SSH into Lightsail and run the script there (prod .env already on server)
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { parse as parseEnv } from 'dotenv';

// Use WebSocket driver (not HTTP) — required for PL/pgSQL DO $$ blocks,
// transactions, and any multi-statement execution.
neonConfig.webSocketConstructor = ws;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

// ─── Files to skip (not sequential schema migrations) ────────────────────────
const SKIP_FILES = new Set([
  'rename-capsules-to-units.sql',    // one-off utility, already done
  'rollback-units-to-capsules.sql',  // rollback script, not a forward migration
]);

// ─── Tenant registry ─────────────────────────────────────────────────────────
// Add new businesses here when you onboard them.
const TENANTS = [
  {
    name: 'pelangi-dev',
    label: '🏨 Pelangi Dev',
    getDbUrl: () => getUrlFromEnvFile('.env'),
    isProd: false,
  },
  {
    name: 'southern-dev',
    label: '🏡 Southern Dev',
    getDbUrl: () => getUrlFromEnvFile('.env.southern.local'),
    isProd: false,
  },
  {
    name: 'pelangi-prod',
    label: '🏨 Pelangi PROD ⚠️',
    getDbUrl: () => process.env.PELANGI_PROD_DB_URL ?? null,
    isProd: true,
    hint: 'Set PELANGI_PROD_DB_URL or add to .env.prod-migrations',
  },
  {
    name: 'southern-prod',
    label: '🏡 Southern PROD ⚠️',
    getDbUrl: () => process.env.SOUTHERN_PROD_DB_URL ?? null,
    isProd: true,
    hint: 'Set SOUTHERN_PROD_DB_URL or add to .env.prod-migrations',
  },
];

// ─── Postgres error codes that mean "already applied" (safe to skip) ─────────
const SAFE_CODES = new Set([
  '42P07', // duplicate_table         → CREATE TABLE when table already exists
  '42701', // duplicate_column        → ADD COLUMN when column already exists
  '42P01', // undefined_table         → RENAME TABLE when source already renamed
  '42704', // undefined_object        → RENAME INDEX when index already renamed
  '23505', // unique_violation        → INSERT tracking record already exists
  '42712', // duplicate_alias         → constraint name conflict (already added)
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUrlFromEnvFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return null;
  const parsed = parseEnv(fs.readFileSync(fullPath, 'utf-8'));
  return parsed.DATABASE_URL ?? null;
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !SKIP_FILES.has(f))
    .sort(); // 0000_... → 0008_... alphabetical = chronological
}

/**
 * Split a migration SQL file into individual statements.
 * Handles:
 *  - Drizzle's "--> statement-breakpoint" delimiter (0000, 0001)
 *  - Semicolon-separated statements (0002-0008)
 *  - DO $$ ... $$ PL/pgSQL blocks (kept intact, not split)
 *  - BEGIN / COMMIT / ROLLBACK (stripped — HTTP driver is per-request atomic)
 */
function splitIntoStatements(sqlContent) {
  // Step 1: Split on Drizzle's breakpoint marker
  const chunks = sqlContent.split(/--> statement-breakpoint/);

  const allStatements = [];
  for (const chunk of chunks) {
    const stmts = splitBySemicolon(chunk.trim());
    allStatements.push(...stmts);
  }

  return allStatements
    .filter(s => {
      if (!s) return false;
      const nonCommentLines = s.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('--'));
      if (nonCommentLines.length === 0) return false;
      // Drop bare transaction-control statements (BEGIN / COMMIT / ROLLBACK).
      // Only drop them when the ENTIRE statement is that one keyword — never
      // strip them from inside a DO $$ ... END $$ block (that would corrupt PL/pgSQL).
      if (nonCommentLines.length === 1) {
        const word = nonCommentLines[0].toUpperCase().replace(/;$/, '').trim();
        if (['BEGIN', 'COMMIT', 'ROLLBACK', 'START TRANSACTION'].includes(word)) return false;
      }
      return true;
    });
}

/**
 * Split SQL text by semicolons, but not inside $$ dollar-quoted blocks.
 * This correctly keeps DO $$ BEGIN ... END $$ as a single statement.
 */
function splitBySemicolon(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    // Detect dollar-quote start: $$ or $tag$
    if (!inDollarQuote && sql[i] === '$') {
      const tagEnd = sql.indexOf('$', i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1);
        if (/^\$[a-zA-Z_0-9]*\$$/.test(tag)) {
          inDollarQuote = true;
          dollarTag = tag;
          current += tag;
          i = tagEnd + 1;
          continue;
        }
      }
    }

    // Detect dollar-quote end
    if (inDollarQuote && sql.startsWith(dollarTag, i)) {
      inDollarQuote = false;
      current += dollarTag;
      i += dollarTag.length;
      continue;
    }

    // Semicolon outside dollar-quote = statement boundary
    if (sql[i] === ';' && !inDollarQuote) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    } else {
      current += sql[i];
    }
    i++;
  }

  const remaining = current.trim();
  if (remaining && !remaining.startsWith('--')) {
    statements.push(remaining);
  }

  return statements;
}

// ─── Core: run migrations for one tenant ─────────────────────────────────────

async function runForTenant(tenant, migrationFiles, opts) {
  const dbUrl = tenant.getDbUrl();

  if (!dbUrl) {
    const note = tenant.hint ?? 'env file not found';
    console.log(`  ⚠️  Skipped — ${note}`);
    return { skipped: true };
  }

  // Use Pool (WebSocket wire protocol) — supports PL/pgSQL DO $$ blocks,
  // which the HTTP neon() driver cannot handle correctly.
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    // Ensure tracking table exists (idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _digiman_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-applied set
    const { rows } = await client.query(`SELECT filename FROM _digiman_migrations ORDER BY id`);
    const applied = new Set(rows.map(r => r.filename));
    const pending = migrationFiles.filter(f => !applied.has(f));

    // ── Status mode ──────────────────────────────────────────────────────────
    if (opts.statusOnly) {
      if (applied.size) {
        console.log(`  Applied (${applied.size}): ${[...applied].map(f => f.replace('.sql', '')).join(', ')}`);
      } else {
        console.log(`  Applied (0): none yet`);
      }
      if (pending.length) {
        console.log(`  Pending (${pending.length}): ${pending.map(f => f.replace('.sql', '')).join(', ')}`);
      } else {
        console.log(`  Pending (0): ✅ up to date`);
      }
      return {};
    }

    // ── Nothing to do ────────────────────────────────────────────────────────
    if (pending.length === 0) {
      console.log(`  ✅ Up to date — ${applied.size} migration(s) applied`);
      return { applied: 0 };
    }

    const pendingNames = pending.map(f => f.replace('.sql', '')).join(', ');
    console.log(`  📋 Pending (${pending.length}): ${pendingNames}`);

    if (opts.dryRun) {
      console.log(`  🔍 Dry run — no changes made`);
      return { pending: pending.length };
    }

    // ── Apply pending migrations ──────────────────────────────────────────────
    let appliedCount = 0;

    for (const filename of pending) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');
      const statements = splitIntoStatements(content);

      if (statements.length === 0) {
        console.log(`  ⚠️  ${filename}: no executable statements found`);
        continue;
      }

      let migrationOk = true;

      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err) {
          if (SAFE_CODES.has(err.code)) {
            // Already-applied side effect — safe to continue
            const shortMsg = err.message.split('\n')[0].trim();
            console.log(`    ↩  Already applied (${err.code}): ${shortMsg}`);
          } else {
            console.error(`    ❌ SQL error in ${filename} (${err.code ?? 'unknown'}):`);
            console.error(`       ${err.message.split('\n')[0]}`);
            const preview = stmt.trim().slice(0, 100).replace(/\s+/g, ' ');
            console.error(`       Statement: ${preview}...`);
            migrationOk = false;
            break;
          }
        }
      }

      if (migrationOk) {
        // Record as applied — parameterized to avoid injection
        await client.query(
          `INSERT INTO _digiman_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
          [filename]
        );
        console.log(`  ✅ Applied: ${filename}`);
        appliedCount++;
      } else {
        console.error(`  ❌ Stopped at ${filename} — fix the error above, then re-run`);
        return { error: true };
      }
    }

    return { applied: appliedCount };

  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const prodMode = args.includes('--prod');
  const statusOnly = args.includes('--status');
  const verbose = args.includes('--verbose');
  const tenantFilter = args.find(a => a.startsWith('--tenant='))?.slice('--tenant='.length);

  // Load optional .env.prod-migrations (gitignored) for production DB URLs
  const prodMigrateEnvPath = path.join(ROOT, '.env.prod-migrations');
  if (fs.existsSync(prodMigrateEnvPath)) {
    const parsed = parseEnv(fs.readFileSync(prodMigrateEnvPath, 'utf-8'));
    if (parsed.PELANGI_PROD_DB_URL) process.env.PELANGI_PROD_DB_URL = parsed.PELANGI_PROD_DB_URL;
    if (parsed.SOUTHERN_PROD_DB_URL) process.env.SOUTHERN_PROD_DB_URL = parsed.SOUTHERN_PROD_DB_URL;
    console.log('  (loaded .env.prod-migrations)');
  }

  console.log('\n🚀  digiman migrate-all');
  console.log('═'.repeat(55));

  if (statusOnly)   console.log('📊 STATUS MODE\n');
  else if (dryRun)  console.log('🔍 DRY RUN — no changes will be made\n');
  else if (prodMode) console.log('⚠️  PRODUCTION MODE — changes apply to PROD DBs!\n');
  else               console.log('ℹ️  Dev databases only. Pass --prod to include production.\n');

  const migrationFiles = getMigrationFiles();
  console.log(`📁 ${migrationFiles.length} tracked migration files:`);
  if (verbose || statusOnly) {
    migrationFiles.forEach(f => console.log(`   ${f}`));
  } else {
    const names = migrationFiles.map(f => f.replace('.sql', ''));
    console.log(`   ${names.join(', ')}`);
  }
  console.log('');

  // Determine which tenants to target
  let tenants = TENANTS.filter(t => prodMode ? true : !t.isProd);
  if (tenantFilter) {
    tenants = TENANTS.filter(t => t.name === tenantFilter);
    if (!tenants.length) {
      console.error(`❌ Unknown tenant: "${tenantFilter}"`);
      console.error(`   Valid: ${TENANTS.map(t => t.name).join(', ')}`);
      process.exit(1);
    }
  }

  let hasError = false;

  for (const tenant of tenants) {
    console.log(`\n${tenant.label}`);
    console.log('─'.repeat(45));
    try {
      const result = await runForTenant(tenant, migrationFiles, { dryRun, statusOnly });
      if (result?.error) hasError = true;
    } catch (err) {
      console.error(`  ❌ Unexpected error: ${err.message}`);
      hasError = true;
    }
  }

  console.log('\n' + '═'.repeat(55));
  console.log(hasError ? '❌ Completed with errors — see above' : '✅ All done!');
  if (hasError) process.exit(1);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
