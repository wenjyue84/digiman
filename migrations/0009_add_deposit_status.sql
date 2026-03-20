-- Add deposit_status column to guests table
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "deposit_status" text;
