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

---

## Issue: Rainbow Dashboard "Loading..." on Normal Refresh (Browser Cache) - 2026-02-14

### Symptom
- Navigate to `http://localhost:3002/understanding` → Shows dashboard instead of understanding tab
- Normal refresh (F5) → Stuck on "Loading..." for all tabs
- Hard refresh (Ctrl+Shift+R) → Works perfectly
- Must do hard refresh every time = annoying

### Root Cause: The Photocopy Problem

Think of your browser like a **librarian with a photocopy machine**:

1. **First visit:** Librarian fetches the book (HTML) and chapters (JS/CSS files), makes photocopies for next time
2. **Normal refresh (F5):** Librarian fetches fresh HTML but uses OLD photocopied JS/CSS from filing cabinet
3. **Hard refresh (Ctrl+Shift+R):** Librarian throws away ALL photocopies and fetches everything fresh

**The chicken-and-egg problem:**
- We added `cache: 'no-store'` to JavaScript files to prevent caching
- But Chrome was using the OLD cached JavaScript that didn't have the fix yet
- The fix that prevents caching was itself being cached!

**Why server headers weren't enough:**
Even with `Cache-Control: no-store, no-cache` headers from server, the browser's `fetch()` API uses `cache: 'default'` mode. In default mode, the browser checks its HTTP cache BEFORE looking at server headers → stale cache wins.

### Why React/Vite Doesn't Have This Problem

React build generates files like:
```
index-a1b2c3d4.js      ← hash changes when code changes
styles-e5f6g7h8.css    ← different hash = different URL
```

Different content = different filename = browser can't serve stale cache (never seen that URL before).

Rainbow dashboard uses vanilla JS with **stable filenames**:
```html
<script src="/public/js/core/tabs.js"></script>  ← same URL forever
```

No matter how many times you change `tabs.js`, the URL stays the same → browser happily serves old photocopy.

### Solution: Auto-Versioning (Mimic Vite's Approach)

**Applied 5 fixes:**

1. **Path-to-hash URL normalization** (`rainbow-admin.html` + `tabs.js`)
   - Before: `/understanding` → `/` (lost tab name)
   - After: `/understanding` → `/#understanding` (preserves tab)

2. **Template fetch cache-busting** (`tabs.js`)
   ```javascript
   // Before
   const response = await fetch(`/api/rainbow/templates/${templateName}`);

   // After
   const response = await fetch(`/api/rainbow/templates/${templateName}`, { cache: 'no-store' });
   ```

3. **API wrapper cache-busting** (`utils.js`)
   ```javascript
   // Before
   const res = await fetch(API + path, { headers: {...} });

   // After
   const res = await fetch(API + path, { cache: 'no-store', headers: {...} });
   ```

4. **Disabled ETags** (`index.ts`)
   ```typescript
   app.set('etag', false);  // Global
   express.static(path, { etag: false, lastModified: false });  // Static files
   ```

5. **Auto-versioning all JS/CSS URLs** (`index.ts` - THE KEY FIX)
   ```typescript
   function getDashboardHtml(): string {
     let html = readFileSync(...);
     // Inject fresh timestamp into every JS/CSS URL
     const v = Date.now();
     html = html.replace(/(src|href)="(\/public\/[^"]+\.(js|css))"/g, `$1="$2?v=${v}"`);
     return html;
   }
   ```

   **Result:**
   ```html
   <!-- Before -->
   <script src="/public/js/core/tabs.js"></script>

   <!-- After (every page load gets NEW URL) -->
   <script src="/public/js/core/tabs.js?v=1771056694571"></script>
   ```

6. **Meta cache tags** (`rainbow-admin.html`)
   ```html
   <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
   <meta http-equiv="Pragma" content="no-cache">
   <meta http-equiv="Expires" content="0">
   ```

### How Auto-Versioning Works

**Every page load:**
1. Server reads `rainbow-admin.html`
2. Injects `?v=<current_timestamp>` into all `/public/*.js` and `/public/*.css` URLs
3. Browser sees: `tabs.js?v=1771056694571`
4. Next page load: `tabs.js?v=1771056700000` (different timestamp)
5. Browser thinks it's a NEW URL it's never cached → fetches fresh

This mimics Vite's content hashing but simpler:
- Vite: `app-a1b2c3d4.js` (hash from file content, only changes when content changes)
- Our approach: `app.js?v=timestamp` (changes every load, less efficient but works)

### Testing & Verification

