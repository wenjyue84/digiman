/**
 * DEPRECATED — PMS now proxies to Rainbow AI for contact fields and scheduled rules.
 * Rainbow owns rainbow_custom_field_defs/values and rainbow_scheduled_rules/logs.
 * These PMS-side tables (contact_field_*, scheduled_message_*) are no longer used.
 * Kept for reference only. Safe to re-run — uses IF NOT EXISTS.
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating contact_field_definitions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_field_definitions (
        id           SERIAL PRIMARY KEY,
        field_key    TEXT UNIQUE NOT NULL,
        field_label  TEXT NOT NULL,
        field_type   TEXT NOT NULL,
        field_options JSONB,
        is_built_in  BOOLEAN NOT NULL DEFAULT false,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creating contact_field_values...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_field_values (
        id          SERIAL PRIMARY KEY,
        phone       TEXT NOT NULL,
        field_key   TEXT NOT NULL,
        value       TEXT,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by  TEXT,
        CONSTRAINT uq_cfv_phone_field_key UNIQUE (phone, field_key)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cfv_phone ON contact_field_values(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cfv_field_key ON contact_field_values(field_key)`);

    console.log('Creating scheduled_message_rules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_message_rules (
        id                    SERIAL PRIMARY KEY,
        name                  TEXT NOT NULL,
        description           TEXT,
        is_active             BOOLEAN NOT NULL DEFAULT true,
        trigger_field         TEXT NOT NULL,
        trigger_offset_hours  INTEGER NOT NULL,
        trigger_time_exact    TEXT,
        filter_rules          JSONB,
        message_en            TEXT NOT NULL,
        message_ms            TEXT,
        message_zh            TEXT,
        cooldown_hours        INTEGER NOT NULL DEFAULT 0,
        created_by            VARCHAR(64),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creating scheduled_message_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_message_logs (
        id          SERIAL PRIMARY KEY,
        rule_id     INTEGER NOT NULL,
        phone       TEXT NOT NULL,
        guest_name  TEXT,
        status      TEXT NOT NULL,
        error_msg   TEXT,
        sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sml_rule_id ON scheduled_message_logs(rule_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sml_phone ON scheduled_message_logs(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sml_sent_at ON scheduled_message_logs(sent_at)`);

    // Seed built-in contact field definitions
    console.log('Seeding built-in contact fields...');
    const builtInFields = [
      { key: 'check_in_date',   label: 'Check-in Date',       type: 'date',   options: null, order: 1 },
      { key: 'check_out_date',  label: 'Check-out Date',      type: 'date',   options: null, order: 2 },
      { key: 'room_unit',       label: 'Room / Unit',          type: 'text',   options: null, order: 3 },
      { key: 'booking_source',  label: 'Booking Source',       type: 'select', options: JSON.stringify(['airbnb','booking_com','agoda','direct','walk_in']), order: 4 },
      { key: 'booking_ref',     label: 'Booking Reference',    type: 'text',   options: null, order: 5 },
      { key: 'language',        label: 'Language',             type: 'select', options: JSON.stringify(['en','ms','zh']), order: 6 },
    ];

    for (const f of builtInFields) {
      await client.query(`
        INSERT INTO contact_field_definitions (field_key, field_label, field_type, field_options, is_built_in, sort_order)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT (field_key) DO NOTHING
      `, [f.key, f.label, f.type, f.options, f.order]);
    }

    console.log('✅ All homestay tables created successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
