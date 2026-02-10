-- Add alert_settings column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS alert_settings TEXT;

-- Add index on expected_checkout_date for better query performance
CREATE INDEX IF NOT EXISTS idx_guests_expected_checkout_date ON guests(expected_checkout_date);
