import { MemStorage } from "./MemStorage";
import { DatabaseStorage } from "./DatabaseStorage";
import { IStorage } from "./IStorage";
import { MigrationHelper } from "./MigrationHelper";

/**
 * Storage Factory - SIMPLIFIED!
 * Uses DatabaseStorage if DATABASE_URL is set, falls back to MemStorage otherwise
 * Includes automatic migration handling for schema changes
 */
export function createStorage(): IStorage {
  try {
    if (process.env.DATABASE_URL) {
      const storage = new DatabaseStorage();
      console.log(`✅ Using database storage`);
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
  let storage = createStorage();
  
  // Run migration checks for database storage
  if (storage instanceof DatabaseStorage) {
    const healthy = await storage.healthCheck();
    if (!healthy) {
      console.warn("⚠️ Database not reachable, switching to in-memory storage");
      storage = new MemStorage();
      return storage;
    }

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
let currentStorageName = process.env.DATABASE_URL ? "DatabaseStorage" : "MemStorage";

export function getStorage(): Promise<IStorage> {
  if (!storagePromise) {
    storagePromise = initializeStorageWithMigration();
    storagePromise
      .then((storage) => {
        currentStorageName = storage.constructor.name;
      })
      .catch(() => {
        currentStorageName = "MemStorage";
      });
  }
  return storagePromise;
}

/**
 * Reset storage instance to force reinitialization
 * Used when switching database configurations at runtime
 */
export function resetStorage(): void {
  console.log("🔄 Resetting storage instance for database switch...");
  storagePromise = null;
}

// For immediate access (backward compatibility)
// Lazily resolve the real storage instance to allow DB health checks and fallback.
export const storage: IStorage = new Proxy({} as IStorage, {
  get(_target, prop) {
    if (prop === "then") return undefined;
    if (prop === "constructor") return { name: currentStorageName } as any;
    return async (...args: any[]) => {
      const realStorage = await getStorage();
      const value = (realStorage as any)[prop];
      if (typeof value === "function") {
        return value.apply(realStorage, args);
      }
      return value;
    };
  }
});
