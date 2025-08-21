import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// Configure Neon to use WebSocket constructor for serverless environments
neonConfig.webSocketConstructor = ws;

async function initDatabase() {
  try {
    // Ensure database connection string is configured
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }

    console.log("🔌 Connecting to database...");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    console.log("📋 Running database migrations...");
    
    try {
      // Run all pending migrations
      await migrate(db, { migrationsFolder: './migrations' });
      console.log("✅ Migrations completed successfully!");
    } catch (migrationError) {
      console.log("⚠️  Migration error (this might be normal if tables already exist):", migrationError);
      console.log("📋 Checking if tables exist...");
      
      // Try to query a table to see if it exists
      try {
        await db.select().from(schema.users).limit(1);
        console.log("✅ Tables appear to exist and are accessible");
      } catch (tableError) {
        console.log("❌ Tables are not accessible:", tableError);
        throw new Error("Database tables are not properly set up. Please check your migrations.");
      }
    }

    console.log("✅ Database initialized successfully!");
    console.log("📊 Available tables:");
    console.log("  - users");
    console.log("  - sessions");
    console.log("  - guests");
    console.log("  - capsules");
    console.log("  - capsule_problems");
    console.log("  - expenses");
    console.log("  - app_settings");
    console.log("  - guest_tokens");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run initialization
initDatabase();