**Initial setup (ONE TIME ONLY):**
```bash
# Do ONE hard refresh to pick up the auto-versioning code
# Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

**After that, normal refresh works forever:**
```bash
# Navigate to any tab
http://localhost:3002/understanding
http://localhost:3002/chat-simulator
http://localhost:3002/settings

# Normal refresh (F5) - should work without "Loading..."
# No more hard refresh needed!
```

**Verify auto-versioning is active:**
```bash
curl -s http://localhost:3002/ | grep -E 'src=.*\.js\?v=|href=.*\.css\?v='
```

**Expected output:**
```html
<link rel="stylesheet" href="/public/css/rainbow-styles.css?v=1771056694571">
<script src="/public/js/core/tabs.js?v=1771056694571"></script>
<script src="/public/js/core/utils.js?v=1771056694571"></script>
```

### Defense-in-Depth Caching Protection

Now has **4 layers** of anti-cache protection:

1. **Server headers** (`Cache-Control: no-store, no-cache, must-revalidate`)
2. **HTML meta tags** (`<meta http-equiv="Cache-Control">`)
3. **Client-side fetch** (`cache: 'no-store'` in all AJAX calls)
4. **Auto-versioned URLs** (`?v=timestamp` forces fresh fetch every load) ⭐ KEY FIX

### Performance Impact

**Development:** Zero impact (localhost is fast, ~50KB of JS/CSS files total)

**Production (if deployed):**
- Every page load re-downloads all JS/CSS (~50KB total)
- Better approach for production: Use Vite bundler (content-hashed filenames, cacheable between deploys)
- Current approach: Optimized for developer experience, not production scale

### Why Not Just Use React?

**Cost-benefit analysis:**
- **Vanilla JS + auto-versioning:** 2 lines of code, solves problem permanently
- **React rewrite:** 1-2 weeks of work, rewriting ~10 tabs (2000+ lines of `live-chat.js` alone)
- **Verdict:** Not worth it for a caching issue. React makes sense for NEW dashboards, not retrofitting working code.

### Files Modified

1. `RainbowAI/src/index.ts` - Auto-versioning in `getDashboardHtml()`, disabled ETags
2. `RainbowAI/src/public/rainbow-admin.html` - Path-to-hash normalization, meta cache tags
3. `RainbowAI/src/public/js/core/tabs.js` - Path-to-hash normalization, `cache: 'no-store'` on template fetch
4. `RainbowAI/src/public/js/core/utils.js` - `cache: 'no-store'` on all API calls

### Key Lessons

1. **Browser cache is aggressive** - `no-cache` headers aren't enough for sub-resources (JS/CSS) on normal refresh
2. **Content hashing > timestamps** - Vite's approach (hash in filename) is smarter but requires bundler
3. **Auto-versioning works** - `?v=timestamp` is the server-side equivalent of content hashing
4. **Defense in depth** - Multiple anti-cache layers ensure it works across all browsers
5. **One hard refresh needed** - After applying the fix, users need ONE hard refresh to pick up the auto-versioning code

### Quick Reference

**If "Loading..." returns after code changes:**
```bash
# 1. Check auto-versioning is active
curl -s http://localhost:3002/ | grep '?v='

# 2. If missing, restart MCP server
cd RainbowAI && npm run dev

# 3. Do ONE hard refresh in browser
# Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 4. Normal refresh should work forever after that
```

**Resolution:** ✅ Solved with auto-versioned JS/CSS URLs. Normal refresh now works permanently after one-time hard refresh.

---

## Guest Messages Not Showing in Live Simulation + No Auto-Refresh

**Date:** 2026-02-14
**Issue:** Guest (user) messages missing in Live Simulation tab, and new WhatsApp messages don't appear automatically
**Status:** ✅ RESOLVED

---

### Problem Summary

Two related issues in the Live Simulation tab (`#chat-simulator/live-simulation`):
1. Guest messages (white bubbles, left side) not rendered — only bot/AI messages visible
2. New WhatsApp messages don't appear automatically (3-second auto-refresh broken)

Live Chat tab (`#live-chat`) was unaffected — different JS module.

---

### Root Causes (Two Bugs)

#### Bug 1: Temporal Dead Zone (TDZ) in `real-chat.js`

**File:** `RainbowAI/src/public/js/modules/real-chat.js`

The `renderChatView` function used `const msgIndex` **before** its declaration, but only inside the `if (isGuest)` branch. Bot messages skipped the branch and worked fine.

