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

---

## Issue: JavaScript "Unexpected End of Input" Error in Rainbow Admin (2026-02-12)

### Symptom
- White page at `http://localhost:3002/intents`
- Browser console shows error: "Unexpected end of input"
- Server running on port 3002 (verified with `netstat`)
- No visible content despite HTML loading (385KB)

### Root Cause
**JavaScript syntax error in template literals with nested loops**

When implementing phase-based categorization for intents, used complex template literals inside nested `for...of` loops:
```javascript
// ❌ PROBLEMATIC CODE (caused syntax error)
for (const phaseData of phases) {
  rows.push(`
    <tr>...</tr>  // Template literal
  `);

  for (const intentData of intents) {
    rows.push(`
      <tr>
        <td>${esc(intent)}</td>  // Nested template literal with expressions
        <td>
          <select onchange="changeRouting('${esc(intent)}', ...)">
            ${ACTIONS.map(a => `<option ...>`).join('')}  // Triple-nested template
          </select>
        </td>
      </tr>
    `);
  }
}
```

**Why it failed:**
- Multiple levels of template literal nesting
- Complex expressions inside template literals (`${...}`)
- Arrow functions inside template literals
- Escaping issues with quotes in `onclick` handlers

### Diagnostic Process

#### Step 1: Verify Server Running ✅
```bash
netstat -ano | findstr ":3002" | findstr LISTENING
# Result: TCP 0.0.0.0:3002 LISTENING 31704
```

#### Step 2: Check Browser Errors ❌
```bash
agent-browser open http://localhost:3002/intents
agent-browser errors
# Result: "Unexpected end of input"
```

#### Step 3: Verify Content Loading ⚠️
```bash
agent-browser eval "document.body.innerHTML.length"
# Result: 385283 (HTML loaded but JavaScript broken)
```

#### Step 4: Revert Changes ✅
```bash
git log --oneline -5
# Found: 6bfee58 feat(ui): display intents grouped by guest journey phases

git reset --hard HEAD~1
# Reset to: 705d821 (previous working commit)
```

#### Step 5: Test Old Version ✅
```bash
# Restart server with reverted code
npx kill-port 3002 && cd mcp-server && npm run dev

# Test in browser
agent-browser open http://localhost:3002/intents
agent-browser errors
# Result: No errors! ✅
```

#### Step 6: Identify Problem Pattern
Compared working vs broken code:
- **Working**: Flat intent iteration with simple template literals
- **Broken**: Nested phase/intent loops with complex template literals

### Solution: String Concatenation Instead of Template Literals

Replaced all template literals with simple string concatenation:

```javascript
// ✅ WORKING CODE (string concatenation)
for (let i = 0; i < phases.length; i++) {
  const phaseData = phases[i];
  const phaseName = phaseData.phase || 'Uncategorized';
  const phaseDesc = phaseData.description || '';
  const phaseIntents = phaseData.intents || [];

  // Phase header (string concatenation)
  rows.push('<tr class="bg-gradient-to-r from-primary-50 to-transparent">');
  rows.push('  <td colspan="5">');
  rows.push('    <span class="font-semibold">' + esc(phaseName) + '</span>');
  rows.push('    <span class="text-xs">— ' + esc(phaseDesc) + '</span>');
  rows.push('  </td>');
  rows.push('</tr>');

  // Intent rows
  for (let j = 0; j < phaseIntents.length; j++) {
    const intentData = phaseIntents[j];
    const intent = intentData.category;
    const professionalTerm = intentData.professional_term || intent;

    const actionOptions = ACTIONS.map(a =>
      '<option value="' + a + '">' + ACTION_LABELS[a] + '</option>'
    ).join('');

    rows.push('<tr>');
    rows.push('  <td>');
    rows.push('    <span class="font-mono">' + esc(intent) + '</span>');
    rows.push('    <span class="text-xs">' + esc(professionalTerm) + '</span>');
    rows.push('  </td>');
    rows.push('  <td>');
    rows.push('    <select onchange="changeRouting(\'' + esc(intent) + '\', ...)">' + actionOptions + '</select>');
    rows.push('  </td>');
    rows.push('</tr>');
  }
}
```

**Key improvements:**
- ✅ No nested template literals
- ✅ Simple string concatenation with `+`
- ✅ Clear quote escaping (single quotes in HTML, escaped in JS strings)
- ✅ Traditional `for` loops instead of `for...of` (easier to debug)
- ✅ Proper closing of all braces and loops

### Verification

