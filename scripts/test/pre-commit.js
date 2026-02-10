#!/usr/bin/env node
/**
 * Pre-Commit Validation Script
 * Runs comprehensive checks before allowing a commit
 *
 * Usage: node scripts/test/pre-commit.js
 *
 * Checks:
 * - TypeScript type checking
 * - Linting (if available)
 * - Unit tests
 * - Build validation
 * - No console.log in production code (warning only)
 * - File size check (800-line rule)
 */

import { execSync } from 'child_process';
import { readFileSync, statSync, readdirSync } from 'fs';
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

function execCommand(command, options = {}) {
  const { silent = false, continueOnError = false } = options;

  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output };
  } catch (error) {
    if (continueOnError) {
      return { success: false, error: error.message, output: error.stdout };
    }
    throw error;
  }
}

function getStagedFiles() {
  try {
    const output = execCommand('git diff --cached --name-only', { silent: true });
    return output.output.trim().split('\n').filter(f => f.length > 0);
  } catch (error) {
    log('⚠️  Unable to get staged files (not a git repo?)', 'yellow');
    return [];
  }
}

function checkFileSize(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  const MAX_LINES = 800;

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n').length;

    return {
      file: filePath,
      lines,
      exceeds: lines > MAX_LINES,
    };
  } catch (error) {
    return null;
  }
}

function checkConsoleLogs(filePath) {
  const fullPath = path.join(projectRoot, filePath);

  try {
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const consoleLines = [];

    lines.forEach((line, index) => {
      if (line.includes('console.log') || line.includes('console.error')) {
        consoleLines.push(index + 1);
      }
    });

    return {
      file: filePath,
      hasConsole: consoleLines.length > 0,
      lines: consoleLines,
    };
  } catch (error) {
    return null;
  }
}

async function runChecks() {
  log('🚦 Pre-Commit Validation', 'bright');
  log('='.repeat(50) + '\n', 'bright');

  const results = {
    typeCheck: null,
    lint: null,
    tests: null,
    build: null,
    fileSize: [],
    consoleLogs: [],
  };

  const stagedFiles = getStagedFiles();
  const hasChanges = stagedFiles.length > 0;

  if (hasChanges) {
    log(`📝 Staged files: ${stagedFiles.length}`, 'cyan');
    log(stagedFiles.slice(0, 5).join(', ') + (stagedFiles.length > 5 ? '...' : ''), 'cyan');
    log('');
  } else {
    log('⚠️  No staged files found', 'yellow');
    log('');
  }

  // 1. TypeScript Check
  log('1️⃣  TypeScript Check...', 'cyan');
  try {
    const result = execCommand('npm run check', { continueOnError: true });
    results.typeCheck = result.success;
    log(result.success ? '   ✅ TypeScript: Pass' : '   ❌ TypeScript: Failed', result.success ? 'green' : 'red');
  } catch (error) {
    results.typeCheck = false;
    log('   ❌ TypeScript: Failed', 'red');
  }

  // 2. Linting
  log('\n2️⃣  Linting...', 'cyan');
  try {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    if (packageJson.scripts?.lint) {
      const result = execCommand('npm run lint', { continueOnError: true });
      results.lint = result.success;
      log(result.success ? '   ✅ Lint: Pass' : '   ⚠️  Lint: Warnings', result.success ? 'green' : 'yellow');
    } else {
      results.lint = true;
      log('   ⏭️  Lint: Not configured (skipped)', 'yellow');
    }
  } catch (error) {
    results.lint = false;
    log('   ⚠️  Lint: Warnings', 'yellow');
  }

  // 3. Unit Tests
  log('\n3️⃣  Unit Tests...', 'cyan');
  try {
    const result = execCommand('npm test', { continueOnError: true });
    results.tests = result.success;
    log(result.success ? '   ✅ Tests: Pass' : '   ❌ Tests: Failed', result.success ? 'green' : 'red');
  } catch (error) {
    results.tests = false;
    log('   ❌ Tests: Failed', 'red');
  }

  // 4. Build Validation
  log('\n4️⃣  Build Validation...', 'cyan');
  try {
    const result = execCommand('npm run build', { silent: true, continueOnError: true });
    results.build = result.success;
    log(result.success ? '   ✅ Build: Success' : '   ❌ Build: Failed', result.success ? 'green' : 'red');
  } catch (error) {
    results.build = false;
    log('   ❌ Build: Failed', 'red');
  }

  // 5. File Size Check (800-line rule)
  if (hasChanges) {
    log('\n5️⃣  File Size Check (800-line rule)...', 'cyan');
    const codeFiles = stagedFiles.filter(f =>
      f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
    );

    for (const file of codeFiles) {
      const sizeCheck = checkFileSize(file);
      if (sizeCheck && sizeCheck.exceeds) {
        results.fileSize.push(sizeCheck);
        log(`   ⚠️  ${file}: ${sizeCheck.lines} lines (exceeds 800)`, 'yellow');
      }
    }

    if (results.fileSize.length === 0) {
      log('   ✅ All files under 800 lines', 'green');
    }
  }

  // 6. Console.log Check (warning only)
  if (hasChanges) {
    log('\n6️⃣  Console.log Check...', 'cyan');
    const codeFiles = stagedFiles.filter(f =>
      f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
    );

    for (const file of codeFiles) {
      const consoleCheck = checkConsoleLogs(file);
      if (consoleCheck && consoleCheck.hasConsole) {
        results.consoleLogs.push(consoleCheck);
        log(`   ⚠️  ${file}: console.log found (lines: ${consoleCheck.lines.join(', ')})`, 'yellow');
      }
    }

    if (results.consoleLogs.length === 0) {
      log('   ✅ No console.log found', 'green');
    }
  }

  // Summary
  log('\n' + '='.repeat(50), 'bright');
  log('📊 Pre-Commit Summary', 'bright');
  log('='.repeat(50), 'bright');

  const criticalChecks = [
    { name: 'TypeScript', passed: results.typeCheck },
    { name: 'Tests', passed: results.tests },
    { name: 'Build', passed: results.build },
  ];

  const warningChecks = [
    { name: 'Lint', passed: results.lint },
    { name: 'File Size', passed: results.fileSize.length === 0 },
    { name: 'Console Logs', passed: results.consoleLogs.length === 0 },
  ];

  log('\nCritical Checks:', 'bright');
  criticalChecks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`  ${icon} ${check.name}`, color);
  });

  log('\nWarnings (non-blocking):', 'bright');
  warningChecks.forEach(check => {
    const icon = check.passed ? '✅' : '⚠️ ';
    const color = check.passed ? 'green' : 'yellow';
    log(`  ${icon} ${check.name}`, color);
  });

  const allCriticalPassed = criticalChecks.every(c => c.passed);

  log('\n' + '='.repeat(50), 'bright');

  if (allCriticalPassed) {
    log('🎉 All critical checks passed! Safe to commit.', 'green');
    log('\n💡 Tip: Review warnings above before committing', 'cyan');
    return 0;
  } else {
    log('❌ Critical checks failed. Fix issues before committing.', 'red');
    return 1;
  }
}

runChecks()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log(`\n❌ Pre-commit validation crashed: ${error.message}`, 'red');
    process.exit(1);
  });
