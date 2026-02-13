# PelangiManager Fix Guide

## Login Failed (Database)

**When:** Login with admin / admin123 shows "Login Failed" or "Database unavailable".

**Cause:** Backend is using PostgreSQL (`DATABASE_URL` set) but schema was never applied, or DB is unreachable (Neon suspended, wrong URL).

**Fix:**
1. Ensure `.env` has a valid `DATABASE_URL` (e.g. Neon connection string).
2. Apply schema: `npm run db:push`
3. Restart the backend so the default admin user is seeded: stop the server, then `npm run dev` or `start-all.bat`.

If you prefer to run without a database, unset or remove `DATABASE_URL` and restart; the app will use in-memory storage and the demo admin (admin / admin123) will work.

---

## Rainbow Dashboard "Loading..." Issue

**Date:** 2026-02-12
**Issue:** Dashboard stuck on "Loading dashboard..." spinner
**Status:** ✅ RESOLVED

---

## Problem Summary

Rainbow Admin Dashboard at `http://localhost:3002` showed "Loading dashboard..." indefinitely without loading content.

---

## Root Cause

The MCP server (port 3002) depends on the **main PelangiManager API server (port 5000)** to fetch data. When only the MCP server was running, API calls failed with 500 errors, causing the dashboard templates to fail loading.

**Key insight:** The Rainbow dashboard requires **3 servers running simultaneously**:
1. Frontend (Vite) - port 3000
2. Backend API (Express) - port 5000
3. MCP server (Rainbow AI) - port 3002

---

## Solution

### Quick Fix

```bash
# Kill any existing processes and start all servers
npm run dev:clean
```

This command:
1. Kills processes on ports 3000 and 5000
2. Starts both frontend and backend servers
3. MCP server should already be running on 3002

---

## Verification Steps

### 1. Check All Servers Running

```bash
netstat -ano | findstr ":3000 :5000 :3002" | findstr "LISTENING"
```

**Expected output:**
```
TCP    0.0.0.0:3002    ...    LISTENING    [PID]
TCP    127.0.0.1:5000  ...    LISTENING    [PID]
TCP    [::1]:3000      ...    LISTENING    [PID]
```

### 2. Test Backend API

```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{"status":"ok","service":"pelangi-manager","timestamp":"..."}
```

### 3. Test MCP Server

```bash
curl http://localhost:3002/health
```

**Expected response:**
```json
{"status":"ok","service":"pelangi-mcp-server","version":"1.0.0","whatsapp":"open"}
```

---

## Browser Cache Issue

**IMPORTANT:** Even after servers are running, you may still see "Loading..." due to browser cache!

### Fix Browser Cache:

1. **Hard refresh** (clears cache for current page):
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache completely**:
   - Chrome/Edge: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

3. **Open in Incognito/Private mode** (bypasses cache):
   - Chrome/Edge: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`

4. **Close old tabs and open fresh**:
   - Close all Rainbow dashboard tabs
   - Open new tab: `http://localhost:3002/dashboard#understanding`

---

## Diagnostic Commands

### Check if page is actually loading (agent-browser)

```bash
agent-browser open http://localhost:3002/dashboard#understanding
agent-browser errors
agent-browser eval 'document.body.innerText.includes("Loading") ? "STUCK" : "OK"'
agent-browser close
```

### Check server logs for errors

```bash
# Backend logs
tail -50 [path-to-output-file] | grep -i "error\|500"

# MCP server logs
tail -50 [mcp-output-file] | grep -i "error\|500"
```

---

## Common Errors & Solutions

### Error: "Failed to load Intent Manager data"

**Symptom:** Console shows `TypeError: Cannot read properties of undefined (reading 'map')`

**Cause:** Backend API not reachable or returning errors

**Fix:**
1. Verify port 5000 is running
2. Check backend logs for errors
3. Restart backend: `npm run dev:server`

### Error: 500 Internal Server Error

**Symptom:** Network tab shows 500 errors on `/api/rainbow/*` endpoints

