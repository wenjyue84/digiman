# Rainbow MCP Server Troubleshooting

## Quick Reference

**Issue:** Accessing `http://localhost:3002/admin/rainbow/*` shows "Redirecting to Rainbow Admin Dashboard..." message instead of the actual dashboard.

**Root Cause:** MCP server not running on port 3002.

**Quick Fix:**
```bash
cd mcp-server && npm run dev
```

---

## Prevention Solutions

### Option 1: Auto-Start Script (Recommended)

Create a startup script that ensures the MCP server is always running:

**File: `start-rainbow.bat`**
```batch
@echo off
echo Checking if MCP server is running on port 3002...

:: Check if port 3002 is in use
netstat -ano | findstr ":3002" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MCP server is already running on port 3002
    echo Opening Rainbow dashboard...
    start http://localhost:3002/admin/rainbow
    exit /b 0
)

echo Port 3002 is free. Starting MCP server...
cd mcp-server
start "MCP Server" cmd /k npm run dev

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Opening Rainbow dashboard...
start http://localhost:3002/admin/rainbow
```

**Usage:**
```bash
# Double-click start-rainbow.bat or run:
.\start-rainbow.bat
```

### Option 2: Add to Main Dev Script

Modify your main `npm run dev` to start both servers:

**File: `package.json`**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:frontend\" \"npm run dev:mcp\"",
    "dev:mcp": "cd mcp-server && npm run dev",
    "dev:frontend": "vite",
    "dev:server": "tsx watch server/index.ts"
  }
}
```

Then install concurrently if not already installed:
```bash
npm install --save-dev concurrently
```

### Option 3: VS Code Task (Auto-start on project open)

**File: `.vscode/tasks.json`**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start All Servers",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": [],
      "runOptions": {
        "runOn": "folderOpen"
      },
      "isBackground": true
    }
  ]
}
```

---

## Detailed Troubleshooting Steps

### Step 1: Verify the Issue

**Symptom:** Browser shows "Redirecting to Rainbow Admin Dashboard..." when accessing `http://localhost:3002/admin/rainbow/*`

**What this means:**
- You're hitting the React app's redirect component (`client/src/pages/admin-rainbow.tsx`)
- The React app is trying to redirect to the MCP server
- But the MCP server isn't responding

### Step 2: Check if MCP Server is Running

```bash
# Method 1: Check port 3002
netstat -ano | findstr ":3002"

# Expected output if running:
#   TCP    0.0.0.0:3002           0.0.0.0:0              LISTENING       <PID>

# Method 2: Health check
curl http://localhost:3002/health

# Expected output if running:
#   {"status":"ok","service":"pelangi-mcp-server","version":"1.0.0",...}
```

**If no output:** MCP server is NOT running → Go to Step 3

**If HTML output (Vite page):** Wrong port or proxy issue → Go to Step 4

**If JSON output:** Server is running → Go to Step 5

### Step 3: Start the MCP Server

```bash
# Clean start (kill existing processes first)
npx kill-port 3002
cd mcp-server
npm run dev

# Wait 5-10 seconds for initialization
# You should see:
#   Pelangi MCP Server running on http://0.0.0.0:3002
#   MCP endpoint: http://0.0.0.0:3002/mcp
#   Health check: http://0.0.0.0:3002/health
```

**Common startup errors:**

**Error: EADDRINUSE (port already in use)**
```bash
# Solution: Kill the port and retry
npx kill-port 3002
cd mcp-server && npm run dev
```

**Error: Cannot find module**
```bash
# Solution: Reinstall dependencies
cd mcp-server
npm install
npm run dev
```

**Error: TypeScript errors**
```bash
# Solution: Check for syntax errors in mcp-server/src/
# Fix any compilation errors shown in the output
```

### Step 4: Verify Port Configuration

**Check 1:** MCP server port in `.env`
```bash
# File: mcp-server/.env
MCP_SERVER_PORT=3002  # Must be 3002
```

**Check 2:** React redirect URL
```bash
# File: client/src/pages/admin-rainbow.tsx
# Line 15 should have:
window.location.href = `http://localhost:3002/admin/rainbow${subPath}`;
```

**If ports don't match:** Update one to match the other and restart servers.

### Step 5: Verify Dashboard Access

**Direct access to MCP server:**
```bash
# Should work immediately (no redirect)
http://localhost:3002/admin/rainbow

