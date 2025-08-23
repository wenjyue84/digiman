import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

let pool: any = null;
let db: any = null;

// Database connection is optional - fallback to MemStorage if not configured
if (!process.env.DATABASE_URL) {
  console.log("⚠️ No DATABASE_URL found - using in-memory storage fallback");
} else {
  // Check if we're using Neon (cloud) or local PostgreSQL
  const isNeon = process.env.DATABASE_URL.includes('neon.tech') || 
                  process.env.DATABASE_URL.includes('neon.tech') ||
                  process.env.DATABASE_URL.includes('neon');

  if (isNeon) {
    // Configure Neon to use WebSocket constructor for serverless environments
    neonConfig.webSocketConstructor = ws;
    
    // Initialize Neon database connection pool and Drizzle ORM instance
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  } else {
    // Local PostgreSQL connection
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    db = drizzlePostgres(sql, { schema });
  }
}

export { pool, db };
