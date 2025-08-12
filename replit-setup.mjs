#!/usr/bin/env node

/**
 * Replit Setup Script
 * This script helps set up the application for Replit deployment
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('🚀 Setting up Replit deployment...');

// Create necessary directories
const tmpDir = '/tmp';
if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir, { recursive: true });
  console.log('✅ Created /tmp directory');
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the application
console.log('🔨 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Application built successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Replit setup complete!');
console.log('📝 Next steps:');
console.log('1. Set REPLIT_DB_PATH="/tmp/replit.db" in your environment variables');
console.log('2. Set NODE_ENV="production" in your environment variables');
console.log('3. Run "npm start" to start the application');
console.log('\n💡 Your data will now be persistent in the /tmp directory on Replit!');