# Specific tabs should also work
http://localhost:3002/admin/rainbow/status
http://localhost:3002/admin/rainbow/intent-manager
http://localhost:3002/admin/rainbow/kb
```

**Access via React app:**
```bash
# React app will redirect to MCP server
http://localhost:3000/admin/rainbow
# → redirects to → http://localhost:3002/admin/rainbow
```

### Step 6: Browser Cache Issues

If you still see "Redirecting..." after confirming the server is running:

```bash
# Solution: Hard refresh the browser
# Chrome/Edge: Ctrl + Shift + R or Ctrl + F5
# Firefox: Ctrl + Shift + R
# Safari: Cmd + Option + R
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (Express) | 5000 | http://localhost:5000 |
| **MCP Server** | **3002** | **http://localhost:3002** |

---

## Common Scenarios

### Scenario A: After reboot/restart
**Issue:** MCP server not auto-started
**Solution:** Run `cd mcp-server && npm run dev` OR use `start-rainbow.bat`

### Scenario B: Working yesterday, not today
**Issue:** Process killed or crashed
**Solution:**
1. Check if running: `netstat -ano | findstr ":3002"`
2. If not running: `cd mcp-server && npm run dev`

### Scenario C: Changed code, page still shows old version
**Issue:** Browser cache
**Solution:** Hard refresh (Ctrl + Shift + R)

### Scenario D: Multiple developers/machines
**Issue:** Port conflicts or different configurations
**Solution:**
1. Standardize `.env` files across team
2. Document port allocations in README
3. Use `npx kill-port 3002` before starting

---

## Health Check Script

Create a quick health check script:

**File: `check-rainbow.bat`**
```batch
@echo off
echo === Rainbow MCP Server Health Check ===
echo.

echo [1/4] Checking if port 3002 is listening...
netstat -ano | findstr ":3002" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Port 3002 is in use
) else (
    echo ✗ Port 3002 is FREE - server not running!
    echo.
    echo Run: cd mcp-server ^&^& npm run dev
    exit /b 1
)

echo [2/4] Testing health endpoint...
curl -s http://localhost:3002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Health endpoint responding
) else (
    echo ✗ Health endpoint not responding
    exit /b 1
)

echo [3/4] Testing dashboard HTML...
curl -s http://localhost:3002/admin/rainbow | findstr "Rainbow Admin Dashboard" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Dashboard HTML served correctly
) else (
    echo ✗ Dashboard HTML not found
    exit /b 1
)

echo [4/4] Testing React redirect route...
curl -s http://localhost:3000/admin/rainbow 2>&1 | findstr "Redirecting" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ React redirect route working
) else (
    echo ⚠ React app might not be running on port 3000
)

echo.
echo === All checks passed! ===
echo Rainbow dashboard: http://localhost:3002/admin/rainbow
```

**Usage:**
```bash
.\check-rainbow.bat
```

---

## Integration with Claude Memory

**Add to `.claude/projects/.../memory/MEMORY.md`:**

```markdown
## Rainbow MCP Server Troubleshooting — Quick Commands

**Start MCP server:**
```bash
cd mcp-server && npm run dev
```

**Check if running:**
```bash
netstat -ano | findstr ":3002"
curl http://localhost:3002/health
```

**Restart if stuck:**
```bash
npx kill-port 3002 && cd mcp-server && npm run dev
```

**Access dashboard:**
- Direct: http://localhost:3002/admin/rainbow
- Via React: http://localhost:3000/admin/rainbow (redirects to 3002)

**White page = MCP server not running!**
```

---

## When to Use Each Approach

| Situation | Recommended Solution |
|-----------|---------------------|
| Daily development | Use **Option 2** (add to main `npm run dev`) |
| Occasional Rainbow admin access | Use **Option 1** (`start-rainbow.bat`) |
| VS Code user | Use **Option 3** (auto-start task) |
| Quick check | Use health check script (`check-rainbow.bat`) |
| Deployment/production | Ensure MCP server in Docker compose or systemd |

---

## Related Files

- MCP server entry: `mcp-server/src/index.ts`
- React redirect: `client/src/pages/admin-rainbow.tsx`
- Port config: `mcp-server/.env`
- Dashboard HTML: `mcp-server/src/public/rainbow-admin.html`
- Routes config: `client/src/App.tsx` (lines 95-100)
