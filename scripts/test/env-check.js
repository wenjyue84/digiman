#!/usr/bin/env node
/**
 * Environment Check - Validate development environment
 * Usage: node scripts/test/env-check.js
 *
 * Checks:
 * - Node.js version
 * - npm version
 * - Port availability (3000, 5000)
 * - Required dependencies
 * - Database connection (optional)
 * - Environment variables
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);

  const required = 18;
  const passed = majorVersion >= required;

  log(`Node.js: ${version} ${passed ? '✅' : '❌'}`, passed ? 'green' : 'red');

  if (!passed) {
    log(`   Required: >= v${required}`, 'red');
  }

  return passed;
}

function checkNpmVersion() {
  const version = execCommand('npm --version');

  if (version) {
    log(`npm: ${version} ✅`, 'green');
    return true;
  } else {
    log('npm: Not found ❌', 'red');
    return false;
  }
}

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(null);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

async function checkPorts() {
  const ports = [
    { port: 3000, name: 'Frontend (Vite)' },
    { port: 5000, name: 'Backend (Express)' },
  ];

  log('\n🔌 Port Availability:', 'cyan');

  for (const { port, name } of ports) {
    const available = await checkPortAvailable(port);

    if (available === true) {
      log(`   ${port} (${name}): Available ✅`, 'green');
    } else if (available === false) {
      log(`   ${port} (${name}): In use ⚠️`, 'yellow');
      log(`      Run: npx kill-port ${port}`, 'yellow');
    } else {
      log(`   ${port} (${name}): Check failed ❌`, 'red');
    }
  }
}

function checkDependencies() {
  log('\n📦 Dependencies:', 'cyan');

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    log('   package.json not found ❌', 'red');
    return false;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    log('   node_modules not found ❌', 'red');
    log('   Run: npm install', 'yellow');
    return false;
  }

  log('   node_modules installed ✅', 'green');

  // Check critical dependencies
  const critical = ['react', 'express', 'vite', 'typescript'];
  let allPresent = true;

  for (const dep of critical) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!existsSync(depPath)) {
      log(`   ${dep}: Missing ❌`, 'red');
      allPresent = false;
    }
  }

  if (allPresent) {
    log('   Critical dependencies present ✅', 'green');
  }

  return allPresent;
}

function checkEnvFiles() {
  log('\n🔐 Environment Files:', 'cyan');

  const envFile = path.join(projectRoot, '.env');
  const envExampleFile = path.join(projectRoot, '.env.example');

  if (existsSync(envFile)) {
    log('   .env file found ✅', 'green');
    return true;
  } else if (existsSync(envExampleFile)) {
    log('   .env not found ⚠️', 'yellow');
    log('   .env.example exists - copy it to .env', 'yellow');
    return false;
  } else {
    log('   No .env files (optional) ⏭️', 'yellow');
    return true;
  }
}

function checkGitRepo() {
  log('\n📂 Git Repository:', 'cyan');

  const gitDir = path.join(projectRoot, '.git');
  if (existsSync(gitDir)) {
    const branch = execCommand('git branch --show-current');
    if (branch) {
      log(`   Current branch: ${branch} ✅`, 'green');
      return true;
    }
  }

  log('   Not a git repository ⚠️', 'yellow');
  return false;
}

function checkBuildArtifacts() {
  log('\n🏗️  Build Artifacts:', 'cyan');

  const distDir = path.join(projectRoot, 'dist');
  const clientDistDir = path.join(projectRoot, 'client', 'dist');

  if (existsSync(distDir)) {
    log('   dist/ directory exists ✅', 'green');
  } else {
    log('   dist/ not found (run npm run build) ⏭️', 'yellow');
  }

  if (existsSync(clientDistDir)) {
    log('   client/dist/ directory exists ✅', 'green');
  } else {
    log('   client/dist/ not found (run npm run build) ⏭️', 'yellow');
  }
}

function checkDatabase() {
  log('\n🗄️  Database:', 'cyan');

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    log('   DATABASE_URL configured ✅', 'green');
    log('   (Connection not tested)', 'cyan');
  } else {
    log('   DATABASE_URL not set ⏭️', 'yellow');
    log('   Will use in-memory storage', 'yellow');
  }
}

async function main() {
  log('🔍 PelangiManager Environment Check', 'bright');
  log('='.repeat(50) + '\n', 'bright');

  const results = {
    node: checkNodeVersion(),
    npm: checkNpmVersion(),
  };

  await checkPorts();

  results.deps = checkDependencies();
  results.env = checkEnvFiles();
  results.git = checkGitRepo();

  checkBuildArtifacts();
  checkDatabase();

  // Summary
  log('\n' + '='.repeat(50), 'bright');
  log('📊 Environment Summary', 'bright');
  log('='.repeat(50), 'bright');

  const criticalChecks = [
    { name: 'Node.js', passed: results.node },
    { name: 'npm', passed: results.npm },
    { name: 'Dependencies', passed: results.deps },
  ];

  const allPassed = criticalChecks.every(c => c.passed);

  criticalChecks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`${icon} ${check.name}`, color);
  });

  log('\n' + '='.repeat(50), 'bright');

  if (allPassed) {
    log('🎉 Environment is ready for development!', 'green');
    log('\n💡 Quick start: npm run dev', 'cyan');
    return 0;
  } else {
    log('❌ Environment has issues. Fix them before developing.', 'red');
    return 1;
  }
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log(`\n❌ Environment check failed: ${error.message}`, 'red');
    process.exit(1);
  });