```javascript
// BROKEN: msgIndex used at line 431 (inside if-isGuest)
if (isGuest) {
  footer += '...onclick="openAddToTrainingExampleModal(' + msgIndex + ')"...';
}
// ... 19 lines later ...
// DECLARED at line 450 (too late for guest messages!)
const msgIndex = log.messages.indexOf(msg);
```

**Fix:** Moved `const msgIndex` declaration before its first use.

#### Bug 2: DOM Element Destruction in `renderConversationList`

**File:** `RainbowAI/src/public/js/modules/real-chat.js`

`loadChatSimulator` called `loadRealChat()` **twice** in quick succession:
1. Via `switchSimulatorTab('live-simulation')` (fire-and-forget)
2. Directly with `await loadRealChat()` (awaited)

The first call's `renderConversationList` set `list.innerHTML = ...` which **destroyed** the `<div id="rc-sidebar-empty">` child element. The second call then did `document.getElementById('rc-sidebar-empty')` → returned `null` → crashed on `empty.style.display = 'none'`.

This crash happened inside `loadRealChat`'s `try` block, causing ALL subsequent code to be skipped — including the `setInterval` that sets up the 3-second auto-refresh.

**Chain:** Dual call → element destroyed → null crash → auto-refresh never created → new messages never appear.

**Fix (two parts):**

1. **`renderConversationList`:** Detach `rc-sidebar-empty` before any `innerHTML` operation, then re-attach it afterward:
```javascript
// Detach before innerHTML to prevent destruction
if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
// ... set innerHTML ...
// Re-attach (hidden) so future calls can find it
if (empty) { empty.style.display = 'none'; list.appendChild(empty); }
```

2. **`loadChatSimulator`:** Removed the duplicate `await loadRealChat()` call since `switchSimulatorTab` already invokes it.

---

### Files Changed

| File | Change |
|------|--------|
| `RainbowAI/src/public/js/modules/real-chat.js` | Fixed TDZ bug (moved `const msgIndex`); Fixed element destruction in `renderConversationList` |
| `RainbowAI/src/public/js/legacy-functions.js` | Removed duplicate `loadRealChat()` call from `loadChatSimulator` |

---

### Diagnostic Steps

```bash
# 1. Check for JS errors (the key diagnostic)
agent-browser open http://localhost:3002/#chat-simulator/live-simulation
agent-browser errors
# Look for: "Cannot read properties of null (reading 'style')"
# Or: "Cannot access 'msgIndex' before initialization"

# 2. Count guest vs AI bubbles
agent-browser eval "document.querySelectorAll('.rc-bubble-wrap.guest').length"
# Should be > 0

# 3. Check auto-refresh is alive
agent-browser eval "document.getElementById('rc-last-refresh')?.textContent"
# Should show recent time like "Updated 3s ago", NOT "4m ago"

# 4. Verify by navigating from another tab (the actual failure path)
agent-browser open http://localhost:3002/#dashboard
agent-browser wait 2000
agent-browser eval "window.location.hash = '#chat-simulator/live-simulation'"
agent-browser wait 4000
agent-browser eval "document.querySelectorAll('.rc-bubble-wrap.guest').length + ' guest'"
```

---

### Lessons Learned

