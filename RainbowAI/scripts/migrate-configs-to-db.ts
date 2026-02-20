/**
 * migrate-configs-to-db.ts — One-time migration script
 *
 * Seeds the shared Postgres DB with all JSON config files and KB markdown files.
 * Safe to run multiple times: uses INSERT ... ON CONFLICT DO NOTHING
 * (won't overwrite existing data that may have been modified via dashboard).
 *
 * Usage:
 *   cd RainbowAI
 *   npx tsx scripts/migrate-configs-to-db.ts
 */

import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: resolve(__dirname, '..', '.env') });
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Add it to RainbowAI/.env first.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

async function main() {
  console.log('Connecting to database...');
  await pool.query('SELECT NOW()');
  console.log('Connected.');

  // 1. Create tables
  console.log('\n--- Creating tables ---');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rainbow_configs (
      key         TEXT PRIMARY KEY,
      data        JSONB NOT NULL,
      version     INTEGER NOT NULL DEFAULT 1,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by  TEXT
    );
    CREATE TABLE IF NOT EXISTS rainbow_kb_files (
      filename    TEXT PRIMARY KEY,
      content     TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rainbow_config_audit (
      id          SERIAL PRIMARY KEY,
      config_key  TEXT NOT NULL,
      action      TEXT NOT NULL,
      changed_by  TEXT,
      server_role TEXT,
      old_version INTEGER,
      new_version INTEGER,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Tables ensured.');

  // 2. Migrate JSON config files
  const dataDir = resolve(__dirname, '..', 'src', 'assistant', 'data');
  console.log(`\n--- Migrating JSON configs from ${dataDir} ---`);

  let configCount = 0;
  let configSkipped = 0;

  if (existsSync(dataDir)) {
    const jsonFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
    for (const file of jsonFiles) {
      try {
        const content = readFileSync(join(dataDir, file), 'utf-8');
        const data = JSON.parse(content);
        const { rowCount } = await pool.query(
          `INSERT INTO rainbow_configs (key, data, version, updated_at, updated_by)
           VALUES ($1, $2, 1, NOW(), 'migration')
           ON CONFLICT (key) DO NOTHING`,
          [file, JSON.stringify(data)]
        );
        if (rowCount && rowCount > 0) {
          console.log(`  ✅ ${file} — inserted`);
          configCount++;
        } else {
          console.log(`  ⏭️  ${file} — already exists, skipped`);
          configSkipped++;
        }
      } catch (err: any) {
        console.error(`  ❌ ${file} — ${err.message}`);
      }
    }
  } else {
    console.log('  Data directory not found, skipping JSON migration.');
  }

  // 3. Migrate KB markdown files
  const kbDir = resolve(__dirname, '..', '.rainbow-kb');
  console.log(`\n--- Migrating KB files from ${kbDir} ---`);

  let kbCount = 0;
  let kbSkipped = 0;

  if (existsSync(kbDir)) {
    const mdFiles = readdirSync(kbDir).filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      try {
        const content = readFileSync(join(kbDir, file), 'utf-8');
        const { rowCount } = await pool.query(
          `INSERT INTO rainbow_kb_files (filename, content, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (filename) DO NOTHING`,
          [file, content]
        );
        if (rowCount && rowCount > 0) {
          console.log(`  ✅ ${file} — inserted`);
          kbCount++;
        } else {
          console.log(`  ⏭️  ${file} — already exists, skipped`);
          kbSkipped++;
        }
      } catch (err: any) {
        console.error(`  ❌ ${file} — ${err.message}`);
      }
    }

    // Also migrate memory/ subdirectory
    const memoryDir = join(kbDir, 'memory');
    if (existsSync(memoryDir)) {
      const memFiles = readdirSync(memoryDir).filter(f => f.endsWith('.md'));
      for (const file of memFiles) {
        try {
          const content = readFileSync(join(memoryDir, file), 'utf-8');
          const key = `memory/${file}`;
          const { rowCount } = await pool.query(
            `INSERT INTO rainbow_kb_files (filename, content, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (filename) DO NOTHING`,
            [key, content]
          );
          if (rowCount && rowCount > 0) {
            console.log(`  ✅ ${key} — inserted`);
            kbCount++;
          } else {
            console.log(`  ⏭️  ${key} — already exists, skipped`);
            kbSkipped++;
          }
        } catch (err: any) {
          console.error(`  ❌ memory/${file} — ${err.message}`);
        }
      }
    }
  } else {
    console.log('  .rainbow-kb/ not found, skipping KB migration.');
  }

  // 4. Summary
  console.log('\n--- Migration Summary ---');
  console.log(`  Configs: ${configCount} inserted, ${configSkipped} skipped`);
  console.log(`  KB files: ${kbCount} inserted, ${kbSkipped} skipped`);
  console.log('\nDone! Both servers will now load configs from this shared database.');

  await pool.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
