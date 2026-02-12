import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import * as schema from '../../../shared/schema.js';

// CRITICAL: Load .env before accessing process.env
// This module is imported early, before index.ts calls dotenv.config()
dotenv.config();

const { Pool } = pg;

// Log database configuration (without credentials)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log('[DB] Connection string loaded:', maskedUrl.substring(0, 60) + '...');
} else {
  console.log('[DB] ⚠️ DATABASE_URL not set in environment!');
}

// Database connection pool with improved configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 15000, // Timeout after 15 seconds (Neon cold start can be slow)
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[DB] ⚠️ Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });

// Test connection on startup with retry
async function testConnection(retries = 3, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      await pool.query('SELECT NOW()');
      const duration = Date.now() - start;
      console.log(`[DB] ✅ Database connection established (${duration}ms)`);
      return true;
    } catch (error: any) {
      console.error(`[DB] ❌ Connection attempt ${i + 1}/${retries} failed:`, error.message);
      console.error('[DB] Error details:', { code: error.code, errno: error.errno, syscall: error.syscall });
      if (i < retries - 1) {
        console.log(`[DB] 🔄 Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('[DB] ❌ All connection attempts failed. Features requiring database will not work.');
  return false;
}

// Export connection test as a promise that can be awaited
export const dbReady = testConnection();
