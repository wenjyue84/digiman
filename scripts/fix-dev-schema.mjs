/**
 * One-time fix: syncs the dev DB schema to match the current Drizzle schema.
 * Run with: node scripts/fix-dev-schema.mjs
 * Loads DATABASE_URL from .env automatically via dotenv.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load .env
try {
  require('dotenv/config');
} catch {
  // dotenv might not be available as a direct import, try alternate
  const { config } = await import('dotenv');
  config();
}

const { default: pg } = await import('pg');
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function runSQL(label, sql) {
  try {
    await pool.query(sql);
    console.log(`✅ ${label}`);
  } catch (err) {
    if (err.code === '42701') console.log(`⏭  ${label} — column already exists`);
    else if (err.code === '42703') console.log(`⏭  ${label} — column not found (already renamed?)`);
    else if (err.code === '42P01') console.log(`⏭  ${label} — table not found`);
    else console.error(`❌ ${label}: ${err.message}`);
  }
}

console.log('🔧 Fixing dev DB schema...\n');

// Fix 1: Rename "number" column to "unit_number" in units table
await runSQL(
  'units: rename "number" → "unit_number"',
  `ALTER TABLE units RENAME COLUMN "number" TO "unit_number"`
);

// Fix 2: Add "to_rent" column if missing
await runSQL(
  'units: add "to_rent" column',
  `ALTER TABLE units ADD COLUMN IF NOT EXISTS "to_rent" boolean NOT NULL DEFAULT true`
);

// Fix 3: Add "branch" column if missing
await runSQL(
  'units: add "branch" column',
  `ALTER TABLE units ADD COLUMN IF NOT EXISTS "branch" text`
);

// Fix 4: Add "unit_type" column if missing
await runSQL(
  'units: add "unit_type" column',
  `ALTER TABLE units ADD COLUMN IF NOT EXISTS "unit_type" text`
);

// Fix 5: Add "max_occupancy" column if missing
await runSQL(
  'units: add "max_occupancy" column',
  `ALTER TABLE units ADD COLUMN IF NOT EXISTS "max_occupancy" integer`
);

// Fix 6: Add "price_per_night" column if missing
await runSQL(
  'units: add "price_per_night" column',
  `ALTER TABLE units ADD COLUMN IF NOT EXISTS "price_per_night" text`
);

await pool.end();
console.log('\n✅ Done. Now restart the dev server.');