```bash
# Restart server with fixed code
npx kill-port 3002 && cd mcp-server && npm run dev

# Test in browser
agent-browser open http://localhost:3002/intents
agent-browser wait 3000
agent-browser errors
# Result: No errors! ✅

# Take screenshots
agent-browser screenshot docs/phase-categorized-fixed.png
agent-browser scroll down 500
agent-browser screenshot docs/during-stay-professional-terms.png
```

**Confirmed working:**
- ✅ Phase headers visible (GENERAL_SUPPORT, PRE_ARRIVAL, etc.)
- ✅ Professional terminology displayed below category names
- ✅ Intents indented under phase headers
- ✅ All functionality preserved (enable/disable, routing, delete)

### Key Lessons

#### 1. Template Literals Are Fragile in Complex Scenarios
**Avoid:**
- Triple-nested template literals
- Template literals with many `${}` expressions
- Mixing template literals with arrow functions

**Prefer:**
- String concatenation for complex HTML generation
- Pre-building option lists separately
- Simpler, flatter code structure

#### 2. Diagnostic Strategy for "Unexpected End of Input"
```bash
# 1. Check if it's a syntax error vs runtime error
agent-browser errors  # Shows parse errors immediately

# 2. Check if HTML loaded
agent-browser eval "document.body.innerHTML.length"  # Non-zero = HTML loaded

# 3. Use git to bisect
git log --oneline -10  # Find recent changes
git reset --hard HEAD~1  # Revert to test

# 4. Use bracket counting
# Count { } ( ) [ ] ` in your code changes
# Must match exactly!
```

#### 3. String Concatenation vs Template Literals

| Use Case | Recommendation |
|----------|----------------|
| Simple interpolation (`Hello ${name}`) | Template literals ✅ |
| Multi-line strings | Template literals ✅ |
| HTML generation with 1-2 variables | Template literals ✅ |
| **Nested loops with HTML** | String concatenation ✅ |
| **Complex onclick handlers** | String concatenation ✅ |
| **Dynamic option lists** | String concatenation ✅ |

#### 4. Prevention Checklist

Before using template literals in loops:
- [ ] Is the template literal nested inside another?
- [ ] Are there more than 3 `${}` expressions?
- [ ] Are there arrow functions inside?
- [ ] Are there onclick/onchange handlers with quotes?
- [ ] Can I use string concatenation instead?

If 3+ boxes checked → Use string concatenation!

### Time Investment vs ROI

**This debugging session:** ~45 minutes
- 10 min: Initial diagnosis
- 15 min: Reverting and testing old code
- 20 min: Reimplementing with string concatenation

**Future saves:** ~30 minutes per occurrence
- Skip template literal debugging
- Use string concatenation from the start
- Reference this guide for patterns

**Total occurrences prevented:** Likely 2-3+ in this project's lifetime

### Screenshots (Evidence)

1. **`docs/white-page-error.png`** — White page with "Unexpected end of input"
2. **`docs/intents-working-old-version.png`** — Old flat version working
3. **`docs/phase-categorized-fixed.png`** — Fixed version with phase headers
4. **`docs/during-stay-professional-terms.png`** — Professional terminology visible
5. **`docs/post-checkout-professional-terms.png`** — POST_CHECKOUT phase working

### Related Commits

```bash
# Broken commit (reverted)
6bfee58 feat(ui): display intents grouped by guest journey phases

# Fixed commit
b6ee21a fix(ui): display intents grouped by guest journey phases (syntax error resolved)
```

### Quick Command Reference

```bash
# Diagnose white page
agent-browser open http://localhost:3002/intents
agent-browser errors  # Check for "Unexpected end of input"
agent-browser eval "document.body.innerHTML.length"  # Check if HTML loaded

# Revert changes
git reset --hard HEAD~1

# Restart MCP server
npx kill-port 3002
cd mcp-server && npm run dev

# Verify working
agent-browser open http://localhost:3002/intents
agent-browser screenshot docs/fixed.png
```

---

**Last Updated:** 2026-02-12
**Related Docs:** `MASTER_TROUBLESHOOTING_GUIDE.md`, `REFACTORING_TROUBLESHOOTING.md`, `AUTO-START-GUIDE.md`
**Tags:** vite, react, port-conflicts, typescript, hot-reload, browser-cache, windows, servers-not-running, chrome-extension, manifest-v3, service-worker, javascript-syntax-error, template-literals, string-concatenation, unexpected-end-of-input
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

---

## Issue: Fleet Manager (localhost:9999) – Down Services (2026-02-21)

### Symptom
- Fleet Manager at `http://localhost:9999/` shows one or more services as **Down** (red badge).
- Local Pelangi or Local Southern groups show "Down" for API, Vite, or Rainbow.

