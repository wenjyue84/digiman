# Quick Fix Guide - Common Issues

## Issue: Rainbow Admin UI Changes Not Visible

**Date:** 2026-02-11
**Status:** ✅ RESOLVED

### Symptom
- Made changes to Rainbow admin HTML (`mcp-server/src/public/rainbow-admin.html`)
- Restarted MCP server on port 3002
- Browser shows "Redirecting..." or changes not visible
- Hard refresh doesn't help

### Root Causes
1. **Too Subtle Visual Elements** - 1px gray separators invisible against white background
2. **Browser Cache** - Cached HTML from previous version
3. **Port Confusion** - Accessing through React redirect (port 3000) instead of direct (port 3002)
4. **Server Restart Needed** - MCP server serves static HTML, needs restart for changes

### Solution

#### 1. Access Direct URL (FASTEST)
Don't access through React redirect. Go directly to:
```
http://localhost:3002/admin/rainbow
```
**Not:** `http://localhost:3000/admin/rainbow` (this redirects, adds delay)

#### 2. Make Visual Elements Prominent
For UI separators/dividers, ensure they're visible:

**Before (invisible):**
```html
<div class="h-8 w-px bg-neutral-200 self-center mx-2"></div>
```
- 1px wide (w-px) - too thin
- neutral-200 - too light gray
- h-8 (32px) - too short
- mx-2 (8px) - not enough spacing

**After (visible):**
```html
<div class="h-10 w-0.5 bg-neutral-400 self-center mx-3 rounded-full"></div>
```
- 2px wide (w-0.5) - clearly visible
- neutral-400 - darker gray
- h-10 (40px) - taller
- mx-3 (12px) - more spacing
- rounded-full - smooth rounded ends

#### 3. Restart MCP Server & Clear Cache
```bash
# Kill and restart MCP server
npx kill-port 3002
cd mcp-server && npm run dev

# In browser: Hard refresh
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Verification
After fix, you should see **clear vertical separators** between tab groups:
- Status | Intent & Routing | Response Management | Testing & Preview | Utilities

### The Real Solution: Visible Text Labels

**Problem:** User wanted to see **group labels** like "Intent & Routing", not just separator lines!

**Final Solution:**
Restructured tabs into grouped sections with visible labels above each group:

```html
<div class="flex flex-col items-center gap-0 border-l-2 border-primary-200 pl-3 pr-2">
  <span class="text-[10px] font-semibold text-primary-600 uppercase tracking-wide mb-0.5">Intent & Routing</span>
  <div class="flex gap-0">
    <button>Classify Intent</button>
    <button>Intents & Routing</button>
  </div>
</div>
```

**Result:**
- ✅ Visible colored labels: "INTENT & ROUTING", "RESPONSE MANAGEMENT", "TESTING & PREVIEW", "UTILITIES"
- ✅ Colored left borders (blue, green, orange, gray)
- ✅ Clear visual grouping
- ✅ Screenshot: `rainbow-with-labels.png`

### Evolution: Dropdown Navigation (2026-02-11)

**Problem:** Horizontal scrolling needed when all tabs displayed inline.

**Solution:** Converted to dropdown menus for compact navigation.

**Implementation:**
```html
<div class="relative">
  <button onclick="toggleDropdown('intent-dropdown')" class="flex items-center gap-2">
    Intent & Routing
    <svg><!-- dropdown arrow --></svg>
  </button>
  <div id="intent-dropdown" class="hidden absolute top-full">
    <button data-tab="intent-manager">Classify Intent</button>
    <button data-tab="intents">Intents & Routing</button>
  </div>
