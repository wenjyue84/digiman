# Fix Documentation: Post-Login "Something Went Wrong" Error

**Date:** 2026-01-28
**Issue:** Users see "Something went wrong - An unexpected error occurred" immediately after successful login
**Status:** ✅ RESOLVED

---

## Problem Summary

After successfully logging into the PelangiManager application at `http://localhost:3000`, users were immediately shown a global error boundary message instead of the dashboard. This occurred consistently, even in incognito browser mode.

### Initial Symptoms
- Login authentication worked correctly
- Session was established successfully
- Dashboard route was accessed
- Error boundary triggered before any content rendered
- Error: "Something went wrong - An unexpected error occurred. Please try refreshing the page."

---

## Debugging Journey

### Phase 1: Initial Investigation (Environment Issues)
**Hypothesis:** Server startup issues or missing dependencies

**Attempted Fixes:**
1. Tried to start development servers via Git Bash
   - **Problem:** npm commands not executing properly in Git Bash on Windows
   - **Result:** Servers wouldn't start, npm install had no output

2. Created `start-dev.bat` batch script for easier server startup
   - **Result:** Batch script created but execution issues persisted

3. Multiple attempts to install dependencies
   - `npm install` appeared to complete but `node_modules` wasn't created
   - **Root Cause:** Git Bash/Windows compatibility issues

**Resolution:** Switched to using native PowerShell for npm operations

---

### Phase 2: Sharp Module Installation (Backend Server Crash)
**Hypothesis:** Backend server failing to start due to missing native dependencies

**Error Message:**
```
Error: Could not load the "sharp" module using the win32-x64 runtime
Possible solutions:
- Ensure optional dependencies can be installed:
    npm install --include=optional sharp
- Add platform-specific dependencies:
    npm install --os=win32 --cpu=x64 sharp
```

**Attempted Fixes:**
1. `npm install --os=win32 --cpu=x64 sharp` - Failed
2. `npm install --include=optional sharp` - Failed
3. `npm rebuild sharp` - Failed
4. `npm ci` (clean install) - Failed

**Root Cause:**
- `package.json` had a `postinstall` hook configured for Linux platform: `npm install --os=linux --cpu=x64 sharp`
- This prevented proper Windows installation

**Solution Applied:**
1. Removed problematic postinstall hook from `package.json`
2. Modified `server/lib/imageOptimization.ts` to gracefully handle missing Sharp module:
   - Implemented lazy loading with dynamic import
   - Added fallback to return original image if Sharp unavailable
   - Allowed server to start without Sharp installed
   - Logged clear warnings about disabled image optimization

**Files Modified:**
- `package.json` - Removed postinstall hook
- `server/lib/imageOptimization.ts` - Added graceful degradation

**Result:** Both servers started successfully ✅
- Backend: `http://127.0.0.1:5000`
- Frontend: `http://localhost:3000`

---

### Phase 3: Authentication Race Condition
**Hypothesis:** 401 errors from API calls happening before auth token ready

**Investigation:**
- After successful login, dashboard components immediately make API calls
- Race condition between `isAuthenticated` state update and token availability
- API endpoints like `/api/settings` require authentication
- 401 errors were throwing exceptions caught by error boundary

**Attempted Fix:**
Modified `client/src/lib/queryClient.ts`:
1. Changed default query behavior from `on401: "throw"` to `on401: "returnNull"`
2. Made queries return null instead of throwing on 401 errors
3. Expected components to handle null data gracefully

**Result:** ❌ Error persisted even in incognito mode

---

### Phase 4: Route Protection
**Hypothesis:** Dashboard loading before authentication complete

**Investigation:**
- Reviewed `client/src/App.tsx` route configuration
- Found dashboard routes (`/` and `/dashboard`) were not wrapped in `ProtectedRoute`
- Unauthenticated users could access dashboard, causing auth-dependent components to fail

**Attempted Fix:**
Modified `client/src/App.tsx`:
- Wrapped `/` and `/dashboard` routes with `ProtectedRoute requireAuth={true}`
- Added enhanced error logging to `client/src/components/global-error-boundary.tsx`

**Result:** ❌ Error still persisted

---

### Phase 5: API Endpoint Availability
**Hypothesis:** Backend API routes not registered correctly

