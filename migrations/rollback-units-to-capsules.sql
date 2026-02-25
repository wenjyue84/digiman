-- Rollback 0007: Revert units → capsules
-- Run this ONLY if you need to undo migrations/rename-capsules-to-units.sql.
-- Requires deploying old code (pre-multi-business) after running this.

BEGIN;

-- ─── 1. Restore table names ──────────────────────────────────────────

ALTER TABLE units RENAME TO capsules;
ALTER TABLE unit_problems RENAME TO capsule_problems;

-- ─── 2. Restore column names ─────────────────────────────────────────

ALTER TABLE guests RENAME COLUMN unit_number TO capsule_number;
ALTER TABLE guest_tokens RENAME COLUMN unit_number TO capsule_number;
ALTER TABLE admin_notifications RENAME COLUMN unit_number TO capsule_number;
ALTER TABLE capsule_problems RENAME COLUMN unit_number TO capsule_number;

-- ─── 3. Remove new columns added in migration ─────────────────────────

ALTER TABLE capsules DROP COLUMN IF EXISTS unit_type;
ALTER TABLE capsules DROP COLUMN IF EXISTS max_occupancy;
ALTER TABLE capsules DROP COLUMN IF EXISTS price_per_night;

-- ─── 4. Restore index names ──────────────────────────────────────────

ALTER INDEX IF EXISTS idx_units_is_available RENAME TO idx_capsules_is_available;
ALTER INDEX IF EXISTS idx_units_section RENAME TO idx_capsules_section;
ALTER INDEX IF EXISTS idx_units_cleaning_status RENAME TO idx_capsules_cleaning_status;
ALTER INDEX IF EXISTS idx_units_position RENAME TO idx_capsules_position;
ALTER INDEX IF EXISTS idx_units_to_rent RENAME TO idx_capsules_to_rent;

ALTER INDEX IF EXISTS idx_unit_problems_unit_number RENAME TO idx_capsule_problems_capsule_number;
ALTER INDEX IF EXISTS idx_unit_problems_is_resolved RENAME TO idx_capsule_problems_is_resolved;
ALTER INDEX IF EXISTS idx_unit_problems_reported_at RENAME TO idx_capsule_problems_reported_at;

ALTER INDEX IF EXISTS idx_guests_unit_number RENAME TO idx_guests_capsule_number;
ALTER INDEX IF EXISTS idx_guest_tokens_unit_number RENAME TO idx_guest_tokens_capsule_number;

-- ─── 5. Restore settings key ─────────────────────────────────────────

UPDATE app_settings
SET key = 'capsuleAssignmentRules'
WHERE key = 'unitAssignmentRules';

COMMIT;
