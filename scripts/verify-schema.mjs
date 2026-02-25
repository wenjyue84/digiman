/**
 * verify-schema.mjs — Check that all critical columns exist in the DB
 * without using db:push (which would destroy Rainbow AI tables)
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL || readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

const checks = [
  { table: 'units', cols: ['id', 'number', 'section', 'is_available', 'cleaning_status', 'to_rent', 'unit_type', 'max_occupancy', 'price_per_night'] },
  { table: 'unit_problems', cols: ['id', 'unit_number', 'description', 'is_resolved'] },
  { table: 'rainbow_messages', cols: ['id', 'phone', 'role', 'content', 'usage_json'] },
  { table: 'guests', cols: ['id', 'name', 'unit_number'] },
  { table: 'guest_tokens', cols: ['id', 'token', 'unit_number'] },
];

let allOk = true;
for (const { table, cols } of checks) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]
  );
  const existing = new Set(res.rows.map(r => r.column_name));
  const missing = cols.filter(c => !existing.has(c));
  if (missing.length) {
    console.log(`❌ ${table}: missing columns: ${missing.join(', ')}`);
    allOk = false;
  } else {
    console.log(`✅ ${table}: all required columns present`);
  }
}

await client.end();
if (allOk) console.log('\n✅ Schema verification passed — DB is in sync');
else console.log('\n⚠️  Some columns missing — run fix script');
process.exit(allOk ? 0 : 1);
