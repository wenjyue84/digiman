# MCP Server Testing & Restart Skill

> Comprehensive guide for running tests, restarting the MCP server, and troubleshooting port/process issues on Windows.

## Quick Reference

| Item | Value |
|------|-------|
| MCP Server Port | **3002** |
| Test Endpoint | `POST /api/rainbow/tests/run` |
| Coverage Endpoint | `POST /api/rainbow/tests/coverage` |
| Admin Dashboard | `http://localhost:3002/admin/rainbow` → Testing tab |
| Test Framework | **Vitest** with project-based config |
| Test Count (as of 2026-02-10) | 161 unit tests across 13 suites |
| Test Duration | ~1.8s |

---

## 1. Running Tests

### Via CLI (Direct)
```bash
cd mcp-server

# Run all unit tests
npx vitest run --project unit

# Run with JSON reporter (what the API endpoint uses)
npx vitest run --project unit --reporter=json

# Run specific test file
npx vitest run tests/unit/fuzzy-matcher.test.ts

# Run with coverage
npx vitest run --project unit --coverage
```

### Via API Endpoint
```bash
# Unit tests
curl -X POST http://localhost:3002/api/rainbow/tests/run \
  -H "Content-Type: application/json" \
  -d '{"project":"unit"}'

# Coverage
curl -X POST http://localhost:3002/api/rainbow/tests/coverage \
  -H "Content-Type: application/json"
```

### Via Rainbow Dashboard
1. Navigate to `http://localhost:3002/admin/rainbow`
2. Click **Testing** tab
3. Select project (unit/integration/semantic)
4. Click **Run Tests** or **Coverage**

### Valid Test Projects
- `unit` — Unit tests (default, fast)
- `integration` — Integration tests
- `semantic` — Semantic/AI tests

---

## 2. Server Restart (Windows-Specific)

### The Problem
MSYS bash (Git Bash) **cannot kill Windows processes** properly:
- `kill -9 <pid>` fails — different PID namespace
- `taskkill` from MSYS has escaping issues
- `npx kill-port` often fails silently
- `cmd.exe /c taskkill` may not execute properly from MSYS

### Solution: Use PowerShell Directly

**Method 1 — PowerShell one-liner (BEST):**
```bash
powershell.exe -ExecutionPolicy Bypass -Command "Get-Process -Id <PID> -ErrorAction SilentlyContinue | Stop-Process -Force"
```

**Method 2 — Find PID first, then kill:**
```bash
# Find the PID
netstat -ano | grep ":3002" | grep LISTENING

# Kill via PowerShell (replace PID)
powershell.exe -ExecutionPolicy Bypass -Command "Get-Process -Id <PID> | Stop-Process -Force"
```

**Method 3 — Kill all node processes on port (nuclear):**
```bash
powershell.exe -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
```

**Method 4 — Restart script:**
```bash
# From mcp-server directory
powershell.exe -ExecutionPolicy Bypass -File restart-mcp.ps1
```

### After Killing: Verify & Restart
```bash
# Verify port is free (should return empty)
netstat -ano | grep ":3002" | grep LISTENING

# Start server
cd mcp-server && npm run dev

# Or use tsx directly
cd mcp-server && npx tsx src/index.ts
```

### After Restart: Verify New Code Loaded
```bash
# Health check
curl -s http://localhost:3002/health

# Test a new endpoint (if you just added one)
curl -s -X POST http://localhost:3002/api/rainbow/tests/run \
  -H "Content-Type: application/json" \
  -d '{"project":"unit"}' | head -5

# If returns HTML instead of JSON → old code still running!
```

---

## 3. Common Issues & Fixes

