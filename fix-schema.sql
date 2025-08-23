-- Fix missing database schema elements
-- This migration addresses the missing tables and columns causing server errors

-- 1. Add email column to users table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email text NOT NULL DEFAULT 'temp@example.com';
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        RAISE NOTICE 'Added email column to users table';
    ELSE
        RAISE NOTICE 'Email column already exists in users table';
    END IF;
END $$;

-- 1b. Add first_name column to users table if missing (schema expects firstName but DB might have first_name)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name text;
        RAISE NOTICE 'Added first_name column to users table';
    ELSE
        RAISE NOTICE 'first_name column already exists in users table';
    END IF;
END $$;

-- 1c. Add last_name column to users table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name text;
        RAISE NOTICE 'Added last_name column to users table';
    ELSE
        RAISE NOTICE 'last_name column already exists in users table';
    END IF;
END $$;

-- 2. Add cleaning_status column to capsules table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'capsules' AND column_name = 'cleaning_status'
    ) THEN
        ALTER TABLE capsules ADD COLUMN cleaning_status text NOT NULL DEFAULT 'cleaned';
        CREATE INDEX idx_capsules_cleaning_status ON capsules(cleaning_status);
        RAISE NOTICE 'Added cleaning_status column to capsules table';
    ELSE
        RAISE NOTICE 'Cleaning_status column already exists in capsules table';
    END IF;
END $$;

-- 2b. Add last_cleaned_at column to capsules table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'capsules' AND column_name = 'last_cleaned_at'
    ) THEN
        ALTER TABLE capsules ADD COLUMN last_cleaned_at timestamp;
        RAISE NOTICE 'Added last_cleaned_at column to capsules table';
    ELSE
        RAISE NOTICE 'last_cleaned_at column already exists in capsules table';
    END IF;
END $$;

-- 2c. Add last_cleaned_by column to capsules table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'capsules' AND column_name = 'last_cleaned_by'
    ) THEN
        ALTER TABLE capsules ADD COLUMN last_cleaned_by text;
        RAISE NOTICE 'Added last_cleaned_by column to capsules table';
    ELSE
        RAISE NOTICE 'last_cleaned_by column already exists in capsules table';
    END IF;
END $$;

-- 3. Create capsule_problems table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'capsule_problems'
    ) THEN
        CREATE TABLE capsule_problems (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            capsule_number text NOT NULL,
            problem_type text NOT NULL,
            description text,
            is_resolved boolean NOT NULL DEFAULT false,
            resolved_at timestamp,
            resolved_by text,
            reported_at timestamp NOT NULL DEFAULT now(),
            reported_by text,
            priority text DEFAULT 'medium',
            notes text
        );
        
        CREATE INDEX idx_capsule_problems_capsule_number ON capsule_problems(capsule_number);
        CREATE INDEX idx_capsule_problems_is_resolved ON capsule_problems(is_resolved);
        CREATE INDEX idx_capsule_problems_reported_at ON capsule_problems(reported_at);
        
        RAISE NOTICE 'Created capsule_problems table with indexes';
    ELSE
        RAISE NOTICE 'Capsule_problems table already exists';
    END IF;
END $$;

-- 4. Create app_settings table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'app_settings'
    ) THEN
        CREATE TABLE app_settings (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            key text NOT NULL UNIQUE,
            value text,
            description text,
            category text DEFAULT 'general',
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        );
        
        CREATE INDEX idx_app_settings_key ON app_settings(key);
        
        RAISE NOTICE 'Created app_settings table with indexes';
    ELSE
        RAISE NOTICE 'App_settings table already exists';
    END IF;
END $$;

RAISE NOTICE 'Schema fix completed successfully';