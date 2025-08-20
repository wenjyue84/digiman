#!/usr/bin/env node

/**
 * Smart Development Server Startup Script
 * Proactively prevents port conflicts by cleaning up existing processes
 * Based on successful troubleshooting patterns from MASTER_TROUBLESHOOTING_GUIDE.MD
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 Smart Development Server Startup');
console.log(`📍 Port: ${PORT}`);
console.log(`🌍 Environment: ${NODE_ENV}`);

/**
 * Kill existing processes on the target port
 */
async function killPortProcesses(port) {
  console.log(`🔍 Checking for existing processes on port ${port}...`);
  
  try {
    // Try npx kill-port first (cross-platform)
    try {
      const { stdout, stderr } = await execAsync(`npx kill-port ${port}`);
      if (stdout.includes('killed') || stdout.includes('Process')) {
        console.log(`✅ Killed existing process on port ${port}`);
      } else {
        console.log(`ℹ️  No existing processes found on port ${port}`);
      }
    } catch (killPortError) {
      // Fallback to platform-specific commands
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        try {
          await execAsync(`FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port}') DO taskkill /PID %P /F`);
          console.log(`✅ Windows: Killed processes on port ${port}`);
        } catch (winError) {
          console.log(`ℹ️  Windows: No processes found on port ${port}`);
        }
      } else {
        try {
          await execAsync(`lsof -ti:${port} | xargs kill -9`);
          console.log(`✅ Unix: Killed processes on port ${port}`);
        } catch (unixError) {
          console.log(`ℹ️  Unix: No processes found on port ${port}`);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not check port ${port}: ${error.message}`);
  }
}

/**
 * Kill tsx watch processes specifically
 */
async function killTsxProcesses() {
  console.log('🔍 Checking for tsx watch processes...');
  
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      await execAsync('taskkill /F /IM "tsx.exe" 2>nul || echo "No tsx processes found"');
    } else {
      await execAsync('pkill -f "tsx watch" || echo "No tsx processes found"');
    }
    
    console.log('✅ Cleaned up tsx watch processes');
  } catch (error) {
    console.log('ℹ️  No tsx processes to clean up');
  }
}

/**
 * Start the development server
 */
function startDevServer() {
  console.log('🎬 Starting development server...');
  
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  // Handle graceful shutdown
  const handleShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    devProcess.kill('SIGTERM');
    
    setTimeout(() => {
      console.log('⚡ Force killing process...');
      devProcess.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  devProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Development server stopped cleanly');
    } else {
      console.log(`❌ Development server exited with code ${code}`);
    }
    process.exit(code);
  });

  devProcess.on('error', (error) => {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  });
}

/**
 * Wait for a specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main startup sequence
 */
async function main() {
  try {
    console.log('🧹 Phase 1: Cleanup existing processes');
    
    // Kill tsx processes first
    await killTsxProcesses();
    
    // Wait a moment for processes to fully terminate
    await wait(1000);
    
    // Kill any remaining processes on the port
    await killPortProcesses(PORT);
    
    // Wait a moment before starting
    await wait(1000);
    
    console.log('🚀 Phase 2: Starting clean development server');
    startDevServer();
    
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { killPortProcesses, killTsxProcesses, main };