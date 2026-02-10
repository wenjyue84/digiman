# Database Troubleshooting Skill

## When to Use This Skill
Use when encountering database connection issues, schema mismatches, or Drizzle ORM sync problems with PostgreSQL/Neon databases.

## Triggers
- "database connection failed"
- "cannot connect to database"
- "drizzle push failing"
- "schema mismatch"
- "data loss warning"
- "DATABASE_URL not working"

## Core Principle
⚠️ **"Connection issues" are often schema mismatches, not actual connection failures!**

## Diagnostic Workflow

### 1. Verify Actual Connection (Don't Assume!)

Create a minimal connection test script to verify the database is accessible:

```javascript
// test-db-connection.js
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('🔍 Testing connection to:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

async function testConnection() {
  try {
    const sql = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 1
    });

    console.log('📡 Attempting to connect...');

    const result = await sql\`SELECT NOW() as current_time, version() as pg_version\`;

    console.log('✅ CONNECTION SUCCESSFUL!');
    console.log('⏰ Server time:', result[0].current_time);
    console.log('🗄️  PostgreSQL version:', result[0].pg_version.split(',')[0]);

    // List tables
    const tables = await sql\`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    \`;

    console.log(\`\n📊 Found \${tables.length} tables in database:\`);
    tables.forEach(t => console.log(\`   - \${t.tablename}\`));

    await sql.end();
    console.log('\n✨ Database connection test passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!');
    console.error('Error:', error.message);

    // Provide specific troubleshooting based on error
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS resolution failed - check internet and host');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused - check firewall/database status');
    } else if (error.message.includes('password')) {
      console.error('\n💡 Authentication failed - verify credentials');
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('\n💡 SSL/TLS issue - try removing channel_binding parameter');
    }

    process.exit(1);
  }
}

testConnection();
```

**Run:** `node test-db-connection.js`

### 2. Check Schema Mismatch (Common Culprit!)

If connection works but `drizzle-kit push` shows warnings:

```javascript
// check-schema.js
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

console.log('📋 Checking [TABLE_NAME] schema...\n');

try {
  const cols = await sql\`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = '[TABLE_NAME]'
    ORDER BY ordinal_position
  \`;

  console.log('Current columns in DATABASE:');
  cols.forEach(c => {
    const nullable = c.is_nullable === 'YES' ? '(nullable)' : '(required)';
    console.log(\`  ✓ \${c.column_name.padEnd(20)} \${c.data_type.padEnd(20)} \${nullable}\`);
  });

  await sql.end();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

Replace `[TABLE_NAME]` with the problematic table name.

### 3. Interpret Drizzle Kit Warnings

**Warning Pattern:**
```
⚠️ Warning Found data-loss statements:
· You're about to delete [column_name] column in [table] with [N] items

THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED
```

**What this means:**
- ✅ Database connection is WORKING
- ❌ Local schema doesn't match database schema
- 🔍 Database has columns not in your local `schema.ts`

**Solution:** Choose one:

**Option A: Keep the column** (if you need it)
```typescript
// Add missing column to your schema
export const yourTable = pgTable("your_table", {
  // ... existing columns
  missingColumn: text("missing_column"), // Add this
});
```

**Option B: Delete the column** (if it's unused)
- Run `npm run db:push`
- Select "Yes, I want to remove [N] column(s)"
- ⚠️ This is PERMANENT and cannot be undone

## Common Scenarios

### Scenario 1: "Cannot connect" but connection test passes
**Diagnosis:** Schema mismatch, not connection issue
**Fix:** Compare local schema with database schema, add missing columns

### Scenario 2: Neon database "connection refused"
**Diagnosis:** Check if database is paused (Neon auto-pauses)
**Fix:** Any query will auto-resume it; retry connection

### Scenario 3: SSL/TLS errors
**Diagnosis:** Channel binding or SSL configuration
**Fix:** Try removing `&channel_binding=require` from DATABASE_URL

### Scenario 4: Port conflicts (dev server)
**Diagnosis:** Old processes holding ports
**Fix:** `npm run dev:clean` or `npx kill-port 5000 && npx kill-port 3000`

## Drizzle ORM Workflow

### Safe Schema Sync Process
1. **Always backup first:** Export data if critical
2. **Check what will change:** Run `npm run db:push` and review warnings
3. **Test in development first:** Never push directly to production
4. **Update schema progressively:** One table at a time for complex changes
5. **Verify after sync:** Run connection test to ensure tables exist

### Schema File Best Practices
```typescript
// shared/schema.ts
import { pgTable, text, varchar, timestamp, boolean, date } from "drizzle-orm/pg-core";

// ✅ Good: Matches database exactly
export const capsules = pgTable("capsules", {
  id: varchar("id").primaryKey(),
  number: text("number").notNull().unique(),
  branch: text("branch"), // Include ALL database columns
  // ... other columns
});

// ❌ Bad: Missing columns that exist in database
// This will trigger data-loss warnings
```

## Environment Configuration

### .env File Structure
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# For Neon (with pooler)
DATABASE_URL=postgresql://user:password@host-pooler.region.neon.tech/dbname?sslmode=require&channel_binding=require

# Development
NODE_ENV=development
PORT=5000
```

### Connection String Anatomy
```
postgresql://[user]:[password]@[host]:[port]/[database]?[params]
            └─────┘ └────────┘  └──────────┘ └──┘  └────────┘ └────────┘
            username password    hostname    port   db name   SSL options
```

**Neon-specific:**
- Use `-pooler` suffix for connection pooling
- `sslmode=require` is mandatory
- `channel_binding=require` is optional (may cause issues on some systems)

## Troubleshooting Checklist

When user reports "cannot connect to database":

- [ ] Verify DATABASE_URL is in .env file
- [ ] Run connection test script (test-db-connection.js)
- [ ] Check if connection succeeds (often it does!)
- [ ] If connection works, check for schema mismatch
- [ ] Run `npm run db:push` to see Drizzle warnings
- [ ] Compare local schema with database schema
- [ ] Add missing columns to local schema OR remove from database
- [ ] Re-run `npm run db:push` to verify sync

## Key Learnings (2026-02-08 Session)

### Real Case Study: PelangiManager-Zeabur
**Symptom:** User reported "cannot connect to postgresql://..."
**Reality:** Connection was working perfectly!
**Root Cause:** Database had `branch` column; local schema didn't
**Fix:** Added `branch: text("branch")` to `shared/schema.ts`
**Result:** `npm run db:push` succeeded with `[✓] Changes applied`

**Lesson:** Always verify ACTUAL connection status before assuming connection failure. Most "connection issues" are schema mismatches!

## Quick Commands Reference

```bash
# Test connection
node test-db-connection.js

# Check schema differences
npm run db:push        # Review warnings, don't confirm yet

# Force sync (DESTRUCTIVE)
npm run db:push        # Then confirm data-loss warnings

# Start dev server (with port cleanup)
npm run dev:clean

# Kill stuck processes
npx kill-port 5000 && npx kill-port 3000

# Initialize fresh database
npm run db:init
```

## Prevention Tips

1. **Keep schema in sync:** Update `schema.ts` when you add columns via SQL
2. **Use migrations:** For production, prefer Drizzle migrations over push
3. **Version control .env.example:** Document required environment variables
4. **Test locally first:** Always test schema changes in dev before production
5. **Document column purposes:** Add comments explaining what each column is for

## Related Skills
- `neon-database`: Neon-specific database management
- `skill-creator`: Create new troubleshooting skills

---

**Last Updated:** 2026-02-09
**Tested With:** Drizzle ORM 0.39.1, PostgreSQL 16.11, Neon Database, PelangiManager project
