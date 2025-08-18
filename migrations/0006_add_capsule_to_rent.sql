-- Migration: Add toRent column to replace legacy Status functionality
-- This migration is safe to run multiple times (idempotent)

-- Check if column already exists, add only if missing
DO $$ 
BEGIN
    -- Add toRent column only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'capsules' AND column_name = 'to_rent'
    ) THEN
        ALTER TABLE capsules ADD COLUMN to_rent boolean NOT NULL DEFAULT true;
        
        -- Migrate any existing 'status' data if applicable
        -- If there was a previous status column, we would handle it here
        -- For now, all existing capsules default to toRent=true (suitable for rent)
        
        RAISE NOTICE 'Added to_rent column to capsules table with default value true';
    ELSE
        RAISE NOTICE 'Column to_rent already exists in capsules table, skipping';
    END IF;
    
    -- Create index only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'capsules' AND indexname = 'idx_capsules_to_rent'
    ) THEN
        CREATE INDEX idx_capsules_to_rent ON capsules(to_rent);
        RAISE NOTICE 'Created index idx_capsules_to_rent';
    ELSE
        RAISE NOTICE 'Index idx_capsules_to_rent already exists, skipping';
    END IF;
END $$;