-- Backfill deposit_status for existing guests who have depositPaid=true but no depositStatus
-- These are legacy records created before the deposit status state machine was introduced

-- Guests with depositPaid=true and no status → mark as 'paid'
UPDATE "guests"
SET "deposit_status" = 'paid'
WHERE "deposit_paid" = true
  AND ("deposit_status" IS NULL OR "deposit_status" = '');

-- Guests with depositRequired=true and depositPaid=false and no status → mark as 'requested'
UPDATE "guests"
SET "deposit_status" = 'requested'
WHERE "deposit_required" = true
  AND ("deposit_paid" = false OR "deposit_paid" IS NULL)
  AND ("deposit_status" IS NULL OR "deposit_status" = '');
