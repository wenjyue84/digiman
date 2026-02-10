# Testing Scripts Documentation

Comprehensive testing utilities for PelangiManager, designed for use by both developers and the tester subagent.

## 📚 Available Scripts

### 1. Test Runner (`test-runner.js`)
**Purpose:** Main testing orchestration script for running various test scopes

**Usage:**
```bash
# Quick test (unit tests only)
node scripts/test/test-runner.js quick

# Run all unit tests
node scripts/test/test-runner.js unit

# Run E2E tests
node scripts/test/test-runner.js e2e

# Run API tests
node scripts/test/test-runner.js api

# Build validation (typecheck + lint + build)
node scripts/test/test-runner.js build

# Full test suite (pre-commit)
node scripts/test/test-runner.js full
```

**Options:**
- `--coverage` - Include coverage report
- `--verbose` - Detailed output
- `--json` - Output JSON report

**Examples:**
```bash
# Quick validation with coverage
node scripts/test/test-runner.js quick --coverage

# Full pre-commit check with JSON report
node scripts/test/test-runner.js full --json

# Verbose unit testing
node scripts/test/test-runner.js unit --verbose
```

---

### 2. API Tester (`api-tester.js`)
**Purpose:** Test API endpoints with various scenarios and validation

**Usage:**
```bash
# Test all endpoints
node scripts/test/api-tester.js

# Test specific endpoint
node scripts/test/api-tester.js /api/guests

# Verbose output
node scripts/test/api-tester.js --verbose

# JSON output
node scripts/test/api-tester.js --json
```

**Tested Endpoints:**
- `/api/health` - Health check
- `/api/guests` - Guest management
- `/api/capsules` - Capsule operations
- `/api/settings` - Settings retrieval
- `/api/auth/status` - Authentication status

**Environment Variables:**
```bash
API_BASE_URL=http://localhost:5000  # Default
```

**Example Output:**
```
🔌 PelangiManager API Tester
🌐 Base URL: http://localhost:5000

✅ Health Check (45ms)
✅ Get Guests (123ms)
✅ Get Capsules (89ms)
✅ Get Settings (67ms)
✅ Auth Status (34ms)

==================================================
📊 Results: 5/5 passed
==================================================
```

---

### 3. Pre-Commit Validation (`pre-commit.js`)
**Purpose:** Comprehensive checks before allowing a commit

**Usage:**
```bash
# Run all pre-commit checks
node scripts/test/pre-commit.js
```

**Checks Performed:**
1. **TypeScript Type Checking** - Critical
2. **Linting** - Warning only
3. **Unit Tests** - Critical
4. **Build Validation** - Critical
5. **File Size Check** - Warning (800-line rule)
6. **Console.log Check** - Warning only

**Exit Codes:**
- `0` - All critical checks passed
- `1` - Critical checks failed (blocks commit)

**Example Output:**
```
🚦 Pre-Commit Validation
==================================================

📝 Staged files: 3
check-in.tsx, api-tester.js, test-runner.js

1️⃣  TypeScript Check...
   ✅ TypeScript: Pass

2️⃣  Linting...
   ⚠️  Lint: Warnings

3️⃣  Unit Tests...
   ✅ Tests: Pass

4️⃣  Build Validation...
   ✅ Build: Success

5️⃣  File Size Check (800-line rule)...
   ⚠️  client/src/pages/check-in.tsx: 845 lines (exceeds 800)

6️⃣  Console.log Check...
   ✅ No console.log found

==================================================
📊 Pre-Commit Summary
==================================================

Critical Checks:
  ✅ TypeScript
  ✅ Tests
  ✅ Build

Warnings (non-blocking):
  ⚠️  Lint
  ⚠️  File Size
  ✅ Console Logs

==================================================
🎉 All critical checks passed! Safe to commit.

💡 Tip: Review warnings above before committing
```

---

### 4. Environment Check (`env-check.js`)
**Purpose:** Validate development environment setup

**Usage:**
```bash
# Check environment
node scripts/test/env-check.js
```

**Checks:**
- Node.js version (>= 18 required)
- npm installation
- Port availability (3000, 5000)
- Dependencies installed
- Environment files (.env)
- Git repository status
- Build artifacts
- Database configuration

**Example Output:**
```
🔍 PelangiManager Environment Check
==================================================

Node.js: v20.10.0 ✅
npm: 10.2.3 ✅

🔌 Port Availability:
   3000 (Frontend): Available ✅
   5000 (Backend): In use ⚠️
      Run: npx kill-port 5000

📦 Dependencies:
   node_modules installed ✅
   Critical dependencies present ✅

🔐 Environment Files:
   .env file found ✅

📂 Git Repository:
   Current branch: main ✅

🏗️  Build Artifacts:
   dist/ directory exists ✅
   client/dist/ directory exists ✅

🗄️  Database:
   DATABASE_URL not set ⏭️
   Will use in-memory storage

==================================================
📊 Environment Summary
==================================================
✅ Node.js
✅ npm
✅ Dependencies

==================================================
🎉 Environment is ready for development!

💡 Quick start: npm run dev
```

