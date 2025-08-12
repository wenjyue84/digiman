-- Add new fields to capsules table for enhanced management
ALTER TABLE "capsules" ADD COLUMN "color" text;
ALTER TABLE "capsules" ADD COLUMN "purchase_date" date;
ALTER TABLE "capsules" ADD COLUMN "position" text;
ALTER TABLE "capsules" ADD COLUMN "remark" text;

-- Create index on position field for better query performance
CREATE INDEX "idx_capsules_position" ON "capsules" ("position");