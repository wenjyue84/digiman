#!/usr/bin/env node
/**
 * API Tester - Test API endpoints with various scenarios
 * Usage: node scripts/test/api-tester.js [endpoint] [options]
 *
 * Examples:
 *   node scripts/test/api-tester.js                    # Test all endpoints
 *   node scripts/test/api-tester.js /api/guests        # Test specific endpoint
 *   node scripts/test/api-tester.js --verbose          # Detailed output
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

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

// Test definitions for PelangiManager API
const API_TESTS = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200,
    validateResponse: (body) => {
      return body && body.status === 'ok';
    },
  },
  {
    name: 'Get Guests',
    method: 'GET',
    path: '/api/guests',
    expectedStatus: [200, 401], // May require auth
    validateResponse: (body) => {
      return Array.isArray(body) || body.error;
    },
  },
  {
    name: 'Get Capsules',
    method: 'GET',
    path: '/api/capsules',
    expectedStatus: [200, 401],
    validateResponse: (body) => {
      return Array.isArray(body) || body.error;
    },
  },
  {
    name: 'Get Settings',
    method: 'GET',
    path: '/api/settings',
    expectedStatus: [200, 401],
    validateResponse: (body) => {
      return body && (typeof body === 'object' || body.error);
    },
  },
  {
    name: 'Auth Status',
    method: 'GET',
    path: '/api/auth/status',
    expectedStatus: 200,
    validateResponse: (body) => {
      return body && typeof body.authenticated === 'boolean';
    },
  },
];

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpoint(test, options = {}) {
  const { verbose = false } = options;

  try {
    const url = new URL(test.path, BASE_URL);
    const requestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...test.headers,
      },
      body: test.body,
    };

    if (verbose) {
      log(`\n🔍 Testing: ${test.name}`, 'cyan');
      log(`   ${test.method} ${test.path}`, 'cyan');
    }

    const startTime = Date.now();
    const response = await makeRequest(requestOptions);
    const duration = Date.now() - startTime;

    // Check status code
    const expectedStatuses = Array.isArray(test.expectedStatus)
      ? test.expectedStatus
      : [test.expectedStatus];

    const statusMatch = expectedStatuses.includes(response.statusCode);

    // Validate response
    let validationPassed = true;
    let validationError = null;

    if (test.validateResponse && statusMatch) {
      try {
        validationPassed = test.validateResponse(response.body);
      } catch (error) {
        validationPassed = false;
        validationError = error.message;
      }
    }

    const passed = statusMatch && validationPassed;

    if (verbose) {
      log(`   Status: ${response.statusCode} ${statusMatch ? '✅' : '❌'}`, statusMatch ? 'green' : 'red');
      log(`   Duration: ${duration}ms`, 'cyan');
      if (validationError) {
        log(`   Validation Error: ${validationError}`, 'red');
      }
    }

    return {
      name: test.name,
      method: test.method,
      path: test.path,
      passed,
      statusCode: response.statusCode,
      expectedStatus: expectedStatuses,
      duration,
      validationPassed,
      validationError,
    };

  } catch (error) {
    if (verbose) {
      log(`   ❌ Error: ${error.message}`, 'red');
    }

    return {
      name: test.name,
      method: test.method,
      path: test.path,
      passed: false,
      error: error.message,
    };
  }
}

async function checkServerRunning() {
  try {
    const url = new URL('/api/health', BASE_URL);
    const requestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 3000,
    };

    await makeRequest(requestOptions);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const specificEndpoint = args.find(arg => !arg.startsWith('--'));
  const verbose = args.includes('--verbose');
  const json = args.includes('--json');

  log('🔌 PelangiManager API Tester', 'bright');
  log(`🌐 Base URL: ${BASE_URL}\n`, 'cyan');

  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    log('⚠️  Warning: Server might not be running', 'yellow');
    log(`   Trying to connect to ${BASE_URL}`, 'yellow');
    log('   Start the server with: npm run dev\n', 'yellow');
  }

  // Filter tests if specific endpoint requested
  let testsToRun = API_TESTS;
  if (specificEndpoint) {
    testsToRun = API_TESTS.filter(test => test.path === specificEndpoint);
    if (testsToRun.length === 0) {
      log(`❌ No tests found for endpoint: ${specificEndpoint}`, 'red');
      process.exit(1);
    }
  }

  // Run tests
  const results = [];
  for (const test of testsToRun) {
    const result = await testEndpoint(test, { verbose });
    results.push(result);

    if (!verbose) {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? 'green' : 'red';
      log(`${icon} ${result.name} (${result.duration || '?'}ms)`, color);
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  log('\n' + '='.repeat(50), 'bright');
  log(`📊 Results: ${passed}/${results.length} passed`, passed === results.length ? 'green' : 'red');
  log('='.repeat(50), 'bright');

  if (json) {
    console.log(JSON.stringify({ passed, failed, total: results.length, results }, null, 2));
  }

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
