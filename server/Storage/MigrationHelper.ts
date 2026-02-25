/**
 * Migration Helper for Database Schema Changes
 *
 * This utility handles backward compatibility during schema migrations,
 * particularly for the Status -> toRent column migration.
 */

import { IStorage } from "./IStorage";
import { type Unit } from "../../shared/schema";

export class MigrationHelper {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Ensures all units have the toRent field with proper defaults
   * This is called during storage initialization to handle missing fields
   */
  async ensureToRentFieldExists(): Promise<void> {
    try {
      console.log("🔍 Checking unit schema for toRent field...");

      const allUnits = await this.storage.getAllUnits();
      let migratedCount = 0;

      for (const unit of allUnits) {
        // Check if toRent field is missing or undefined
        if (unit.toRent === undefined || unit.toRent === null) {
          console.log(`⚠️  Unit ${unit.number} missing toRent field, setting default to true`);

          // Set default value: toRent = true (suitable for rent)
          await this.storage.updateUnit(unit.number, {
            toRent: true
          });

          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        console.log(`✅ Migrated ${migratedCount} units to include toRent field`);
      } else {
        console.log("✅ All units already have toRent field");
      }
    } catch (error) {
      console.error("❌ Error during toRent field migration:", error);
      // Don't throw - allow system to continue with what we have
    }
  }

  /**
   * Validates that all units have required fields for the new schema
   */
  async validateUnitSchema(): Promise<boolean> {
    try {
      const allUnits = await this.storage.getAllUnits();
      let isValid = true;

      for (const unit of allUnits) {
        // Check required fields
        if (unit.toRent === undefined || unit.toRent === null) {
          console.warn(`⚠️  Unit ${unit.number} missing toRent field`);
          isValid = false;
        }

        // Check that cleaningStatus exists
        if (!unit.cleaningStatus) {
          console.warn(`⚠️  Unit ${unit.number} missing cleaningStatus field`);
          isValid = false;
        }
      }

      return isValid;
    } catch (error) {
      console.error("❌ Error validating unit schema:", error);
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

      const allUnits = await this.storage.getAllUnits();
      let migrationCount = 0;

      for (const unit of allUnits) {
        let needsUpdate = false;
        const updates: Partial<Unit> = {};

        // Ensure toRent field exists with proper default
        if (unit.toRent === undefined || unit.toRent === null) {
          // Default to true (suitable for rent) unless there are maintenance issues
          updates.toRent = true;
          needsUpdate = true;
        }

        // Ensure other required fields have defaults
        if (!unit.cleaningStatus) {
          updates.cleaningStatus = 'cleaned';
          needsUpdate = true;
        }

        if (!unit.isAvailable) {
          updates.isAvailable = true;
          needsUpdate = true;
        }

        // Apply updates if needed
        if (needsUpdate) {
          await this.storage.updateUnit(unit.number, updates);
          migrationCount++;
          console.log(`✅ Migrated unit ${unit.number}`);
        }
      }

      if (migrationCount > 0) {
        console.log(`🎉 Successfully migrated ${migrationCount} units to new schema`);
      } else {
        console.log("✅ All units already using new schema");
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
      const isValid = await this.validateUnitSchema();

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
