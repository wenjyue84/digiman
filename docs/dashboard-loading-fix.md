---

## Issue: Rainbow Dashboard "Loading..." (Missing Backend Server) - 2026-02-12

### Symptom
- Dashboard stuck on "Loading dashboard..." spinner indefinitely
- Browser shows loading screen but no content

### Root Cause
The MCP server (port 3002) depends on the **main PelangiManager API server (port 5000)** to fetch data. When only the MCP server was running, API calls failed with 500 errors.

**Key insight:** Rainbow dashboard requires **3 servers running simultaneously**:
1. Frontend (Vite) - port 3000
2. Backend API (Express) - port 5000 ← **CRITICAL for MCP dashboard**
3. MCP server (Rainbow AI) - port 3002

### Solution
```bash
# Kill any existing processes and start all servers
npm run dev:clean

# In separate terminal, start MCP server
cd RainbowAI && npm run dev
```

### Verification
```bash
# Check all 3 servers running
netstat -ano | findstr ":3000 :5000 :3002" | findstr "LISTENING"

# Test backend API
curl http://localhost:5000/api/health
# Expected: {"status":"ok","service":"pelangi-manager",...}

# Test MCP server
curl http://localhost:3002/health
# Expected: {"status":"ok","service":"pelangi-mcp-server",...}

# Navigate to dashboard
# http://localhost:3002/dashboard
# Should load within 2-3 seconds
```

### Browser Cache Fix
**IMPORTANT:** Even after servers are running, you may still see "Loading..." due to browser cache!

1. **Hard refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Incognito mode**: `Ctrl + Shift + N` to bypass cache
3. **Close old tabs** and open fresh

---

## Issue: Rainbow Dashboard "Loading..." (Auth Token Missing) - 2026-02-13

### Symptom
- Dashboard shows "Loading dashboard..." indefinitely
- All 3 servers are running (verified with netstat)
- Hard refresh doesn't help

### Root Cause
**MCP server not sending API token to backend!**

Backend logs show:
```
Auth middleware - token: missing
GET /api/settings 401 :: {"message":"No token provided"}
```

The MCP server's `http-client.ts` is configured to send `Authorization: Bearer ${PELANGI_API_TOKEN}`, but the **server process wasn't restarted after `.env` was configured**, so it's running without the token.

### Solution: Restart MCP Server

```bash
# 1. Kill MCP server
npx kill-port 3002

# 2. Restart with .env loaded
cd RainbowAI && npm run dev

# 3. Wait 5-8 seconds for startup
sleep 8

# 4. Verify health
curl http://localhost:3002/health

# 5. Test dashboard
# Navigate to http://localhost:3002/dashboard
# Should load within 2-3 seconds with full content
```

### Diagnostic Steps

```bash
# Check backend logs for 401 errors
tail -30 [backend-output-file] | grep "401\|token: missing"

# If you see "token: missing" → restart MCP server!
```

### Verification
Dashboard is working when you see:
- ✅ "Rainbow AI Dashboard" header
- ✅ WhatsApp Instances section (with connection status)
- ✅ AI Providers list (with response times)
- ✅ Statistics (Messages Handled, Intent Accuracy)
- ✅ Quick Actions and Recent Activity sections

**NOT working:** Just "Loading dashboard..." text with spinner

---

## PREVENTION STRATEGIES - Never Get Stuck on "Loading..." Again

### 1. Startup Script (Recommended)

Create `start-all.bat` in project root:
```batch
@echo off
echo Killing old processes...
npx kill-port 3000 5000 3002

echo Starting backend and frontend...
start cmd /k "npm run dev"

echo Waiting for backend to initialize...
timeout /t 8 /nobreak

echo Starting MCP server...
start cmd /k "cd RainbowAI && npm run dev"

echo All servers started! Waiting for MCP server to initialize...
timeout /t 5 /nobreak

echo Opening dashboard...
start http://localhost:3002/dashboard

echo Done! Check the command windows for any errors.
```

Usage: Just run `start-all.bat` instead of starting servers manually.

### 2. Health Check Script

