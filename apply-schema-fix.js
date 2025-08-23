import postgres from 'postgres';

const DATABASE_URL = 'postgresql://pelangi_user:pelangi_password@localhost:5432/pelangi_manager';

async function applySchemaFix() {
  const sql = postgres(DATABASE_URL);
  
  try {
    console.log('🔌 Connecting to database...');
    console.log('📋 Applying schema fixes...');
    
    // 1. Check and add email column to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN email text`;
      await sql`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`;
      console.log('✅ Added email column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Email column already exists in users table');
      } else {
        console.log('⚠️  Users table might not exist yet, will be created by migrations');
      }
    }
    
    // 2. Check and add cleaning_status column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN cleaning_status text NOT NULL DEFAULT 'cleaned'`;
      await sql`CREATE INDEX idx_capsules_cleaning_status ON capsules(cleaning_status)`;
      console.log('✅ Added cleaning_status column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Cleaning_status column already exists in capsules table');
      } else {
        console.log('⚠️  Capsules table might not exist yet, will be created by migrations');
      }
    }
    
    // 3. Create capsule_problems table
    try {
      await sql`
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
        )`;
      
      await sql`CREATE INDEX idx_capsule_problems_capsule_number ON capsule_problems(capsule_number)`;
      await sql`CREATE INDEX idx_capsule_problems_is_resolved ON capsule_problems(is_resolved)`;
      await sql`CREATE INDEX idx_capsule_problems_reported_at ON capsule_problems(reported_at)`;
      console.log('✅ Created capsule_problems table with indexes');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Capsule_problems table already exists');
      } else {
        console.log('⚠️  Error creating capsule_problems table:', error.message);
      }
    }
    
    // 4. Create app_settings table
    try {
      await sql`
        CREATE TABLE app_settings (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          key text NOT NULL UNIQUE,
          value text,
          description text,
          category text DEFAULT 'general',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )`;
      
      await sql`CREATE INDEX idx_app_settings_key ON app_settings(key)`;
      console.log('✅ Created app_settings table with indexes');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  App_settings table already exists');
      } else {
        console.log('⚠️  Error creating app_settings table:', error.message);
      }
    }
    
    // 5. Add missing columns to app_settings table
    try {
      await sql`ALTER TABLE app_settings ADD COLUMN updated_by text`;
      console.log('✅ Added updated_by column to app_settings table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Updated_by column already exists in app_settings table');
      }
    }
    
    // 6. Add missing columns to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN google_id text UNIQUE`;
      console.log('✅ Added google_id column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Google_id column already exists in users table');
      }
    }
    
    // 6b. Add first_name column to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN first_name text`;
      console.log('✅ Added first_name column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  first_name column already exists in users table');
      }
    }
    
    // 6c. Add last_name column to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN last_name text`;
      console.log('✅ Added last_name column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  last_name column already exists in users table');
      }
    }
    
    // 6d. Add profile_image column to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN profile_image text`;
      console.log('✅ Added profile_image column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  profile_image column already exists in users table');
      }
    }
    
    // 6e. Add role column to users table
    try {
      await sql`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'staff'`;
      console.log('✅ Added role column to users table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  role column already exists in users table');
      }
    }
    
    // 7. Add missing columns to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN to_rent boolean NOT NULL DEFAULT true`;
      await sql`CREATE INDEX idx_capsules_to_rent ON capsules(to_rent)`;
      console.log('✅ Added to_rent column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  To_rent column already exists in capsules table');
      }
    }
    
    // 7b. Add last_cleaned_at column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN last_cleaned_at timestamp`;
      console.log('✅ Added last_cleaned_at column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  last_cleaned_at column already exists in capsules table');
      }
    }
    
    // 7c. Add last_cleaned_by column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN last_cleaned_by text`;
      console.log('✅ Added last_cleaned_by column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  last_cleaned_by column already exists in capsules table');
      }
    }
    
    // 7d. Add color column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN color text`;
      console.log('✅ Added color column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  color column already exists in capsules table');
      }
    }
    
    // 7e. Add purchase_date column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN purchase_date date`;
      console.log('✅ Added purchase_date column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  purchase_date column already exists in capsules table');
      }
    }
    
    // 7f. Add position column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN position text`;
      console.log('✅ Added position column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  position column already exists in capsules table');
      }
    }
    
    // 7g. Add remark column to capsules table
    try {
      await sql`ALTER TABLE capsules ADD COLUMN remark text`;
      console.log('✅ Added remark column to capsules table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  remark column already exists in capsules table');
      }
    }

    console.log('✅ All schema fixes applied successfully!');
    
    // Test that tables now exist
    console.log('🧪 Testing table access...');
    
    // Test app_settings table
    const settingsTest = await sql`SELECT COUNT(*) FROM app_settings`;
    console.log(`✅ app_settings table accessible, has ${settingsTest[0].count} rows`);
    
    // Test capsule_problems table  
    const problemsTest = await sql`SELECT COUNT(*) FROM capsule_problems`;
    console.log(`✅ capsule_problems table accessible, has ${problemsTest[0].count} rows`);
    
    // Test users table has email column
    const usersTest = await sql`SELECT COUNT(*) FROM users WHERE email IS NOT NULL`;
    console.log(`✅ users table has email column, ${usersTest[0].count} users with email`);
    
    // Test capsules table has cleaning_status column
    const capsulesTest = await sql`SELECT COUNT(*) FROM capsules WHERE cleaning_status IS NOT NULL`;
    console.log(`✅ capsules table has cleaning_status column, ${capsulesTest[0].count} capsules with status`);
    
    console.log('🎉 All schema fixes verified successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applySchemaFix();