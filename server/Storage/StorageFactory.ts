import { MemStorage } from "./MemStorage";
import { DatabaseStorage } from "./DatabaseStorage";
import { IStorage } from "./IStorage";

/**
 * Storage Factory - Automatically chooses storage implementation based on environment
 * Uses DatabaseStorage if DATABASE_URL is set, falls back to MemStorage otherwise
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

// Create the storage instance
export const storage = createStorage();