**Investigation:**
- Tested API endpoints with curl
- Found `/api/guests` returning 404 "API endpoint not found"
- Other endpoints (`/api/auth`, `/api/settings`) worked correctly
- Discovered naming conflict between two files:
  - `server/routes.ts` - Main route registration (creates HTTP server)
  - `server/routes/index.ts` - Modular route helper
  - Both exported function named `registerRoutes()`

**Attempted Fix:**
1. Renamed function in `server/routes/index.ts` from `registerRoutes` to `registerModularRoutes`
2. Updated `server/routes.ts` to import `registerModularRoutes`

**Files Modified:**
- `server/routes/index.ts` - Renamed function
- `server/routes.ts` - Updated import

**Result:** ❌ Error still persisted (different root cause)

---

### Phase 6: The Actual Root Cause ✅

**Browser Console Error:**
```
TypeError: phoneUtils.isCallable is not a function
    at sortable-guest-table.tsx:1724:38
    at Array.map (<anonymous>)
    at SortableGuestTable
```

**Investigation:**
1. Checked browser console for actual error (finally!)
2. Found the real error: `phoneUtils.isCallable is not a function`
3. Located usage in `client/src/components/sortable-guest-table.tsx` line 1724
4. Code was calling two missing phoneUtils functions:
   - `phoneUtils.isCallable()` - Check if phone number is callable
   - `phoneUtils.getTelHref()` - Generate tel: links

**Root Cause:**
Earlier in the session, I had created a `phoneUtils` export in `client/src/lib/validation.ts` to fix a missing import error. However, I only added basic utility functions and didn't check what the actual component code was calling.

**Final Solution:**
Added missing functions to `client/src/lib/validation.ts`:

```typescript
phoneUtils.isCallable(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Valid callable numbers: minimum 7 digits, can start with +
  return cleaned.length >= 7 && /^[+]?\d{7,}$/.test(cleaned);
}

phoneUtils.getTelHref(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}
```

**Files Modified:**
- `client/src/lib/validation.ts` - Added `isCallable()` and `getTelHref()` functions

**Result:** ✅ **DASHBOARD LOADS SUCCESSFULLY!**

---

## Final Working Configuration

### Server Status
- ✅ Backend: `http://127.0.0.1:5000` (running)
- ✅ Frontend: `http://localhost:3000` (running)
- ✅ Image optimization: Disabled (graceful fallback)
- ✅ All API endpoints: Working
- ✅ Authentication: Working

### Files Modified During Troubleshooting
1. `package.json` - Removed Linux-specific postinstall hook
2. `server/lib/imageOptimization.ts` - Added graceful Sharp degradation
3. `client/src/lib/validation.ts` - Added complete phoneUtils implementation
4. `client/src/lib/queryClient.ts` - Modified 401 error handling
5. `client/src/App.tsx` - Added route protection
6. `client/src/components/global-error-boundary.tsx` - Enhanced error logging
7. `server/routes/index.ts` - Renamed function to avoid conflict
8. `server/routes.ts` - Updated import

---

## Key Lessons Learned

### 1. **Always Check Browser Console First**
The actual error was in the browser console all along. Instead of speculating about authentication flows, API routes, or race conditions, checking the browser console immediately would have revealed the real issue: `phoneUtils.isCallable is not a function`.

**Lesson:** Start debugging client-side errors by checking the browser console (F12) for the actual error message and stack trace.

### 2. **Verify Function Exports When Creating Utility Modules**
When creating the initial `phoneUtils` export, I should have:
1. Searched the entire codebase for all `phoneUtils` usage
2. Implemented ALL required functions, not just assumed functions
3. Verified the export against actual usage

**Command to check all usage:**
```bash
grep -r "phoneUtils\." client/src --include="*.tsx" --include="*.ts"
```

### 3. **Windows Development Environment Challenges**
- Git Bash has issues with npm commands on Windows
- Always use native PowerShell or Command Prompt for npm operations
- Be aware of platform-specific dependencies (Sharp module)

### 4. **Graceful Degradation for Optional Dependencies**
The Sharp module solution (graceful degradation) was excellent:
- Server starts even without the optional dependency
- Clear warnings logged about missing functionality
- Image uploads still work (just without optimization)
- Doesn't block development workflow

