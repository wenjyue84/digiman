import pg from 'pg';
import { readFileSync } from 'fs';

const url = process.env.DATABASE_URL || readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log('=== Tables ===');
tables.rows.forEach(r => console.log(r.table_name));

const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='units' ORDER BY ordinal_position");
console.log('\n=== units columns ===');
cols.rows.forEach(r => console.log(r.column_name));

await client.end();