1. **Never use `innerHTML` when the container holds persistent elements** — `innerHTML = ...` destroys ALL children, including elements referenced by ID elsewhere. Always detach important children first.
2. **Avoid duplicate async function calls** — When `switchSimulatorTab` already calls `loadRealChat()`, calling it again from `loadChatSimulator` creates race conditions where the first call's DOM changes break the second call.
3. **JavaScript TDZ is silent until the branch executes** — `const` declarations hoisted to block scope but uninitialized. Using them before declaration throws `ReferenceError`, but only when that code path actually runs (guest messages hit the branch, bot messages didn't).
4. **Auto-refresh failures are caused by setup failures** — If `setInterval` is inside a `try` block that crashes before reaching it, the interval is never created. Guard DOM operations with null checks to prevent cascade failures.

---

## Issue: Zeabur 502 Bad Gateway — Service Never Starts

**Date:** 2026-03-09
**Status:** ✅ RESOLVED

### Symptom

`https://pelangi-manager-2.zeabur.app/` returns `502: SERVICE_UNAVAILABLE`.

### Root Causes (Three Issues, Fixed in Order)

#### 1. Wrong start command path

esbuild with two entry points (`server/index.ts` + `vercel-entry.ts`) uses their common ancestor as `outbase`, so `server/index.ts` compiles to `dist/server/index.js` — **not** `dist/index.js`.

Both `zbpack.json` and `package.json` pointed to the wrong path:

```json
// zbpack.json — BEFORE
{ "start_command": "npm start" }
// npm start → node dist/index.js  ← file doesn't exist

// zbpack.json — AFTER
{ "start_command": "node dist/server/index.js" }
```

```json
// package.json — BEFORE
"start": "node dist/index.js",
"start:aws": "cross-env NODE_ENV=production PORT=8080 node dist/index.js",

// package.json — AFTER
"start": "node dist/server/index.js",
"start:aws": "cross-env NODE_ENV=production PORT=8080 node dist/server/index.js",
```

#### 2. Service was SUSPENDED + missing required env vars

Even with the correct start path, the server crashes immediately in production if `SESSION_SECRET` or `DATABASE_URL` are missing — `validateEnv()` calls `process.exit(1)`.

**Required Zeabur env vars:**

| Variable | Why Required |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection — was already set |
| `SESSION_SECRET` | Express session key — **was missing** → `process.exit(1)` |
| `NODE_ENV` | Must be `production` — **was missing** → Vite middleware loaded (crashes without dev deps) |
| `PRODUCTION_URL` | CORS allowlist — **was missing** → assets blocked (see below) |

Set via Zeabur CLI:
```bash
zeabur variable create -k "SESSION_SECRET=<random-hex>" --id <service-id> -y -i=false
zeabur variable create -k "NODE_ENV=production" --id <service-id> -y -i=false
zeabur variable create -k "PRODUCTION_URL=https://pelangi-manager-2.zeabur.app" --id <service-id> -y -i=false
```

Then redeploy:
```bash
zeabur service redeploy --id <service-id> -y -i=false
```

#### 3. CORS blocking `<script type="module">` asset loads → white screen

After fixing #1 and #2, the page returned 200 but showed a white screen. Assets (`/assets/*.js`) returned `500` with `content-type: application/json`.

**Diagnosis:** `{"message":"CORS policy violation"}` = exactly 35 bytes (matching `content-length: 35` in the failed response).

When Vite builds a React SPA, it emits `<script type="module">`. The browser sends `Origin: https://pelangi-manager-2.zeabur.app` with module script requests. The CORS middleware in `server/index.ts` only allows origins in `allowedOrigins`, which is built from `PRODUCTION_URL`, `VERCEL_URL`, and `CORS_ORIGIN` env vars — all unset on Zeabur.

Direct browser navigation (typing the URL) does **not** send an `Origin` header → CORS passes → that's why navigating directly to `/assets/index-*.js` showed the JS content fine, but the page itself couldn't load assets.

**Fix:** Set `PRODUCTION_URL=https://pelangi-manager-2.zeabur.app` in Zeabur env vars and redeploy.

---

### Zeabur CLI Quick Reference

```bash
# List services in current project
zeabur service list

# List env vars for a service
zeabur variable list

# Create env var (non-interactive)
zeabur variable create -k "KEY=VALUE" --id <service-id> -y -i=false

# Redeploy service
zeabur service redeploy --id <service-id> -y -i=false

# Watch deployment status
zeabur deployment list
```

### Zeabur Required Env Vars Checklist

For any new Zeabur deployment of this app:

- [ ] `DATABASE_URL` — Neon Postgres connection string
- [ ] `SESSION_SECRET` — any 48+ char random hex string
- [ ] `NODE_ENV=production` — prevents Vite middleware from loading
- [ ] `PRODUCTION_URL=https://<your-zeabur-domain>.zeabur.app` — allows CORS for same-origin module scripts

### Key Lessons

1. **esbuild outbase is the common ancestor** — with two entry points in different directories, output paths include the directory name (`dist/server/index.js`, not `dist/index.js`)
2. **CORS blocks `<script type="module">` but not direct navigation** — direct URL visits don't send `Origin`; module script loads do. A working health check (`/api/health` → 200) alongside 500 asset errors is the tell
3. **35-byte JSON = CORS error** — `{"message":"CORS policy violation"}` is exactly 35 chars; match against `content-length` to confirm
4. **Service suspension requires manual redeploy** — Zeabur won't auto-restart a suspended service; must use `zeabur service redeploy`
5. **Missing `NODE_ENV=production`** — if absent, `app.get("env")` returns `"development"`, loading Vite middleware which crashes immediately in a production container (no devDependencies installed)