---

### 5. Test Helpers (`test-helpers.js`)
**Purpose:** Common utilities for testing scripts

**Import:**
```javascript
import { log, execCommand, createTestReport } from './test-helpers.js';
```

**Available Functions:**

#### Logging
```javascript
log('Message', 'green');  // Colored console output
```

#### Command Execution
```javascript
const result = execCommand('npm test', {
  silent: true,
  continueOnError: true
});
```

#### Project Utilities
```javascript
const root = getProjectRoot();
const pkg = getPackageJson();
const hasTest = hasScript('test');
```

#### Test Reports
```javascript
const report = createTestReport(results);
saveTestReport(report, 'my-test-report.json');
printTestSummary(report);
```

#### File Operations
```javascript
const modifiedFiles = getModifiedFiles(true);  // staged files
const lines = countLines('path/to/file.ts');
const check = checkLineLimit('file.ts', 800);
```

#### Utilities
```javascript
const duration = formatDuration(1234);  // "1.23s"
await retryWithBackoff(() => apiCall(), 3, 1000);
const progress = createProgressBar(100, 30);
progress.update(50);
```

---

## 🎯 Integration with Tester Agent

### Quick Reference for Tester Agent

**1. Quick Validation (Post-Implementation)**
```bash
node scripts/test/test-runner.js quick
```

**2. Full Pre-Commit Check**
```bash
node scripts/test/pre-commit.js
```

**3. API Endpoint Testing**
```bash
node scripts/test/api-tester.js --verbose
```

**4. Environment Validation**
```bash
node scripts/test/env-check.js
```

### Recommended Workflows

#### After Bug Fix
```bash
# 1. Check environment
node scripts/test/env-check.js

# 2. Run relevant tests
node scripts/test/test-runner.js quick

# 3. Test affected API endpoints
node scripts/test/api-tester.js /api/[endpoint]
```

#### Before Commit
```bash
# Run comprehensive pre-commit checks
node scripts/test/pre-commit.js
```

#### Full System Test
```bash
# Run everything
node scripts/test/test-runner.js full --coverage --json
```

---

## 🔧 Configuration

### Environment Variables

```bash
# API Testing
API_BASE_URL=http://localhost:5000

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### Customizing Tests

#### Add New API Endpoint Test
Edit `api-tester.js` and add to `API_TESTS` array:

```javascript
{
  name: 'Your Test Name',
  method: 'GET',
  path: '/api/your-endpoint',
  expectedStatus: 200,
  validateResponse: (body) => {
    return body && body.someField;
  },
}
```

#### Modify Pre-Commit Checks
Edit `pre-commit.js` to adjust:
- Line limit threshold (default: 800)
- Critical vs warning checks
- Exit conditions

---

## 📊 Output Formats

### Console Output
Default human-readable output with colors and formatting

### JSON Output
Use `--json` flag for machine-readable output:

```json
{
  "timestamp": "2026-01-28T23:00:00.000Z",
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "success": false
  },
  "results": [
    {
      "name": "Unit Tests",
      "passed": true,
      "duration": 2340
    }
  ]
}
```

---

## 🚨 Exit Codes

All scripts follow consistent exit code conventions:

- `0` - Success, all tests passed
- `1` - Failure, tests failed or critical issues found

Use in CI/CD or automation:
```bash
if node scripts/test/pre-commit.js; then
  echo "Tests passed!"
else
  echo "Tests failed!"
fi
```

---

## 💡 Tips for Tester Agent

1. **Always check environment first** - Run `env-check.js` before testing
2. **Match test scope to changes** - Use `quick` for small changes, `full` for major work
3. **Capture JSON reports** - Use `--json` for structured data
4. **Monitor port conflicts** - Kill ports if needed: `npx kill-port 3000 5000`
5. **Read exit codes** - Non-zero means failure, zero means success
6. **Chain commands** - Use `&&` to run multiple checks sequentially

---

## 🔄 Maintenance

### Adding New Scripts
1. Create script in `scripts/test/`
2. Add to this README
3. Update `.agents/tester-agent.md` configuration
4. Test with tester agent

### Updating Existing Scripts
1. Maintain backward compatibility
2. Update documentation
3. Test with sample projects
4. Notify users of breaking changes

---

## 📞 Troubleshooting

### Tests Not Running
```bash
# Check Node.js version
node --version  # Should be >= 18

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Conflicts
```bash
# Kill specific ports
npx kill-port 3000 5000

# Or use the clean dev script
npm run dev:clean
```

### Build Failures
```bash
# Clean build artifacts
rm -rf dist client/dist

# Rebuild
npm run build
```

---

*Last Updated: 2026-01-28*
*Version: 1.0.0*
