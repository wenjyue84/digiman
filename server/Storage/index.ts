// Storage module exports
// Note: IStorage interface is not exported here since interfaces don't exist at runtime
// Import IStorage directly from "./IStorage" when needed for type checking
export { MemStorage } from "./MemStorage";
export { DatabaseStorage } from "./DatabaseStorage";
export { createStorage, storage, getStorage } from "./StorageFactory";
export { MigrationHelper } from "./MigrationHelper";

// Re-export the main storage instance for backward compatibility
import { storage as storageInstance } from "./StorageFactory";
export default storageInstance;