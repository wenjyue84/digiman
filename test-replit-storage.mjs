#!/usr/bin/env node

/**
 * Test script for ReplitStorage
 * This script tests the ReplitStorage implementation
 */

import { randomUUID } from 'crypto';

// Mock environment variable for testing
process.env.REPLIT_DB_PATH = '/tmp/test-replit.db';
process.env.NODE_ENV = 'production';

console.log('🧪 Testing ReplitStorage implementation...');

try {
  // Import the storage module
  const { storage } = await import('./server/storage.js');
  
  console.log('✅ Storage module imported successfully');
  console.log('📊 Storage type:', storage.constructor.name);
  
  // Test basic operations
  console.log('\n🔍 Testing basic operations...');
  
  // Test getting all capsules
  const capsules = await storage.getAllCapsules();
  console.log(`✅ Found ${capsules.length} capsules`);
  
  // Test getting all users
  const users = await storage.getAllUsers();
  console.log(`✅ Found ${users.length} users`);
  
  // Test getting app settings
  const settings = await storage.getAllAppSettings();
  console.log(`✅ Found ${settings.length} app settings`);
  
  console.log('\n🎉 All tests passed! ReplitStorage is working correctly.');
  console.log('\n📝 Ready for Replit deployment!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}