/**
 * Test Helpers - Common utilities for testing scripts
 * Import these helpers in your test scripts
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Log a colored message to console
 */
export function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Execute a shell command and return result
 */
export function execCommand(command, options = {}) {
  const { silent = false, continueOnError = false, cwd = process.cwd() } = options;

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output, error: null };
  } catch (error) {
    if (continueOnError) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
    throw error;
  }
}

/**
 * Get project root directory
 */
export function getProjectRoot() {
  return path.resolve(__dirname, '../..');
}

/**
 * Read package.json
 */
export function getPackageJson() {
  const packageJsonPath = path.join(getProjectRoot(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }
  return JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
}

/**
 * Check if a script exists in package.json
 */
export function hasScript(scriptName) {
  try {
    const packageJson = getPackageJson();
    return !!packageJson.scripts?.[scriptName];
  } catch {
    return false;
  }
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * Create a test report object
 */
export function createTestReport(results = []) {
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const total = results.length;

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      skipped,
      success: failed === 0,
      passRate: total > 0 ? ((passed / (total - skipped)) * 100).toFixed(1) : 0,
    },
    results,
  };
}

/**
 * Save test report to file
 */
export function saveTestReport(report, filename = 'test-report.json') {
  const reportPath = path.join(getProjectRoot(), filename);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

/**
 * Print test report summary to console
 */
export function printTestSummary(report) {
  const { summary, results } = report;

  log('\n' + '='.repeat(60), 'bright');
  log('📊 TEST REPORT SUMMARY', 'bright');
  log('='.repeat(60), 'bright');

  log(`\nTimestamp: ${new Date(report.timestamp).toLocaleString()}`, 'cyan');

  log('\nSummary:', 'bright');
  log(`  Total:     ${summary.total}`);
  log(`  Passed:    ${summary.passed} ✅`, 'green');
  log(`  Failed:    ${summary.failed} ❌`, summary.failed > 0 ? 'red' : 'reset');
  log(`  Skipped:   ${summary.skipped} ⏭️`, summary.skipped > 0 ? 'yellow' : 'reset');
  log(`  Pass Rate: ${summary.passRate}%`, summary.passRate >= 80 ? 'green' : 'yellow');

  if (results.length > 0) {
    log('\nDetailed Results:', 'bright');
    results.forEach(result => {
      let icon, color;
      if (result.skipped) {
        icon = '⏭️';
        color = 'yellow';
      } else if (result.passed) {
        icon = '✅';
        color = 'green';
      } else {
        icon = '❌';
        color = 'red';
      }

      const duration = result.duration ? ` (${formatDuration(result.duration)})` : '';
      log(`  ${icon} ${result.name}${duration}`, color);

      if (result.error && !result.passed) {
        log(`      Error: ${result.error}`, 'red');
      }
    });
  }

  log('\n' + '='.repeat(60), 'bright');

  if (summary.success) {
    log('🎉 All tests passed!', 'green');
  } else {
    log(`⚠️  ${summary.failed} test(s) failed`, 'red');
  }

  log('');
}

/**
 * Get list of modified files from git
 */
export function getModifiedFiles(staged = false) {
  try {
    const command = staged ? 'git diff --cached --name-only' : 'git diff --name-only';
    const result = execCommand(command, { silent: true });
    return result.output.trim().split('\n').filter(f => f.length > 0);
  } catch {
    return [];
  }
}

/**
 * Count lines in a file
 */
export function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Check if file exceeds line limit
 */
export function checkLineLimit(filePath, limit = 800) {
  const lines = countLines(filePath);
  return {
    filePath,
    lines,
    exceeds: lines > limit,
    limit,
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      log(`   Retry ${attempt}/${maxRetries} after ${delay}ms...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Format test result for display
 */
export function formatTestResult(result) {
  const { name, passed, skipped, duration, error } = result;

  let status = '✅ PASS';
  let color = 'green';

  if (skipped) {
    status = '⏭️  SKIP';
    color = 'yellow';
  } else if (!passed) {
    status = '❌ FAIL';
    color = 'red';
  }

  const durationStr = duration ? ` (${formatDuration(duration)})` : '';
  const errorStr = error && !passed ? `\n      Error: ${error}` : '';

  return {
    text: `${status} ${name}${durationStr}${errorStr}`,
    color,
  };
}

/**
 * Create a progress indicator
 */
export function createProgressBar(total, width = 30) {
  let current = 0;

  return {
    update(value) {
      current = value;
      const percentage = (current / total) * 100;
      const filled = Math.floor((current / total) * width);
      const empty = width - filled;

      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const text = `[${bar}] ${percentage.toFixed(0)}% (${current}/${total})`;

      process.stdout.write(`\r${text}`);

      if (current >= total) {
        process.stdout.write('\n');
      }
    },

    increment() {
      this.update(current + 1);
    },

    complete() {
      this.update(total);
    },
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig() {
  const errors = [];
  const warnings = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is too old. Require >= 18`);
  }

  // Check package.json
  try {
    getPackageJson();
  } catch {
    errors.push('package.json not found or invalid');
  }

  // Check test script
  if (!hasScript('test')) {
    warnings.push('No "test" script found in package.json');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  colors,
  log,
  execCommand,
  getProjectRoot,
  getPackageJson,
  hasScript,
  formatDuration,
  createTestReport,
  saveTestReport,
  printTestSummary,
  getModifiedFiles,
  countLines,
  checkLineLimit,
  retryWithBackoff,
  formatTestResult,
  createProgressBar,
  validateTestConfig,
};
