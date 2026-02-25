import pg from 'pg';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL || readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

// Safety check
const count = await client.query('SELECT COUNT(*) FROM capsules');
if (parseInt(count.rows[0].count) > 0) {
  console.error(`❌ capsules has ${count.rows[0].count} rows — not dropping`);
  process.exit(1);
}

await client.query('DROP TABLE IF EXISTS capsules');
await client.query('DROP TABLE IF EXISTS capsule_problems');
console.log('✅ Dropped empty capsules and capsule_problems tables');
await client.end();
