#!/usr/bin/env node

// Start the Replit application on port 5000 (default)
// This script ensures the app runs on the correct port for Replit

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Replit development server...');

// Build first
console.log('📦 Building application...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed with code', code);
    process.exit(1);
  }
  
  console.log('✅ Build completed, starting server...');
  
  // Start server on port 5000 (default - no PORT override)
  const serverProcess = spawn('npx', ['tsx', 'watch', '--clear-screen=false', 'server/index.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development'
      // No PORT override - will use default 5000
    }
  });

  serverProcess.on('close', (code) => {
    console.log('🛑 Server stopped with code', code);
    process.exit(code);
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down...');
    serverProcess.kill('SIGINT');
  });
});

buildProcess.on('error', (err) => {
  console.error('❌ Failed to start build process:', err);
  process.exit(1);
});