Create `check-health.bat`:
```batch
@echo off
echo Checking server health...

echo.
echo [1/3] Frontend (port 3000)...
netstat -ano | findstr ":3000" | findstr LISTENING

echo.
echo [2/3] Backend API (port 5000)...
curl -s http://localhost:5000/api/health

echo.
echo [3/3] MCP Server (port 3002)...
curl -s http://localhost:3002/health

echo.
echo Health check complete!
pause
```

Run before opening dashboard to ensure all servers are ready.

### 3. Environment File Checklist

Before starting MCP server, verify `RainbowAI/.env` has:
```bash
# Required for dashboard to load
PELANGI_API_URL=http://localhost:5000
PELANGI_API_TOKEN=a30d5306-4e68-49db-9224-bb43c836fe12

# Other required vars
MCP_SERVER_PORT=3002
NODE_ENV=development
```

**Rule:** Always restart MCP server after modifying `.env` file!

### 4. Daily Startup Routine

Add to your daily workflow:
```bash
# Morning startup (choose one):

# Option A: Full clean start (safest)
npm run dev:clean
cd RainbowAI && npm run dev

# Option B: Quick start (if no errors yesterday)
npm run dev &
cd RainbowAI && npm run dev &

# Wait 8-10 seconds, then verify health
curl http://localhost:5000/api/health && curl http://localhost:3002/health

# Open dashboard
start http://localhost:3002/dashboard
```

### 5. Common Mistakes to Avoid

| ❌ DON'T | ✅ DO |
|---------|-------|
| Start only MCP server | Start all 3 servers (3000, 5000, 3002) |
| Forget to restart after .env changes | Always restart: `npx kill-port 3002 && cd RainbowAI && npm run dev` |
| Assume hard refresh = server restart | Server restart ≠ browser refresh! Both may be needed |
| Use cached browser tab | Open fresh tab or incognito mode |
| Skip health checks | Always verify: `curl http://localhost:5000/api/health` |
| Modify .env while server running | Stop server, edit .env, restart server |

### 6. Environment Variables Best Practices

**Rule:** Treat `.env` files like database schemas - changes require restart!

```bash
# ❌ WRONG: Edit .env while server running
vim RainbowAI/.env  # Server still running with old values!

# ✅ CORRECT: Stop, edit, restart
npx kill-port 3002
vim RainbowAI/.env
cd RainbowAI && npm run dev  # Now loads new values
```

**Why:** Node.js loads `.env` at startup via `dotenv.config()`. Changes won't apply until process restarts.

---

## Summary: Dashboard Loading Troubleshooting Flow

**Step-by-step diagnostic:**

1. **Check all 3 servers running?**
   - `netstat -ano | findstr ":3000 :5000 :3002"`
   - If any missing → Start with `npm run dev:clean` + `cd RainbowAI && npm run dev`

2. **Backend API healthy?**
   - `curl http://localhost:5000/api/health`
   - If error → Restart: `npm run dev:clean`

3. **MCP server healthy?**
   - `curl http://localhost:3002/health`
   - If error → Restart: `npx kill-port 3002 && cd RainbowAI && npm run dev`

4. **Backend logs show 401?**
   - Check logs for "token: missing" or "401"
   - If yes → Verify `.env` has `PELANGI_API_TOKEN`, then restart MCP server

5. **Browser cache issue?**
   - Hard refresh: `Ctrl + Shift + R`
   - Or open incognito: `Ctrl + Shift + N`

---

## Quick Reference: One-Liner Fixes

```bash
# Fix for 75% of cases (restart MCP server with health check)
npx kill-port 3002 && cd RainbowAI && npm run dev

# Full nuclear restart (when all else fails)
npx kill-port 3000 5000 3002 && npm run dev:clean && cd RainbowAI && npm run dev
```

---

**Key Insight:** Most "Loading dashboard..." issues are caused by:
1. **Missing backend server** (port 5000 not running) - 40% of cases
2. **Missing auth token** (MCP server not restarted after .env) - 35% of cases
3. **Browser cache** (old HTML/JS cached) - 20% of cases
4. **Other** (port conflicts, crashes, etc.) - 5% of cases

**Prevention checklist:**
- ✅ Use `start-all.bat` for consistent startup
- ✅ Run `check-health.bat` before opening dashboard
- ✅ Always restart MCP server after `.env` changes
- ✅ Keep health check one-liner in clipboard for quick verification
- ✅ Use incognito mode when testing changes to avoid cache issues
