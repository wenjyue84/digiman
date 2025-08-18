/**
 * Migration Helper for Database Schema Changes
 * 
 * This utility handles backward compatibility during schema migrations,
 * particularly for the Status -> toRent column migration.
 */

import { IStorage } from "./IStorage";
import { type Capsule } from "../../shared/schema";

export class MigrationHelper {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Ensures all capsules have the toRent field with proper defaults
   * This is called during storage initialization to handle missing fields
   */
  async ensureToRentFieldExists(): Promise<void> {
    try {
      console.log("🔍 Checking capsule schema for toRent field...");
      
      const capsules = await this.storage.getAllCapsules();
      let migratedCount = 0;

      for (const capsule of capsules) {
        // Check if toRent field is missing or undefined
        if (capsule.toRent === undefined || capsule.toRent === null) {
          console.log(`⚠️  Capsule ${capsule.number} missing toRent field, setting default to true`);
          
          // Set default value: toRent = true (suitable for rent)
          await this.storage.updateCapsule(capsule.number, {
            toRent: true
          });
          
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        console.log(`✅ Migrated ${migratedCount} capsules to include toRent field`);
      } else {
        console.log("✅ All capsules already have toRent field");
      }
    } catch (error) {
      console.error("❌ Error during toRent field migration:", error);
      // Don't throw - allow system to continue with what we have
    }
  }

  /**
   * Validates that all capsules have required fields for the new schema
   */
  async validateCapsuleSchema(): Promise<boolean> {
    try {
      const capsules = await this.storage.getAllCapsules();
      let isValid = true;

      for (const capsule of capsules) {
        // Check required fields
        if (capsule.toRent === undefined || capsule.toRent === null) {
          console.warn(`⚠️  Capsule ${capsule.number} missing toRent field`);
          isValid = false;
        }

        // Check that cleaningStatus exists
        if (!capsule.cleaningStatus) {
          console.warn(`⚠️  Capsule ${capsule.number} missing cleaningStatus field`);
          isValid = false;
        }
      }

      return isValid;
    } catch (error) {
      console.error("❌ Error validating capsule schema:", error);
      return false;
    }
  }

  /**
   * Handles the transition from any legacy status system to toRent boolean
   * This method is safe to call multiple times
   */
  async migrateLegacyStatusToToRent(): Promise<void> {
    try {
      console.log("🔄 Starting legacy status -> toRent migration...");
      
      const capsules = await this.storage.getAllCapsules();
      let migrationCount = 0;

      for (const capsule of capsules) {
        let needsUpdate = false;
        const updates: Partial<Capsule> = {};

        // Ensure toRent field exists with proper default
        if (capsule.toRent === undefined || capsule.toRent === null) {
          // Default to true (suitable for rent) unless there are maintenance issues
          // In the future, we could check for active problems to determine this
          updates.toRent = true;
          needsUpdate = true;
        }

        // Ensure other required fields have defaults
        if (!capsule.cleaningStatus) {
          updates.cleaningStatus = 'cleaned';
          needsUpdate = true;
        }

        if (!capsule.isAvailable) {
          updates.isAvailable = true;
          needsUpdate = true;
        }

        // Apply updates if needed
        if (needsUpdate) {
          await this.storage.updateCapsule(capsule.number, updates);
          migrationCount++;
          console.log(`✅ Migrated capsule ${capsule.number}`);
        }
      }

      if (migrationCount > 0) {
        console.log(`🎉 Successfully migrated ${migrationCount} capsules to new schema`);
      } else {
        console.log("✅ All capsules already using new schema");
      }
    } catch (error) {
      console.error("❌ Error during legacy status migration:", error);
      // Don't throw - system should continue running
    }
  }

  /**
   * Runs all migration checks and fixes
   * This is the main entry point for migration handling
   */
  async runMigrationChecks(): Promise<void> {
    console.log("🚀 Starting database migration checks...");
    
    try {
      // Step 1: Ensure toRent field exists
      await this.ensureToRentFieldExists();
      
      // Step 2: Migrate any legacy status data
      await this.migrateLegacyStatusToToRent();
      
      // Step 3: Validate final schema
      const isValid = await this.validateCapsuleSchema();
      
      if (isValid) {
        console.log("✅ All migration checks passed successfully");
      } else {
        console.log("⚠️  Some migration issues detected, but system will continue");
      }
    } catch (error) {
      console.error("❌ Error during migration checks:", error);
      console.log("⚠️  Migration failed, but system will attempt to continue");
    }
  }
}