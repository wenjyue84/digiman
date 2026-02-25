/**
 * Migration: capsule → unit renames
 * Renames tables and columns in the DB to match updated schema-tables.ts
 * Run once: node scripts/migrate-capsule-to-unit.mjs
 */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // --- 1. Check what currently exists ---
    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const tableNames = tables.map(r => r.tablename);
    console.log('Existing tables:', tableNames.join(', '));

    // --- Helper to check if column exists ---
    async function columnExists(table, col) {
      const { rows } = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name=$1 AND column_name=$2
      `, [table, col]);
      return rows.length > 0;
    }

    await client.query('BEGIN');

    // --- 2. Rename tables and fix units.number → unit_number ---
    if (tableNames.includes('capsules') && !tableNames.includes('units')) {
      console.log('Renaming capsules → units');
      await client.query('ALTER TABLE capsules RENAME TO units');
    } else if (tableNames.includes('units')) {
      console.log('✓ units table already exists');
    } else {
      console.log('⚠ capsules table not found — units may need to be created by drizzle-kit');
    }

    // units.number → unit_number (the primary identifier column)
    const unitsHasNumber = await columnExists('units', 'number');
    const unitsHasUnitNumber = await columnExists('units', 'unit_number');
    if (unitsHasNumber && !unitsHasUnitNumber) {
      console.log('Renaming units.number → unit_number');
      await client.query('ALTER TABLE units RENAME COLUMN "number" TO unit_number');
    } else if (unitsHasUnitNumber) {
      console.log('✓ units.unit_number already exists');
    }

    if (tableNames.includes('capsule_problems') && !tableNames.includes('unit_problems')) {
      console.log('Renaming capsule_problems → unit_problems');
      await client.query('ALTER TABLE capsule_problems RENAME TO unit_problems');
    } else if (tableNames.includes('unit_problems')) {
      console.log('✓ unit_problems table already exists');
    }

    // --- 3. Rename unit_number columns ---
    // guests table
    const guestHasCapsule = await columnExists('guests', 'capsule_number');
    const guestHasUnit = await columnExists('guests', 'unit_number');
    if (guestHasCapsule && !guestHasUnit) {
      console.log('Renaming guests.capsule_number → unit_number');
      await client.query('ALTER TABLE guests RENAME COLUMN capsule_number TO unit_number');
    } else if (guestHasUnit) {
      console.log('✓ guests.unit_number already exists');
    }

    // guest_tokens table
    const tokenHasCapsule = await columnExists('guest_tokens', 'capsule_number');
    const tokenHasUnit = await columnExists('guest_tokens', 'unit_number');
    if (tokenHasCapsule && !tokenHasUnit) {
      console.log('Renaming guest_tokens.capsule_number → unit_number');
      await client.query('ALTER TABLE guest_tokens RENAME COLUMN capsule_number TO unit_number');
    } else if (tokenHasUnit) {
      console.log('✓ guest_tokens.unit_number already exists');
    }

    // unit_problems table (may still be named capsule_problems before rename above)
    const upHasCapsule = await columnExists('unit_problems', 'capsule_number');
    const upHasUnit = await columnExists('unit_problems', 'unit_number');
    if (upHasCapsule && !upHasUnit) {
      console.log('Renaming unit_problems.capsule_number → unit_number');
      await client.query('ALTER TABLE unit_problems RENAME COLUMN capsule_number TO unit_number');
    } else if (upHasUnit) {
      console.log('✓ unit_problems.unit_number already exists');
    }

    // admin_notifications table
    const anHasCapsule = await columnExists('admin_notifications', 'capsule_number');
    const anHasUnit = await columnExists('admin_notifications', 'unit_number');
    if (anHasCapsule && !anHasUnit) {
      console.log('Renaming admin_notifications.capsule_number → unit_number');
      await client.query('ALTER TABLE admin_notifications RENAME COLUMN capsule_number TO unit_number');
    } else if (anHasUnit) {
      console.log('✓ admin_notifications.unit_number already exists');
    } else {
      console.log('ℹ admin_notifications.unit_number — no capsule_number found, drizzle will add it');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
