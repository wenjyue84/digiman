#!/usr/bin/env node
/**
 * Test Runner - Main testing orchestration script
 * Usage: node scripts/test/test-runner.js [scope] [options]
 *
 * Scopes:
 *   quick    - Run tests for recently changed files
 *   unit     - Run all Jest unit tests
 *   e2e      - Run Playwright E2E tests
 *   api      - Run API endpoint tests
 *   build    - Validate build, typecheck, lint
 *   full     - Run all tests (pre-commit)
 *
 * Options:
 *   --coverage    Include coverage report
 *   --verbose     Detailed output
 *   --json        Output JSON report
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

function runUnitTests(options = {}) {
  log('\n🧪 Running Unit Tests...', 'cyan');

  const { coverage = false, pattern = '' } = options;
  let command = 'npm test';

  if (coverage) {
    command += ' -- --coverage';
  }

  if (pattern) {
    command += ` -- ${pattern}`;
  }

  const result = execCommand(command, { continueOnError: true });
  return {
    name: 'Unit Tests',
    passed: result.success,
    output: result.output || result.error,
  };
}

function runE2ETests() {
  log('\n🌐 Running E2E Tests...', 'cyan');

  if (!existsSync(path.join(projectRoot, 'playwright.config.ts'))) {
    log('⏭️  Playwright not configured, skipping E2E tests', 'yellow');
    return { name: 'E2E Tests', passed: true, skipped: true };
  }

  const result = execCommand('npm run test:e2e', { continueOnError: true });
  return {
    name: 'E2E Tests',
    passed: result.success,
    output: result.output || result.error,
  };
}

function runTypeCheck() {
  log('\n📘 Running TypeScript Check...', 'cyan');

  const result = execCommand('npm run check', { continueOnError: true });
  return {
    name: 'TypeScript',
    passed: result.success,
    output: result.output || result.error,
  };
}

function runLint() {
  log('\n🔍 Running Linter...', 'cyan');

  // Check if lint script exists
  const packageJson = JSON.parse(
    execCommand('cat package.json', { silent: true }).output
  );

  if (!packageJson.scripts?.lint) {
    log('⏭️  Lint script not configured, skipping', 'yellow');
    return { name: 'Linter', passed: true, skipped: true };
  }

  const result = execCommand('npm run lint', { continueOnError: true });
  return {
    name: 'Linter',
    passed: result.success,
    output: result.output || result.error,
  };
}

function runBuild() {
  log('\n🏗️  Running Build...', 'cyan');

  const result = execCommand('npm run build', { continueOnError: true });
  return {
    name: 'Build',
    passed: result.success,
    output: result.output || result.error,
  };
}

function runAPITests() {
  log('\n🔌 Running API Tests...', 'cyan');

  const apiTesterPath = path.join(__dirname, 'api-tester.js');
  if (!existsSync(apiTesterPath)) {
    log('⏭️  API tester not found, skipping', 'yellow');
    return { name: 'API Tests', passed: true, skipped: true };
  }

  const result = execCommand(`node ${apiTesterPath}`, { continueOnError: true });
  return {
    name: 'API Tests',
    passed: result.success,
    output: result.output || result.error,
  };
}

function generateReport(results, options = {}) {
  const { json = false } = options;

  const totalTests = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed,
      failed,
      skipped,
      success: failed === 0,
    },
    results,
  };

  if (json) {
    const reportPath = path.join(projectRoot, 'test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Report saved to: ${reportPath}`, 'blue');
    return report;
  }

  // Console report
  log('\n' + '='.repeat(60), 'bright');
  log('📊 TEST REPORT', 'bright');
  log('='.repeat(60), 'bright');

  log(`\nTimestamp: ${new Date().toLocaleString()}`, 'cyan');
  log(`\nSummary:`, 'bright');
  log(`  Total:   ${totalTests}`);
  log(`  Passed:  ${passed} ✅`, 'green');
  log(`  Failed:  ${failed} ❌`, failed > 0 ? 'red' : 'reset');
  log(`  Skipped: ${skipped} ⏭️ `, 'yellow');

  log(`\nDetailed Results:`, 'bright');
  results.forEach(result => {
    const icon = result.skipped ? '⏭️ ' : result.passed ? '✅' : '❌';
    const color = result.skipped ? 'yellow' : result.passed ? 'green' : 'red';
    log(`  ${icon} ${result.name}`, color);
  });

  log('\n' + '='.repeat(60), 'bright');

  if (failed === 0) {
    log('🎉 All tests passed!', 'green');
  } else {
    log('⚠️  Some tests failed. Review output above.', 'red');
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const scope = args[0] || 'quick';

  const options = {
    coverage: args.includes('--coverage'),
    verbose: args.includes('--verbose'),
    json: args.includes('--json'),
  };

  log('🚀 PelangiManager Test Runner', 'bright');
  log(`📋 Scope: ${scope}\n`, 'cyan');

  const startTime = Date.now();
  const results = [];

  try {
    switch (scope) {
      case 'quick':
        // Run only unit tests for quick validation
        results.push(runUnitTests());
        break;

      case 'unit':
        results.push(runUnitTests(options));
        break;

      case 'e2e':
        results.push(runE2ETests());
        break;

      case 'api':
        results.push(runAPITests());
        break;

      case 'build':
        results.push(runTypeCheck());
        results.push(runLint());
        results.push(runBuild());
        break;

      case 'full':
      case 'pre-commit':
        // Comprehensive validation
        results.push(runTypeCheck());
        results.push(runLint());
        results.push(runUnitTests(options));
        results.push(runE2ETests());
        results.push(runBuild());
        break;

      default:
        log(`❌ Unknown scope: ${scope}`, 'red');
        log('\nAvailable scopes: quick, unit, e2e, api, build, full', 'yellow');
        process.exit(1);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Duration: ${duration}s`, 'blue');

    const report = generateReport(results, options);

    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);

  } catch (error) {
    log(`\n❌ Test runner failed: ${error.message}`, 'red');
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