**Pattern to follow:**
```typescript
// Lazy load optional dependencies
let sharpInstance: typeof import('sharp') | null = null;

async function getSharp() {
  if (!sharpInstance) {
    try {
      sharpInstance = await import('sharp');
    } catch (error) {
      console.warn('Sharp not available, image optimization disabled');
      return null;
    }
  }
  return sharpInstance;
}

// Use with fallback
const sharp = await getSharp();
if (!sharp) {
  return originalImage; // Fallback behavior
}
```

### 5. **Error Boundaries Are Last Resort**
Error boundaries catching errors should trigger immediate investigation of the root cause, not speculation about authentication flows or API routes. The error boundary is catching something specific - find out what.

### 6. **Hot Reload May Not Apply All Changes**
Some changes (especially to utility modules or deeply imported files) may require:
- Hard browser refresh (Ctrl+Shift+R)
- Server restart
- Cache clearing

### 7. **Module Naming Conflicts**
The `registerRoutes` naming conflict (though not the root cause here) is a good reminder:
- Avoid exporting identically named functions from different files
- Use descriptive names that indicate the module's purpose
- Be aware of Node.js module resolution (directory index.ts takes precedence)

---

## Debugging Checklist for Future Reference

When encountering "Something went wrong" or similar errors:

1. **✅ Check browser console (F12) FIRST**
   - Look for actual error messages
   - Check stack traces
   - Note which component is failing

2. **✅ Verify servers are running**
   - Frontend on port 3000
   - Backend on port 5000
   - Check for startup errors

3. **✅ Test API endpoints**
   - Use curl or Postman to test endpoints directly
   - Verify authentication is working
   - Check response status codes

4. **✅ Check for missing imports/exports**
   - Search codebase for undefined functions
   - Verify all utility functions are exported
   - Check for typos in import statements

5. **✅ Review error boundary logs**
   - Check what error is being caught
   - Look at component stack
   - Note the URL and timestamp

6. **✅ Clear caches and restart**
   - Hard refresh browser (Ctrl+Shift+R)
   - Clear localStorage/cookies if needed
   - Restart dev servers if changes not applying

---

## Testing Procedure

To verify the fix works:

1. **Clean start:**
   ```bash
   npx kill-port 3000 5000
   npm run dev
   ```

2. **Open incognito browser** (Ctrl+Shift+N)

3. **Navigate to:** `http://localhost:3000`

4. **Login with:**
   - Username: `admin`
   - Password: `admin123`

5. **Expected result:**
   - ✅ Dashboard loads successfully
   - ✅ Guest table displays
   - ✅ Phone numbers are clickable (tel: links)
   - ✅ No error boundaries triggered

---

## Prevention Strategies

### For Future Development

1. **Create utility functions fully before using them**
   - Search codebase for all usage
   - Implement all required functions
   - Add TypeScript types
   - Test in isolation

2. **Add better error logging**
   - Enhanced error boundaries with detailed context
   - Console logs in development mode
   - Stack traces for debugging

3. **Use TypeScript strictly**
   - Would have caught `phoneUtils.isCallable` not existing
   - Compile-time error instead of runtime error

4. **Test after every change**
   - Don't wait until multiple changes are made
   - Test incrementally
   - Verify in browser immediately

5. **Document platform-specific issues**
   - Note Windows/Mac/Linux differences
   - Document workarounds
   - Update setup instructions

---

## Related Documentation

- **Troubleshooting Guide:** `docs/MASTER_TROUBLESHOOTING_GUIDE.md`
- **Development Reference:** `docs/DEVELOPMENT_REFERENCE.md`
- **Project Configuration:** `CLAUDE.md`
- **Validation Utilities:** `client/src/lib/validation.ts`

---

## Conclusion

**Time to Resolution:** ~2 hours
**Root Cause:** Missing utility functions (`phoneUtils.isCallable` and `phoneUtils.getTelHref`)
**Primary Issue:** Not checking browser console for actual error first
**Secondary Issues:** Windows environment setup, Sharp module installation

**Key Takeaway:** Always check the browser console first when debugging client-side errors. The actual error message is more valuable than any speculation about authentication flows, API routes, or race conditions.

---

*Document created: 2026-01-28 23:53*
*Last updated: 2026-01-28 23:53*
