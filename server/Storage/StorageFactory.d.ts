import { IStorage } from "./IStorage";
/**
 * Storage Factory - SIMPLIFIED!
 * Uses DatabaseStorage if DATABASE_URL is set, falls back to MemStorage otherwise
 * Includes automatic migration handling for schema changes
 */
export declare function createStorage(): IStorage;
export declare function getStorage(): Promise<IStorage>;
/**
 * Reset storage instance to force reinitialization
 * Used when switching database configurations at runtime
 */
export declare function resetStorage(): void;
export declare const storage: IStorage;