**Cause:** Backend API crashed or not running

**Fix:**
```bash
# Check if backend is running
netstat -ano | findstr ":5000"

# If not running, start it
npm run dev:clean
```

### Error: "API Error: http://localhost:5000/api/settings"

**Symptom:** MCP server logs show failed API calls to port 5000

**Cause:** Backend not running or not reachable

**Fix:**
1. Start backend server
2. Verify `PELANGI_API_URL` env var (should be `http://localhost:5000` for local dev)

---

## URL Structure (No Changes Made)

After investigation, we kept the original URL structure:

- ✅ `http://localhost:3002/dashboard#understanding` - Works (serves HTML at `/dashboard`, hash loads tab)
- ✅ `http://localhost:3002/understanding#responses` - Works (any path + hash)
- ✅ `http://localhost:3002/` - Works (default landing page)

**Note:** We initially tried to "prettify" URLs by redirecting `/dashboard` to `/#dashboard`, but this caused issues. The original system works fine - any path serves the HTML, and the hash fragment handles tab navigation client-side.

---

## What We Learned

1. **MCP server is NOT standalone** - it's a frontend for the main API server
2. **Three servers required** - don't just start MCP server alone
3. **Browser cache is persistent** - hard refresh is mandatory after server changes
4. **agent-browser bypasses cache** - it may show "working" while user's browser shows "loading"
5. **500 errors from backend = stuck loading** - check server logs, not just frontend

---

## Final Working State

**Servers running:**
- ✅ Port 3000: Vite frontend
- ✅ Port 5000: Express backend API
- ✅ Port 3002: Rainbow MCP server

**Dashboard accessible at:**
- `http://localhost:3002/dashboard#understanding`
- `http://localhost:3002/#dashboard`
- Any `/path#tab` combination

**Verified working:**
- Intent Manager tab shows: 19 intents, 464 keywords, 196 examples
- No console errors
- All templates loading correctly
- Export buttons, test console, all interactive elements present

---

## Quick Troubleshooting Checklist

- [ ] All 3 servers running (3000, 5000, 3002)?
- [ ] Backend health check returns 200 OK?
- [ ] MCP health check returns 200 OK?
- [ ] Hard refreshed browser (Ctrl+Shift+R)?
- [ ] Tried incognito/private mode?
- [ ] Closed old tabs and opened fresh?
- [ ] Checked browser console for errors?
- [ ] Checked server logs for 500 errors?

If all checked and still stuck → restart all servers with `npm run dev:clean`

---

## Commands Reference

```bash
# Start all servers (kills old processes first)
npm run dev:clean

# Start RainbowAI server only
cd RainbowAI && npm run dev

# Check running processes
netstat -ano | findstr ":3000 :5000 :3002"

# Kill process by PID (Windows)
powershell.exe -Command "Get-Process -Id [PID] | Stop-Process -Force"

# Test backend health
curl http://localhost:5000/api/health

# Test MCP health
curl http://localhost:3002/health
```

---

**Resolution:** Issue resolved by ensuring all 3 servers are running and instructing user to hard refresh browser to clear cache.

---

## Issue: Rainbow Dashboard Stuck on "Loading dashboard..." (Auth Error) - 2026-02-13

### Symptom
- Navigate to `http://localhost:3002/dashboard` → Shows "Loading dashboard..." indefinitely
- All 3 servers running (ports 3000, 5000, 3002 all LISTENING)
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
# Should return: {"status":"ok","service":"pelangi-mcp-server",...}

# 5. Test dashboard
# Navigate to http://localhost:3002/dashboard
# Should load within 2-3 seconds with full content
```

### Prevention

**Always restart MCP server after:**
- Changing `RainbowAI/.env` file
- Modifying `PELANGI_API_TOKEN` or `PELANGI_API_URL`
- Updating authentication configuration

**Quick diagnostic:**
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

### Key Lesson
**Environment variables require server restart!** Unlike React hot-reload, Node.js servers must be restarted to pick up `.env` changes. Always restart after modifying environment configuration.

