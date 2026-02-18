/**
 * config-db.ts — Postgres abstraction for shared Rainbow AI config
 *
 * Stores JSON configs and KB files in Postgres so both primary and standby
 * servers share the same state. Every function returns null / swallows errors
 * when DATABASE_URL is not set (backward compat with JSON-only mode).
 *
 * Tables:
 *   rainbow_configs      — key/JSONB store for all JSON config files
 *   rainbow_kb_files     — text store for .rainbow-kb/ markdown files
 *   rainbow_config_audit — append-only log of every config change
 */

import { pool } from './db.js';

// ─── Guard: skip all DB ops when no DATABASE_URL ────────────────────

function hasDB(): boolean {
  return !!process.env.DATABASE_URL;
}

// ─── Table Creation (idempotent) ────────────────────────────────────

export async function ensureConfigTables(): Promise<void> {
  if (!hasDB()) {
    console.log('[ConfigDB] No DATABASE_URL — running in JSON-only mode');
    return;
  }
  try {
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
    console.log('[ConfigDB] Tables ensured (rainbow_configs, rainbow_kb_files, rainbow_config_audit)');
  } catch (err: any) {
    console.error('[ConfigDB] Failed to create tables:', err.message);
  }
}

// ─── Config CRUD ────────────────────────────────────────────────────

export async function loadConfigFromDB(key: string): Promise<any | null> {
  if (!hasDB()) return null;
  try {
    const { rows } = await pool.query(
      'SELECT data FROM rainbow_configs WHERE key = $1',
      [key]
    );
    return rows.length > 0 ? rows[0].data : null;
  } catch (err: any) {
    console.error(`[ConfigDB] loadConfigFromDB(${key}) failed:`, err.message);
    return null;
  }
}

export async function saveConfigToDB(
  key: string,
  data: unknown,
  changedBy?: string
): Promise<void> {
  if (!hasDB()) return;
  try {
    const serverRole = process.env.RAINBOW_ROLE || 'unknown';
    // UPSERT with version increment + audit in a single transaction
    await pool.query('BEGIN');

    // Get current version (if exists)
    const { rows: existing } = await pool.query(
      'SELECT version FROM rainbow_configs WHERE key = $1',
      [key]
    );
    const oldVersion = existing.length > 0 ? existing[0].version : null;
    const newVersion = oldVersion !== null ? oldVersion + 1 : 1;

    await pool.query(
      `INSERT INTO rainbow_configs (key, data, version, updated_at, updated_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (key)
       DO UPDATE SET data = $2, version = $3, updated_at = NOW(), updated_by = $4`,
      [key, JSON.stringify(data), newVersion, changedBy || null]
    );

    // Audit log
    await pool.query(
      `INSERT INTO rainbow_config_audit (config_key, action, changed_by, server_role, old_version, new_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [key, oldVersion === null ? 'create' : 'update', changedBy || null, serverRole, oldVersion, newVersion]
    );

    await pool.query('COMMIT');
  } catch (err: any) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(`[ConfigDB] saveConfigToDB(${key}) failed:`, err.message);
  }
}

// ─── KB File CRUD ───────────────────────────────────────────────────

export async function loadAllKBFromDB(): Promise<Map<string, string> | null> {
  if (!hasDB()) return null;
  try {
    const { rows } = await pool.query('SELECT filename, content FROM rainbow_kb_files');
    if (rows.length === 0) return null;
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.filename, row.content);
    }
    return map;
  } catch (err: any) {
    console.error('[ConfigDB] loadAllKBFromDB() failed:', err.message);
    return null;
  }
}

export async function saveKBFileToDB(filename: string, content: string): Promise<void> {
  if (!hasDB()) return;
  try {
    await pool.query(
      `INSERT INTO rainbow_kb_files (filename, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (filename)
       DO UPDATE SET content = $2, updated_at = NOW()`,
      [filename, content]
    );
  } catch (err: any) {
    console.error(`[ConfigDB] saveKBFileToDB(${filename}) failed:`, err.message);
  }
}

// ─── Audit Query ────────────────────────────────────────────────────

export async function getConfigAuditLog(limit: number = 50): Promise<any[]> {
  if (!hasDB()) return [];
  try {
    const { rows } = await pool.query(
      `SELECT id, config_key, action, changed_by, server_role, old_version, new_version, created_at
       FROM rainbow_config_audit
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err: any) {
    console.error('[ConfigDB] getConfigAuditLog() failed:', err.message);
    return [];
  }
}
