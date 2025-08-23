-- Fix missing columns in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Update existing user with timestamps
UPDATE users SET created_at = now(), updated_at = now() WHERE username = 'admin';

-- Verify the fix
SELECT username, email, role, created_at FROM users;

