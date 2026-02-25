import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_FgfSkr3b5tiT@ep-ancient-forest-aeh28zhu-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Check current columns
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'units' ORDER BY ordinal_position`);
    console.log('Current units columns:', cols.rows.map(r => r.column_name));

    const hasNumber = cols.rows.some(r => r.column_name === 'number');
    const hasUnitNumber = cols.rows.some(r => r.column_name === 'unit_number');

    if (hasUnitNumber && !hasNumber) {
      console.log('Column already renamed to unit_number. Nothing to do.');
    } else if (hasNumber) {
      console.log('Renaming column number → unit_number...');
      await client.query(`ALTER TABLE units RENAME COLUMN "number" TO unit_number`);
      console.log('Column renamed successfully.');
    } else {
      console.log('WARNING: Neither "number" nor "unit_number" found in units table!');
    }

    // Rename old capsule index if it exists
    const idxResult = await client.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'units' AND indexname = 'idx_capsules_is_available'`);
    if (idxResult.rows.length > 0) {
      await client.query(`ALTER INDEX idx_capsules_is_available RENAME TO idx_units_is_available`);
      console.log('Renamed idx_capsules_is_available → idx_units_is_available');
    } else {
      console.log('idx_capsules_is_available not found (may already be renamed or not exist). OK.');
    }

    // Show final columns
    const finalCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'units' ORDER BY ordinal_position`);
    console.log('Final units columns:', finalCols.rows.map(r => r.column_name));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
