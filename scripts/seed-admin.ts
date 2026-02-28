/**
 * seed-admin.ts — Dev helper to ensure admin user exists with password "admin"
 * Usage: npm run seed:admin
 *
 * The server also auto-seeds on every startup in non-production mode.
 * This script is useful when the server is not running and you need to
 * reset the admin password manually.
 */
import 'dotenv/config';
import { storage } from '../server/storage';
import { hashPassword } from '../server/lib/password';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ seed:admin cannot run in production mode');
    process.exit(1);
  }

  console.log('🔧 Seeding admin user...');

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  try {
    const existing = await storage.getUserByUsername('admin');

    if (!existing) {
      const hashed = await hashPassword(adminPassword);
      await storage.createUser({
        email: 'admin@pelangi.com',
        username: 'admin',
        password: hashed,
        role: 'admin',
      } as any);
      console.log(`✅ Created admin user (username: admin, password: ${adminPassword})`);
    } else {
      const hashed = await hashPassword(adminPassword);
      await storage.updateUser(existing.id, { password: hashed });
      console.log(`✅ Reset admin password (username: admin, password: ${adminPassword})`);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();
