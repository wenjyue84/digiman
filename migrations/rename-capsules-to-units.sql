-- Migration 0007: Rename capsules → units
-- Run this on existing Pelangi production DB BEFORE deploying new code.
-- For new deployments (e.g., Southern Homestay), skip this — drizzle-kit push creates fresh schema.
--
-- This migration is REVERSIBLE. See rollback section at bottom.

BEGIN;

-- ─── 1. Rename tables ────────────────────────────────────────────────

ALTER TABLE capsules RENAME TO units;
ALTER TABLE capsule_problems RENAME TO unit_problems;

-- ─── 2. Rename columns ──────────────────────────────────────────────

-- guests table
ALTER TABLE guests RENAME COLUMN capsule_number TO unit_number;

-- guest_tokens table
ALTER TABLE guest_tokens RENAME COLUMN capsule_number TO unit_number;

-- admin_notifications table
ALTER TABLE admin_notifications RENAME COLUMN capsule_number TO unit_number;

-- unit_problems table (was capsule_problems)
ALTER TABLE unit_problems RENAME COLUMN capsule_number TO unit_number;

-- ─── 3. Add new columns for multi-business support ──────────────────

ALTER TABLE units ADD COLUMN IF NOT EXISTS unit_type text;           -- 'studio', '1bedroom', '2bedroom', etc. NULL for capsules
ALTER TABLE units ADD COLUMN IF NOT EXISTS max_occupancy integer;    -- Max guests per unit. NULL defaults to 1
ALTER TABLE units ADD COLUMN IF NOT EXISTS price_per_night text;     -- Base price as text for precision. NULL if flat-rate

-- ─── 4. Rename indexes ──────────────────────────────────────────────
-- Postgres ALTER INDEX ... RENAME TO is safe and instant (metadata-only).

-- Units table indexes
ALTER INDEX IF EXISTS idx_capsules_is_available RENAME TO idx_units_is_available;
ALTER INDEX IF EXISTS idx_capsules_section RENAME TO idx_units_section;
ALTER INDEX IF EXISTS idx_capsules_cleaning_status RENAME TO idx_units_cleaning_status;
ALTER INDEX IF EXISTS idx_capsules_position RENAME TO idx_units_position;
ALTER INDEX IF EXISTS idx_capsules_to_rent RENAME TO idx_units_to_rent;

-- Unit problems indexes
ALTER INDEX IF EXISTS idx_capsule_problems_capsule_number RENAME TO idx_unit_problems_unit_number;
ALTER INDEX IF EXISTS idx_capsule_problems_is_resolved RENAME TO idx_unit_problems_is_resolved;
ALTER INDEX IF EXISTS idx_capsule_problems_reported_at RENAME TO idx_unit_problems_reported_at;

-- Guest table index
ALTER INDEX IF EXISTS idx_guests_capsule_number RENAME TO idx_guests_unit_number;

-- Guest tokens index
ALTER INDEX IF EXISTS idx_guest_tokens_capsule_number RENAME TO idx_guest_tokens_unit_number;

-- ─── 5. Update settings key ─────────────────────────────────────────
-- The app code reads both old and new keys, but update the DB for consistency.

UPDATE app_settings
SET key = 'unitAssignmentRules'
WHERE key = 'capsuleAssignmentRules';

COMMIT;

-- ─── ROLLBACK (if needed) ───────────────────────────────────────────
-- Run this block manually if you need to revert:
--
-- BEGIN;
-- ALTER TABLE units RENAME TO capsules;
-- ALTER TABLE unit_problems RENAME TO capsule_problems;
-- ALTER TABLE guests RENAME COLUMN unit_number TO capsule_number;
-- ALTER TABLE guest_tokens RENAME COLUMN unit_number TO capsule_number;
-- ALTER TABLE admin_notifications RENAME COLUMN unit_number TO capsule_number;
-- ALTER TABLE capsule_problems RENAME COLUMN unit_number TO capsule_number;
-- ALTER TABLE capsules DROP COLUMN IF EXISTS unit_type;
-- ALTER TABLE capsules DROP COLUMN IF EXISTS max_occupancy;
-- ALTER TABLE capsules DROP COLUMN IF EXISTS price_per_night;
-- ALTER INDEX IF EXISTS idx_units_is_available RENAME TO idx_capsules_is_available;
-- ALTER INDEX IF EXISTS idx_units_section RENAME TO idx_capsules_section;
-- ALTER INDEX IF EXISTS idx_units_cleaning_status RENAME TO idx_capsules_cleaning_status;
-- ALTER INDEX IF EXISTS idx_units_position RENAME TO idx_capsules_position;
-- ALTER INDEX IF EXISTS idx_units_to_rent RENAME TO idx_capsules_to_rent;
-- ALTER INDEX IF EXISTS idx_unit_problems_unit_number RENAME TO idx_capsule_problems_capsule_number;
-- ALTER INDEX IF EXISTS idx_unit_problems_is_resolved RENAME TO idx_capsule_problems_is_resolved;
-- ALTER INDEX IF EXISTS idx_unit_problems_reported_at RENAME TO idx_capsule_problems_reported_at;
-- ALTER INDEX IF EXISTS idx_guests_unit_number RENAME TO idx_guests_capsule_number;
-- ALTER INDEX IF EXISTS idx_guest_tokens_unit_number RENAME TO idx_guest_tokens_capsule_number;
-- UPDATE app_settings SET key = 'capsuleAssignmentRules' WHERE key = 'unitAssignmentRules';
-- COMMIT;
