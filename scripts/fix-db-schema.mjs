/**
 * fix-db-schema.mjs — Fix dev DB after capsule→unit migration partial state
 *
 * State found:
 * - `units` table exists but has `unit_number` column (schema expects `number`)
 * - `capsules` table still exists alongside `units`
 *
 * This script:
 * 1. Shows counts in both tables
 * 2. Renames units.unit_number → units.number
 * 3. Renames idx references
 * 4. Drops old capsules table (after confirming units has data)
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL || readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

// Check counts
const capsuleCount = await client.query('SELECT COUNT(*) FROM capsules');
const unitCount = await client.query('SELECT COUNT(*) FROM units');
console.log(`capsules rows: ${capsuleCount.rows[0].count}`);
console.log(`units rows: ${unitCount.rows[0].count}`);

// Check if units.number already exists
const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='units'");
const colNames = cols.rows.map(r => r.column_name);
console.log('units columns:', colNames.join(', '));

await client.query('BEGIN');
try {
  if (colNames.includes('unit_number') && !colNames.includes('number')) {
    console.log('Renaming units.unit_number → units.number ...');
    await client.query('ALTER TABLE units RENAME COLUMN unit_number TO number');
    console.log('✓ Column renamed');
  } else if (colNames.includes('number')) {
    console.log('units.number already exists — skipping rename');
  }

  // Rename index if it exists under old name
  const idxResult = await client.query(
    "SELECT indexname FROM pg_indexes WHERE tablename='units' AND indexname LIKE '%unit_number%'"
  );
  for (const row of idxResult.rows) {
    const newName = row.indexname.replace('unit_number', 'number').replace('idx_units_unit_number', 'idx_units_number');
    console.log(`Renaming index ${row.indexname} → ${newName}`);
    await client.query(`ALTER INDEX IF EXISTS "${row.indexname}" RENAME TO "${newName}"`);
  }

  // Apply 0008: add usage_json if not present
  const msgCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='rainbow_messages'");
  const msgColNames = msgCols.rows.map(r => r.column_name);
  if (!msgColNames.includes('usage_json')) {
    console.log('Adding usage_json to rainbow_messages ...');
    await client.query("ALTER TABLE rainbow_messages ADD COLUMN IF NOT EXISTS usage_json text");
    console.log('✓ usage_json added');
  } else {
    console.log('usage_json already exists in rainbow_messages');
  }

  await client.query('COMMIT');
  console.log('\n✅ Schema fixes applied');
} catch (e) {
  await client.query('ROLLBACK');
  console.error('❌ Error, rolled back:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