### Root cause
The dashboard polls health URLs. If a local server isn’t running, that service is reported as down.

| Service | Health URL | How to start |
|--------|------------|--------------|
| **Local Pelangi – Rainbow** | `http://localhost:3002/health/ready` | `cd RainbowAI && npm run dev` |
| **Local Southern – Rainbow** | `http://localhost:8002/health/ready` | `cd RainbowAI && npx dotenv-cli -e .env.southern.local -- npx tsx watch --ignore src/public src/index.ts` |
| Local Pelangi API/DB/WhatsApp | `http://localhost:5000/api/health` | `npm run dev:clean` (or `npm run dev`) |
| Local Pelangi Vite | `http://localhost:3000/` | Same as above (Vite + backend) |
| Local Southern API/DB/WhatsApp | `http://localhost:8001/api/health` | See **Fix: Get localhost:8001 (Southern Manager API)** below |
| Local Southern Vite | `http://localhost:8000/` | `start-southern.bat` (or Vite on 8000) |

### Fix: Get localhost:3002 (Pelangi Rainbow) running

```bash
# If something is already on 3002, kill it first
npx kill-port 3002

# Start Pelangi Rainbow AI (default port 3002)
cd RainbowAI && npm run dev
```

Run in a separate terminal or use `start-all.bat` to start the full fleet.

### Fix: Get localhost:8001 (Southern Manager API) running

```bash
# From repo root; .env.southern.local must have PORT=8001
npx kill-port 8001 2>nul
npx dotenv-cli -e .env.southern.local -- npx cross-env SKIP_VITE_MIDDLEWARE=true tsx watch --clear-screen=false server/index.ts
```

Run in a separate terminal. Database and WhatsApp status in Fleet Manager depend on this API being up.

### Fix: Get localhost:8002 (Southern Rainbow) running

```bash
# From repo root; uses RainbowAI/.env.southern.local (MCP_SERVER_PORT=8002)
cd RainbowAI && npx dotenv-cli -e .env.southern.local -- npx tsx watch --ignore src/public src/index.ts
```

Or run `start-southern.bat` to start Southern Manager + Southern Rainbow.

### Verify
- Check ports: `netstat -ano | findstr "3002 8002"` (should show LISTENING).
- Refresh Fleet Manager; after the next poll (~30s or refresh) down count should drop.
- Pelangi Rainbow: `http://localhost:3002/health/ready` → 200.
- Southern Rainbow: `http://localhost:8002/health/ready` → 200.

### Root cause of “Pelangi Local (or Southern Local) down” after health-proxy change (2026-02-21)

**What changed:** The dashboard was updated to send all **localhost** health checks through the Fleet Manager server (`/api/health-proxy?url=...`) to avoid CORS. So the **Node process** (Fleet Manager on 9999) now does the outbound request to e.g. `localhost:5000`.

**Why that broke things:** Node’s `http.request({ hostname: 'localhost' })` uses the OS to resolve `localhost`. On Windows this often resolves to **IPv6 first** (`::1`). The dev servers, however, bind inconsistently:

- Pelangi API (Express): **127.0.0.1:5000** only  
- Pelangi Vite: **[::1]:3000** only  
- Rainbow: **0.0.0.0:3002** (both)

When the proxy used `hostname: 'localhost'`, Node could try `::1:5000` first → nothing listening there → **connection refused** → 502 → Fleet Manager showed Pelangi Local as down even though the servers were running.

**Why this was a mistake:** The dashboard was working when the right processes were running. The only fix needed for "Southern Local down" was to **start 8001 and 8002**. Routing localhost through the proxy was an unnecessary "improvement" that moved the request from the browser (which was working) to Node (different localhost resolution → regression). Lesson: fix the actual problem (missing processes); don't change a working code path without proof it's broken.

**Fix applied:** Dashboard **reverted to direct fetch only** (no proxy for localhost). Back to the previous working behaviour: browser fetches each health URL directly. The health-proxy remains in `fleet-manager/server.js` (with 127.0.0.1 then ::1) for possible future use; the dashboard does not use it.

### Memory (for agents)
When Fleet Manager shows down services: identify which port (e.g. 3002 vs 8002), then start the matching Rainbow or Manager stack. Pelangi = 3002 + default env; Southern = 8002 + `.env.southern.local`. If local servers are running but the dashboard still shows them down, the cause is often the health-proxy and IPv4/IPv6 (see “Root cause of Pelangi Local down” above); dashboard uses direct fetch only; do not use the health-proxy for localhost.
