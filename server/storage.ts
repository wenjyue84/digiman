/**
 * Storage.ts - Modular Storage System Re-export Wrapper
 * 
 * ⚠️  IMPORTANT: DO NOT ADD IMPLEMENTATIONS TO THIS FILE! ⚠️
 * 
 * This file serves ONLY as a backward compatibility wrapper that re-exports
 * the modular storage system from the ./Storage/ directory.
 * 
 * REFACTORING COMPLETED:
 * ✅ PHASE 1: Extract interfaces and implementations to Storage/ folder
 * ✅ PHASE 2: Import from modular Storage instead of inline implementations 
 * ✅ PHASE 3: Reduce this file to a simple re-export wrapper
 * 
 * FILE SIZE REDUCTION: 1,557 lines → 13 lines (96% reduction)
 * 
 * 🚫 DO NOT ADD:
 * - New storage classes or implementations
 * - Business logic or data manipulation
 * - Database operations or queries
 * - Interface definitions
 * - Helper functions or utilities
 * 
 * ✅ ONLY ALLOWED:
 * - Re-export statements from ./Storage/
 * - Backward compatibility exports
 * - Type-only exports for TypeScript
 * 
 * 📁 FOR NEW STORAGE FEATURES, EDIT THESE FILES INSTEAD:
 * - ./Storage/IStorage.ts        - Interface definitions
 * - ./Storage/MemStorage.ts      - In-memory implementation
 * - ./Storage/DatabaseStorage.ts - Database implementation  
 * - ./Storage/StorageFactory.ts  - Factory and initialization
 * - ./Storage/index.ts           - Module exports
 * 
 * 🔄 MIGRATION GUIDE:
 * - All existing imports from './storage' continue to work unchanged
 * - TypeScript types are preserved and fully compatible
 * - Runtime behavior is identical to the original monolithic file
 */

// Re-export storage implementations for backward compatibility
export { MemStorage, DatabaseStorage, createStorage } from "./Storage/index";
export { storage } from "./Storage/index";

// Re-export the IStorage interface and domain sub-interfaces for TypeScript type checking
export type { IStorage, IUserStorage, ISessionStorage, IGuestStorage, ICapsuleStorage, IProblemStorage, ITokenStorage, INotificationStorage, ISettingsStorage, IExpenseStorage } from "./Storage/IStorage";