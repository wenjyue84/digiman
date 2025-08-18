import { MemStorage } from "./MemStorage";
import { DatabaseStorage } from "./DatabaseStorage";
import { IStorage } from "./IStorage";
import { MigrationHelper } from "./MigrationHelper";

/**
 * Storage Factory - Automatically chooses storage implementation based on environment
 * Uses DatabaseStorage if DATABASE_URL is set, falls back to MemStorage otherwise
 * Includes automatic migration handling for schema changes
 */
export function createStorage(): IStorage {
  try {
    if (process.env.DATABASE_URL) {
      const storage = new DatabaseStorage();
      console.log("✅ Using database storage");
      return storage;
    } else {
      const storage = new MemStorage();
      console.log("✅ Using in-memory storage (no DATABASE_URL set)");
      return storage;
    }
  } catch (error) {
    console.warn("⚠️ Database connection failed, falling back to in-memory storage:", error);
    const storage = new MemStorage();
    console.log("✅ Using in-memory storage as fallback");
    return storage;
  }
}

/**
 * Initialize storage with migration checks
 * This ensures backward compatibility when deploying to new environments
 */
async function initializeStorageWithMigration(): Promise<IStorage> {
  const storage = createStorage();
  
  // Run migration checks for database storage
  if (process.env.DATABASE_URL) {
    try {
      console.log("🔧 Running database migration checks...");
      const migrationHelper = new MigrationHelper(storage);
      await migrationHelper.runMigrationChecks();
    } catch (error) {
      console.warn("⚠️ Migration checks failed, but continuing with storage:", error);
    }
  }
  
  return storage;
}

// Create the storage instance with migration support
let storagePromise: Promise<IStorage> | null = null;

export function getStorage(): Promise<IStorage> {
  if (!storagePromise) {
    storagePromise = initializeStorageWithMigration();
  }
  return storagePromise;
}

// For immediate access (backward compatibility)
export const storage = createStorage();