</div>
```

**JavaScript:**
```javascript
function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  const isHidden = dropdown.classList.contains('hidden');
  closeAllDropdowns();
  if (isHidden) dropdown.classList.remove('hidden');
}
```

**Result:**
- ✅ Compact single-row navigation
- ✅ NO horizontal scrolling
- ✅ Colored dropdown buttons (blue, green, orange, gray)
- ✅ Click to reveal sub-options
- ✅ Screenshot: `rainbow-dropdown-nav.png`

### Key Lessons
1. **Ask for clarification** - "Visual separators" could mean lines OR labels
2. **Use browser automation** - agent-browser revealed what was actually rendered
3. **Visual elements must be prominent** - Subtle lines (1px, 2px, 4px) were all invisible
4. **Text labels work best** - Visible text is clearer than visual dividers
5. **Test visibility** - What looks good in code might be invisible in browser
6. **Direct access faster** - Skip React redirect, go straight to port 3002
7. **Static HTML needs server restart** - Unlike React hot reload, HTML changes require restart

---

# Quick Fix Guide - Common Issues

## Issue: React Changes Not Showing Up in Browser

### Symptom
- Made changes to React/TypeScript files (e.g., `client/src/pages/*.tsx`)
- Changes are saved and visible in code editor
- Browser still shows old version after refresh
- Even hard refresh (Ctrl+Shift+R) doesn't work

### Root Causes
1. **Vite cache** - Dev server caching old compiled versions
2. **Port conflicts** - Multiple dev servers running, browser pointing to wrong one
3. **Browser cache** - Browser serving cached assets
4. **Windows port locking** - Processes holding onto ports even after kill

### Diagnostic Steps

```bash
# 1. Check which ports are actually in use
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":3002"

# 2. Check dev server logs to see which port Vite is using
# Look for line: "Local: http://localhost:XXXX/"

# 3. Verify you're accessing the correct port in browser
# If Vite says port 3003, but you're on 3000, you'll see old version!
```

### Solutions (in order of speed)

#### Solution 1: Access Correct Port (FASTEST - 10 seconds)
If Vite started on a different port due to conflicts:

1. Check dev server logs for actual port (e.g., 3003)
2. Navigate to `http://localhost:XXXX/` (use actual port)
3. Hard refresh: `Ctrl + Shift + R` or `Ctrl + F5`

**Why it works:** You're now accessing the actual running server, not a stale one.

#### Solution 2: Clean Restart (RECOMMENDED - 30 seconds)

```bash
# Kill all ports
npx kill-port 3000 3001 3002 3003 5000

# Clear Vite cache
cd client && rm -rf node_modules/.vite && cd ..

# Restart dev servers
npm run dev

# In browser: Hard refresh (Ctrl + Shift + R)
```

**Why it works:** Kills all conflicting processes, clears cache, starts fresh.

#### Solution 3: Manual Process Kill (if Solution 2 fails)

```bash
# Find process IDs using the ports
netstat -ano | findstr ":3000" | findstr LISTENING

# Kill each process (replace XXXXX with actual PID)
taskkill //F //PID XXXXX //T
```

**Why it works:** Directly terminates stubborn processes.

#### Solution 4: IDE/Terminal Restart (NUCLEAR - 2 minutes)

1. Close VS Code, Cursor, or terminal completely
2. Reopen IDE
3. Run `npm run dev:clean`
4. Hard refresh browser

**Why it works:** IDEs spawn protected processes; closing IDE releases them.

#### Solution 5: System Restart (LAST RESORT)

If nothing else works, restart Windows. Guaranteed to release all ports.

### Windows-Specific Gotchas

1. **Protected processes:** Node processes spawned by IDEs are protected from `kill-port`
2. **Port release delay:** Windows TCP/IP stack may hold ports for 30-120 seconds after process dies
3. **Nested processes:** `npm run dev` → `concurrently` → `vite` creates process trees; killing parent doesn't always kill children
4. **Access denied errors:** Even with `//F` flag, `taskkill` may fail on IDE-spawned processes

### Prevention Tips

1. **Always use `npm run dev:clean`** instead of `npm run dev` (kills ports first)
2. **Check logs immediately** after starting dev server to confirm port
3. **Bookmark multiple ports** in browser: 3000, 3001, 3002, 3003
4. **Use browser dev tools** (F12) → Network tab → Disable cache (checkbox)
5. **Close dev servers properly** (Ctrl+C) instead of closing terminal

### Quick Reference Commands

```bash
# Clean start (use this by default)
npm run dev:clean

# Kill all common ports
npx kill-port 3000 3001 3002 3003 5000

# Clear Vite cache only
rm -rf client/node_modules/.vite

# Find what's using a port
netstat -ano | findstr ":3000"

# Force kill a process (replace PID)
taskkill //F //PID XXXXX //T

# Check running node processes
tasklist | findstr node.exe
```

### Real Example (2025-02-11)

**Scenario:** Added sequence numbering to Knowledge Base UI

**Problem:**
- Code changes made to `client/src/pages/admin-rainbow-kb.tsx`
- Browser at `http://localhost:3000/admin/rainbow/kb` showed old version
- Even after multiple refreshes

**Diagnosis:**
- Ran `npx kill-port 3000` but ports were still occupied
- Dev server logs showed: `Port 3000 is in use, trying another one...`
- Vite actually started on **port 3003**
- User was looking at port 3000 (old cached server)

**Solution:**
1. Navigate to `http://localhost:3003/admin/rainbow/kb`
2. Hard refresh: `Ctrl + Shift + R`
3. ✅ Sequence numbers appeared immediately!

**Lesson:** Always check dev server logs to see which port Vite actually used!

---

## Other Common Issues

### Issue: TypeScript errors but code looks correct

**Symptom:** Red squiggles, but logic is sound

**Solution:**
1. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Check `tsconfig.json` paths are correct
3. Run `npm run check` to see actual errors

### Issue: "Module not found" after installing package

**Solution:**
```bash
# Restart dev server
npm run dev:clean

# If still fails, reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Hot reload stopped working

**Solution:**
1. Check if file is outside `client/src/` or `server/` (Vite only watches these)
2. Restart dev server: `npm run dev:clean`
3. Clear browser cache: Hard refresh

---

---

## DETAILED CASE STUDY: Sequence Numbering Not Showing (2025-02-11)

### The Problem
User added sequence numbering feature to Knowledge Base UI (`admin-rainbow-kb.tsx`) but couldn't see the changes in browser even after multiple refreshes.

### Initial Changes Made
```typescript
// Added sequence field to KB_FILES array
{
  id: "AGENTS.md",
  name: "AGENTS.md",
  sequence: 1,  // NEW
  icon: Sparkles,
  // ...
}

// Updated FileListItem to display sequence
<div className="font-medium text-sm">
  <span className="text-gray-400 mr-2">[{file.sequence}]</span>
  {file.name}
</div>
```

### Troubleshooting Timeline

#### Step 1: Verify Code Changes Saved ✅
```bash
# Read the file to confirm changes exist
cat client/src/pages/admin-rainbow-kb.tsx | grep "sequence:"
# Result: Code was correctly saved with sequence: 1, 2, 3, etc.
```

**Learning:** Always verify changes are actually saved before troubleshooting browser/server issues.

#### Step 2: Kill Ports and Restart Dev Server ❌
```bash
npx kill-port 3000 5000
rm -rf client/node_modules/.vite  # Clear Vite cache
npm run dev
```

**Problem:** Dev server logs showed:
```
Port 3000 is in use, trying another one...
Port 3001 is in use, trying another one...
Port 3002 is in use, trying another one...
Local: http://localhost:3003/
```

**Root Cause #1:** Windows was still holding ports 3000-3002 even after `kill-port`. Vite started on port **3003** instead.

**Learning:** Always check dev server logs to see which port Vite ACTUALLY used!

#### Step 3: User Still Can't See Changes ❌
User reported still seeing old version without sequence numbers.

**Question Asked:** "Which port are you viewing?"
**Likely Answer:** User was still on `localhost:3000` (old cached server)

**Root Cause #2:** Browser was pointed at wrong port (3000 instead of 3003).

#### Step 4: Check TypeScript Compilation ⚠️
```bash
cd client && npx tsc --noEmit
```

**Found Error:**
```
src/pages/admin-rainbow-kb.tsx(290,11): error TS18047:
'selectedFile' is possibly 'null'.
```

**Root Cause #3:** TypeScript error on line 290:
```typescript
// BEFORE (error)
const memoryFileDisplay = isMemoryFile ? {
  name: selectedFile.replace('memory/', ''),  // selectedFile might be null!
  // ...
} : null;

// AFTER (fixed)
const memoryFileDisplay = isMemoryFile && selectedFile ? {
  name: selectedFile.replace('memory/', ''),
  // ...
} : null;
```

**Learning:** TypeScript errors can prevent Vite from compiling changes properly, even in dev mode.

#### Step 5: Vite Auto-Recompiled ✅
After fixing TypeScript error, checked dev server logs:
```
[vite] page reload src/pages/admin-rainbow-kb.tsx
```

**Success:** Vite detected the fix and automatically recompiled!

### Final Solution

1. **Navigate to correct port:** `http://localhost:3003/admin/rainbow/kb`
2. **Hard refresh:** `Ctrl + Shift + R`
3. **Result:** Sequence numbers `[1]`, `[2]`, `[3]` appeared! ✅

### Key Lessons Learned

| Issue | Symptom | Diagnostic | Solution |
|-------|---------|------------|----------|
| **Wrong port** | Changes not showing | Check logs: "Local: http://localhost:XXXX/" | Navigate to actual port Vite is using |
| **Port conflicts** | Vite using 3003 instead of 3000 | `netstat -ano \| findstr ":3000"` | Kill all ports, restart, OR just use 3003 |
| **TypeScript errors** | Compilation blocked | `npx tsc --noEmit` | Fix type errors, Vite auto-recompiles |
| **Browser cache** | Still seeing old version | Hard refresh not working | Try incognito mode or DevTools "Disable cache" |
| **Windows port locking** | Ports held after kill | `taskkill //F //PID` fails with "Access denied" | Close IDE completely, or restart Windows |

### Command Sequence for Future Reference

```bash
# 1. Make code changes
# 2. Kill ports thoroughly
npx kill-port 3000 3001 3002 3003 5000

# 3. Clear Vite cache
cd client && rm -rf node_modules/.vite && cd ..

# 4. Restart dev server
npm run dev

# 5. Check logs for actual port
# Look for: "Local: http://localhost:XXXX/"

# 6. Check TypeScript compilation
cd client && npx tsc --noEmit

# 7. If TypeScript errors, fix them
# Vite will auto-recompile on save

# 8. Navigate to correct port in browser
# Use the port from step 5, NOT assumed port 3000!

# 9. Hard refresh browser
# Ctrl + Shift + R (or Ctrl + F5)

# 10. If still not working, try incognito mode
# Ctrl + Shift + N (Chrome)
```

### Prevention Checklist

Before saying "changes aren't showing":

- [ ] Verified code changes are saved in file
- [ ] Checked dev server logs for actual port
- [ ] Navigated to correct port (not assumed 3000)
- [ ] Did hard refresh (Ctrl + Shift + R)
- [ ] Checked TypeScript compilation (`npx tsc --noEmit`)
- [ ] Checked browser DevTools Console for errors
- [ ] Tried incognito mode to rule out browser cache
- [ ] Checked Vite logs for "[vite] page reload" message

### Time Spent vs. Time Saved

**This debugging session:** ~15 minutes
**Time saved next time:** ~10 minutes (by following checklist)
**Total occurrences so far:** 3+ times in this project
**ROI:** This documentation pays for itself after 2 uses

---

---

## Issue: Pages Show Empty/Connection Refused (2026-02-12)

### Symptom
- Navigate to `http://localhost:3002/admin/rainbow/settings` → Connection refused
- Navigate to `http://localhost:3000/dashboard` → Empty page or connection refused
- Browser shows "ERR_CONNECTION_REFUSED" or blank white page

### Root Cause
**Servers not running!** The most common reason for "empty pages" is forgetting to start the dev servers.

### Diagnostic Steps
```bash
# 1. Check which ports are actually listening
netstat -ano | findstr ":3000 :3002 :5000" | findstr LISTENING

# If output is empty → servers aren't running!
```

### Solution: Start the Servers

#### Quick Start (Recommended)
```bash
# Start main app servers (frontend 3000 + backend 5000)
npm run dev

# Start MCP server (port 3002) in separate terminal
cd mcp-server && npm run dev
```

#### Background Start (Alternative)
```bash
# Start both in background
npm run dev &
cd mcp-server && npm run dev &

# Wait 5-8 seconds for servers to initialize
sleep 8

# Check they're running
netstat -ano | findstr ":3000 :3002 :5000"
```

### Verification
After starting servers, you should see:
- Frontend: `http://localhost:3000/dashboard` → Guest cards visible
- MCP Server: `http://localhost:3002/admin/rainbow/settings` → AI settings page

### Screenshots (Confirmed Working)
- ✅ `docs/rainbow-settings-working.png` - Settings page loaded
- ✅ `docs/dashboard-working.png` - Dashboard with 16 guests

### Key Lessons
1. **Always check if servers are running FIRST** before debugging CSS/JavaScript issues
2. **Don't assume servers auto-start** - they don't persist across terminal sessions
3. **Wait 5-8 seconds** after starting servers before testing (especially MCP server)
4. **Use `netstat` to verify** which ports are actually listening
5. **MCP server needs separate start** - `npm run dev` only starts frontend + backend

### Prevention
Add to your startup checklist:
```bash
# Daily startup routine
cd /path/to/PelangiManager-Zeabur
npm run dev:clean          # Kills ports + starts frontend/backend
cd mcp-server && npm run dev  # Start MCP server

# Verify all running
netstat -ano | findstr ":3000 :3002 :5000" | findstr LISTENING
```

---

## Issue: Browser Extension Won't Load (2026-02-12)

### Symptom
- Chrome extension shows "Failed to load extension" error
- Error: "Could not load icon 'icon16.png' specified in 'icons'"
- Service worker registration failed (Status code: 15)
- Error: "Cannot read properties of undefined (reading 'onErrorOccurred')"

### Root Causes
1. **Missing icon files** - manifest.json references icons that don't exist
2. **Missing permissions** - `webNavigation` permission not declared in manifest
3. **Service worker errors** - background.js tries to use missing icons and APIs without permission

### Solutions

#### Fix 1: Remove Icon References
If you don't have icon files, remove icon references from `manifest.json`:

**Before (causing error):**
```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

**After (fixed):**
```json
{
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### Fix 2: Remove Icon Usage in background.js
If background.js tries to use icons in notifications:

**Before (causing error):**
```javascript
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icon48.png',  // ❌ File doesn't exist
  title: 'Server Not Running',
  message: 'Click to start'
});
```

**After (fixed):**
```javascript
console.log('[Extension] Connection refused detected:', details.url);
// Removed notification - content script handles UI instead
```

#### Fix 3: Add Missing Permissions
Add `webNavigation` permission to `manifest.json`:

**Before (causing "undefined" error):**
```json
{
  "permissions": [
    "webRequest",
    "activeTab"
  ]
}
```

**After (fixed):**
```json
{
  "permissions": [
    "webRequest",
    "webNavigation",  // ✅ Added for chrome.webNavigation API
    "activeTab"
  ]
}
```

### Reload Extension After Fixing
1. Go to `chrome://extensions/`
2. Find your extension
3. Click the **refresh icon** ↻ (circular arrow)
4. Should load without errors now
5. Service worker should show as "active"

### Verification
Extension is working when:
- ✅ No errors in `chrome://extensions/`
- ✅ Service worker shows "Inspect views: service worker"
- ✅ Visit `localhost:3000` when server is down → Purple button appears

### Key Lessons
1. **Icons are optional** - Remove references if you don't have icon files
2. **Check permissions** - Every Chrome API needs explicit permission in manifest
3. **Reload extension** - Click refresh icon after manifest.json changes
4. **Service worker errors** - Check background.js isn't using missing resources
5. **Manifest v3** - Stricter validation than v2, catches missing files immediately

### Prevention
When creating Chrome extensions:
- Either create all referenced icons OR remove icon references
- Check Chrome API docs for required permissions
- Test manifest.json with Chrome's extension validator
- Use console in background service worker to debug (Inspect views → service worker)

### Related Files
- `browser-extension/manifest.json` - Extension config
- `browser-extension/background.js` - Service worker
- `browser-extension/content.js` - Page injection script
- `AUTO-START-GUIDE.md` - Full setup guide

---

**Last Updated:** 2026-02-12
**Related Docs:** `MASTER_TROUBLESHOOTING_GUIDE.md`, `REFACTORING_TROUBLESHOOTING.md`, `AUTO-START-GUIDE.md`
**Tags:** vite, react, port-conflicts, typescript, hot-reload, browser-cache, windows, servers-not-running, chrome-extension, manifest-v3, service-worker