### Issue: API returns HTML instead of JSON
**Symptom:** `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
**Cause:** Route not registered — server running old code
**Fix:** Restart the server (see Section 2). The `tsx` dev script uses TypeScript directly but won't pick up changes if the old process is still running.

### Issue: Process won't die (Access Denied)
**Symptom:** `Stop-Process: Access is denied` or `taskkill ERROR: Access is denied`
**Cause:** Process started by elevated/different user or is a system-protected process
**Fix:**
1. Open PowerShell **as Administrator**
2. Run: `Stop-Process -Id <PID> -Force`
3. If still fails: Open Task Manager → Details → Right-click PID → End Process Tree

### Issue: Port 3002 immediately re-occupied after kill
**Symptom:** Kill process, but `netstat` shows new PID on same port
**Cause:** A file watcher or supervisor restarted the server
**Fix:** Check if it's the NEW code by testing an endpoint. If it returns correct JSON, the auto-restart actually loaded the new code — problem solved!

### Issue: Tests pass in CLI but fail via API
**Symptom:** `npx vitest run` works but `/api/rainbow/tests/run` fails
**Cause:** Usually a CWD issue — the API endpoint resolves `process.cwd()` which may differ
**Fix:** The route uses `path.resolve(process.cwd())` for `mcpRoot`. Ensure the server is started from the `mcp-server/` directory.

### Issue: Vitest JSON output parsing fails
**Symptom:** API returns `{ raw: "...", stderr: "..." }` instead of structured results
**Cause:** Vitest may print non-JSON text before the JSON output
**Fix:** The parser already handles this — it finds the first `{` in stdout. If it still fails, check if `--reporter=json` is working: `npx vitest run --project unit --reporter=json 2>/dev/null | head -1`

### Issue: TypeScript compilation errors in test files
**Symptom:** `npx tsc --noEmit` shows errors in test files
**Cause:** Old test files may use deprecated imports or assertion syntax
**Fix:** These are pre-existing — filter for YOUR file: `npx tsc --noEmit 2>&1 | grep "your-file.ts"`. If no errors for your file, you're fine.

---

## 4. Testing Tab Architecture

### Frontend (rainbow-admin.html)
- **Tab registration:** `VALID_TABS` array includes `'testing'`
- **Tab loader:** `testing: () => {}` (results loaded on-demand via Run button)
- **JavaScript functions:**
  - `runTests()` — POST to `/tests/run`, renders results
  - `runCoverage()` — POST to `/tests/coverage`, renders coverage table
  - `renderTestResults(data)` — Expandable file cards with pass/fail per test
  - `renderCoverageResults(data)` — Coverage table with color-coded thresholds
  - `covColor(val)` — Green (>=80%), Amber (>=50%), Red (<50%)
  - `escHtml(str)` — XSS prevention for test output

### Backend (routes/admin.ts)
- **Route:** `router.post('/tests/run', adminAuth, ...)` → mounted at `/api/rainbow`
- **Process:** Spawns `npx vitest run --project <project> --reporter=json`
- **Parsing:** Finds JSON in stdout, extracts test results per file
- **Timeout:** 120 seconds per test run
- **Windows support:** Uses `npx.cmd` on Windows, `npx` on Linux

### Response Format (tests/run)
```json
{
  "success": true,
  "numTotalTests": 161,
  "numPassedTests": 161,
  "numFailedTests": 0,
  "numTotalTestSuites": 57,
  "numPassedTestSuites": 57,
  "duration": 1826,
  "testFiles": [
    {
      "file": "fuzzy-matcher.test.ts",
      "status": "passed",
      "tests": [
        { "name": "test name", "status": "passed", "duration": 1.5 }
      ],
      "duration": 28.3
    }
  ],
  "project": "unit"
}
```

---

## 5. Windows Process Management Cheat Sheet

```powershell
# Find process on port
Get-NetTCPConnection -LocalPort 3002 -State Listen

# Kill by PID
Stop-Process -Id <PID> -Force

# Kill all node.exe
Stop-Process -Name node -Force

# Kill process tree (includes children)
# From cmd.exe:
taskkill /F /PID <PID> /T

# List node processes with command line
Get-WmiObject Win32_Process -Filter "name='node.exe'" | Select ProcessId, CommandLine
```

---

## 6. Lessons Learned (2026-02-10)

1. **MSYS bash ≠ Windows for process management.** Always use `powershell.exe -Command` for killing processes.
2. **Server restart is the #1 cause of "route not found" errors.** If a new route returns HTML, it's always old code.
3. **Auto-restart can be a friend.** After killing a supervised process, check if the NEW instance loaded your code before panicking.
4. **`npx kill-port` is unreliable on Windows.** PowerShell `Stop-Process` is more reliable.
5. **Test the endpoint directly with curl** before debugging frontend JavaScript issues.
6. **Vitest JSON reporter** outputs to stdout, but may include non-JSON preamble — always search for the first `{`.
