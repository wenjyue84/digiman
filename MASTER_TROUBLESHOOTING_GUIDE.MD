# Master Troubleshooting Guide - Pelangi Capsule Hostel Management System

## PWA "Your app is starting" Hang Issue (August 19, 2025)

### Problem Description
After implementing Progressive Web App (PWA) features, the Replit deployment showed "Your app is starting" indefinitely, preventing the application from loading in the preview environment.

### Root Cause Analysis
1. **Missing Dependencies**: The `vite-plugin-pwa` package was referenced in vite.config.ts but not properly installed
2. **Replit Environment Conflicts**: PWA service worker registration was interfering with Replit's deployment infrastructure
3. **Build Process Issues**: PWA manifest and service worker files were causing conflicts during the build/startup process

### Error Symptoms
- Application builds successfully locally
- "Your app is starting" message persists indefinitely in Replit preview
- Console shows module not found errors for `vite-plugin-pwa`
- Service worker auto-reload potentially causing deployment loops

### Solution Steps

#### Step 1: Install Missing Dependencies
```bash
npm install vite-plugin-pwa workbox-window workbox-strategies workbox-core
```

#### Step 2: Environment Detection and Conditional PWA
Updated `client/src/main.tsx` to detect Replit environment:
```javascript
const isReplit = window.location.hostname.includes('.replit.dev') || 
                 window.location.hostname.includes('.replit.app') || 
                 !!import.meta.env.VITE_REPL_ID;
const shouldRegisterSW = (isLocalhost || isProduction) && !isReplit;
```

#### Step 3: Disable PWA Manifest in Replit
Commented out PWA manifest link in `client/index.html`:
```html
<!-- PWA manifest disabled for Replit compatibility -->
<!-- <link rel="manifest" href="/manifest.webmanifest" /> -->
```

#### Step 4: Set Environment Variable
```bash
export DISABLE_PWA=true
```

### Prevention Measures
1. **Dependency Management**: Always verify PWA dependencies are installed before deployment
2. **Environment-Specific Configuration**: Use conditional PWA registration based on deployment environment
3. **Testing Strategy**: Test PWA features in localhost first, then verify Replit compatibility

---

## Push Notification "Send Test Notification" 500 Error (August 20, 2025)

### Problem Description
The "Send Test Notification" feature in Settings > General was returning 500 errors with database constraint violations and "violates not-null constraint" messages.

### Root Cause Analysis
1. **Over-Engineering**: Multiple enhancement attempts by Claude Code created complex state management conflicts
2. **Settings API Interference**: Push notification testing was interfering with settings system API calls
3. **Database Constraint Issues**: Complex error handling logic was causing null value insertions
4. **Feature Creep**: Simple test functionality became overly complex with troubleshooting enhancements

### Error Symptoms
- HTTP 500 errors when clicking "Send Test Notification"
- Console errors showing "violates not-null constraint"
- Test notifications not being delivered despite successful subscription
- Complex error categorization causing system conflicts

### Solution Steps (Implemented by Cursor AI Agent)

#### Root Cause: Simplification Required
The solution involved **removing complexity** rather than adding more features:

1. **Simplified Test Logic**: Removed over-engineered error handling and state management
2. **Clear Validation Chain**: 
   - Check for active subscriptions first
   - Validate VAPID configuration
   - Send simple test payload without complex state tracking
3. **Direct Response Pattern**: Return clear success/error responses without interference

#### Key Implementation Points
- Avoided complex state management during test notifications
- Removed troubleshooting enhancements that caused interference
- Used simple, direct API response patterns
- Separated test notification logic from settings system

### Lessons Learned
1. **KISS Principle**: Keep It Simple, Stupid - complex solutions often create more problems
2. **Feature Isolation**: Test functionality should not interfere with core system operations
3. **Progressive Enhancement**: Add complexity only when simple solutions fail
4. **AI Agent Collaboration**: Sometimes different AI perspectives provide better solutions

### Prevention Measures
1. **Start Simple**: Implement basic functionality before adding enhancements
2. **Isolate Features**: Keep test/debug features separate from production systems
3. **Monitor Complexity**: Regular code review to prevent over-engineering
4. **Cross-Agent Review**: Use multiple AI tools for different perspectives on complex issues

---

## Push Notifications Not Showing on Guest Check-In (August 20, 2025)

### Problem Description
User reported that push notifications are not appearing when guests check in, despite the "Send Test Notification" feature working correctly.

### Root Cause Analysis
**This is NOT a bug** - it's expected behavior. Push notifications require active subscribers.

1. **No Active Subscriptions**: The push notification system shows 0 total subscriptions
2. **User Must Subscribe First**: Users need to manually subscribe to push notifications in Settings > General
3. **Permission Required**: Browser notification permission must be granted
4. **Service Worker Registration**: PWA service worker must be active for push subscriptions

### Solution Steps

#### For Users (How to Enable Notifications)
1. **Navigate to Settings > General**
2. **Scroll to Push Notifications section**
3. **Click "Enable Notifications"** and grant browser permission
4. **Click "Subscribe to Push Notifications"**
5. **Verify subscription** with "Send Test Notification"

#### For Verification (Admin)
1. Check subscription stats: `GET /api/push/stats`
2. Expected result with active subscriptions:
   ```json
   {
     "totalSubscriptions": 1,
     "activeToday": 1,
     "byCreationDate": {"Mon Aug 20 2025": 1}
   }
   ```

### System Behavior (Working as Designed)
- **Guest Check-In Notifications**: Only sent to active subscribers
- **Zero Subscribers**: No notifications sent (expected behavior)
- **Active Subscribers**: Notifications sent successfully
- **Console Logging**: Shows "Push notification sent for guest check-in: [name]" when subscriptions exist

### Prevention Measures
1. **User Training**: Educate users on notification subscription requirement
2. **UI Indicators**: Show subscription status clearly in Settings
3. **Auto-Subscribe**: Consider auto-subscribing PWA users (when installed)
4. **Documentation**: Clear instructions on enabling notifications

### Related Files
- `server/routes/guests.ts:204-219` - Guest check-in notification logic
- `server/routes/guest-tokens.ts:254-267` - Self check-in notification logic
- `client/src/lib/pushNotifications.ts` - Client subscription management
- `client/src/components/ui/push-notification-settings.tsx` - Settings UI

---

## Individual Test Notification Buttons 404 Error (August 20, 2025)

### Problem Description
Individual test notification buttons (Play icons) in Settings > General show "Test failed, failed to send...Unexpected error" with 404 endpoint not found errors.

### Root Cause Analysis
The individual test buttons were calling `/api/push/send` endpoint which did not exist on the server.

1. **Missing API Endpoint**: `/api/push/send` was not implemented in server routes
2. **Available Endpoints**: Only `/api/push/send-all` and `/api/push/send-admin` existed
3. **Client Expectation**: UI was built expecting a generic `/send` endpoint for individual tests
4. **Fallback Failure**: Even fallback to `/api/push/test` failed due to no active subscriptions

### Error Symptoms
- Individual test buttons show "Unexpected error" messages
- Server logs show repeated `POST /api/push/send 404` errors
- General "Send Test Notification" button works correctly
- Browser console shows endpoint not found errors

### Solution Steps

#### Step 1: Added Missing API Endpoint
Created new `/api/push/send` endpoint in `server/routes/push.ts`:
- Accepts custom notification payloads from individual test buttons
- Validates required fields (title, body)
- Checks for active subscriptions before sending
- Returns proper error responses with codes
- Sends to all subscribers (appropriate for testing)

#### Step 2: Enhanced Client Error Handling
Updated error categorization in `client/src/components/ui/push-notification-settings.tsx`:
- Added specific handling for 404 endpoint errors
- Improved subscription requirement messaging
- Enhanced troubleshooting steps based on error type
- Better actionRequired instructions

#### Step 3: Error Response Improvements
- **404 Errors**: "API Endpoint Not Found - please refresh the page"
- **No Subscriptions**: "You need to subscribe to push notifications first"
- **Auth Errors**: "Your session has expired - refresh the page"

### System Behavior (After Fix)
- **With Subscriptions**: Individual test buttons send specific notification types successfully
- **Without Subscriptions**: Clear error message explaining subscription requirement
- **Endpoint Errors**: Helpful instructions to refresh page for updated endpoints
- **Fallback Logic**: Graceful degradation with informative error messages

### Prevention Measures
1. **API Documentation**: Document all required endpoints during UI development
2. **Error Testing**: Test all error scenarios including missing endpoints
3. **Graceful Degradation**: Implement proper fallback mechanisms
4. **User Guidance**: Provide clear troubleshooting steps for common issues

### Related Files Modified
- `server/routes/push.ts:230-328` - Added new `/send` endpoint
- `client/src/components/ui/push-notification-settings.tsx:603-665` - Enhanced error handling
- `MASTER_TROUBLESHOOTING_GUIDE.MD` - This documentation

---

## "Instant Create" Guest Check-in Links Invalid/Expired Error (August 20, 2025)

### Problem Description
The "Instant Create" guest check-in links from localhost:5000/check-in were showing "invalid or expired link. This check-in link is invalid or has expired" error on both mobile and desktop versions, despite the feature working previously.

### Root Cause Analysis
**Method Name Mismatch** in the guest token retrieval system:

1. **Storage Interface**: Defines `getGuestToken(token: string)` method
2. **Route Implementation**: Called non-existent `getGuestTokenByToken(token)` method  
3. **Runtime Error**: `TypeError: storage.getGuestTokenByToken is not a function`
4. **User Impact**: All guest check-in links appeared invalid due to 500 server errors

### Error Symptoms
- Guest check-in links show "invalid or expired" message
- Server logs show `TypeError: storage.getGuestTokenByToken is not a function`
- 500 HTTP errors when accessing `/api/guest-tokens/:token` endpoint
- Both mobile and desktop affected equally
- Issue occurred after code changes/refactoring

### Solution Steps

#### Step 1: Identify the Storage Method Mismatch
**Server logs revealed the error:**
```
Error fetching guest token: TypeError: storage.getGuestTokenByToken is not a function
at server\routes\guest-tokens.ts:151:38
```

#### Step 2: Check Storage Interface
**Verified correct method name in `server\Storage\IStorage.ts:57`:**
```typescript
getGuestToken(token: string): Promise<GuestToken | undefined>;
```

#### Step 3: Fix Route Implementation
**Updated `server\routes\guest-tokens.ts` in two locations:**
- **Line 151**: `storage.getGuestTokenByToken(token)` → `storage.getGuestToken(token)`
- **Line 201**: `storage.getGuestTokenByToken(token)` → `storage.getGuestToken(token)`

#### Step 4: Verify Fix
- ✅ Created test guest token successfully
- ✅ Retrieved guest token data (200 response)  
- ✅ Guest check-in links load properly
- ✅ No more server errors in logs

### System Behavior (After Fix)
- **Token Creation**: `POST /api/guest-tokens` returns proper link with token
- **Token Validation**: `GET /api/guest-tokens/:token` returns token details
- **Link Access**: Guest check-in links work on both mobile and desktop
- **Error Handling**: Proper validation of expired/used tokens

### Prevention Measures
1. **Method Verification**: Always verify method names against storage interface
2. **Error Monitoring**: Watch server logs for `TypeError` and method-not-found errors
3. **Testing Protocol**: Test guest token workflow after any storage-related changes
4. **Code Review**: Check all storage method calls during refactoring
5. **Interface Consistency**: Use IDE auto-complete to avoid method name typos

### Related Files Modified
- `server/routes/guest-tokens.ts:151,201` - Fixed method name from `getGuestTokenByToken` to `getGuestToken`
- `MASTER_TROUBLESHOOTING_GUIDE.MD` - This documentation

### Debugging Commands
```bash
# Check storage interface methods
grep -n "getGuestToken" server/Storage/IStorage.ts

# Test token creation
curl -X POST http://localhost:5000/api/guest-tokens -H "Authorization: Bearer TOKEN" -d '{"capsuleNumber":"C2","hoursValid":24}'

# Test token retrieval  
curl http://localhost:5000/api/guest-tokens/TOKEN_ID

# Monitor server logs for errors
# Watch for: TypeError: storage.METHOD_NAME is not a function
```
4. **Documentation**: Keep PWA configuration clearly documented for future changes

### Related Files Modified
- `client/src/main.tsx` - Service worker registration logic
- `client/index.html` - PWA manifest reference
- `package.json` - PWA dependencies (via npm install)

### Testing Verification
✅ Application starts successfully in Replit preview
✅ Dashboard loads with guest data  
✅ API endpoints respond correctly
✅ No infinite loading or startup hangs
✅ Push notification routes accessible (confirmed after express-validator fix)

### Future Considerations
- PWA features remain available for production deployments
- Service worker will activate in localhost development and production environments  
- Push notifications now work in all environments including Replit (after dependency fixes)
- Monitor for additional dependencies when new features are added via git

---

## Push Notification Dependencies Issue (August 19, 2025)

### Problem Description
After git updates that added push notification features, application failed to start with "Your app is starting" hang due to missing `express-validator` dependency.

### Root Cause
Recent git commits introduced push notification routes (`server/routes/push.ts`) that import `express-validator` without ensuring the dependency was installed.

### Error Symptoms
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express-validator' imported from /home/runner/workspace/server/routes/push.ts
```

### Solution Steps
1. **Install Missing Dependency**
   ```bash
   npm install express-validator
   ```

2. **Restart Application Workflow**
   ```bash
   # Application automatically restarts after dependency installation
   ```

3. **Verify Startup Success**
   - Check for "serving on port 5000" in workflow logs
   - Confirm API endpoints respond (GET /api/occupancy, /api/guests/checked-in)
   - Application loads dashboard successfully

### Resolution Confirmation
✅ Application starts successfully after dependency installation
✅ All core functionality restored (guest management, occupancy tracking)
✅ PWA and push notification features remain enabled
✅ Database connections and API endpoints working normally

### Prevention Measures
- Always install dependencies immediately after adding new routes/features
- Check package.json dependencies match actual imports in TypeScript files
- Test application startup after git pulls containing new features
- Monitor workflow logs for module import errors during development

---

## React Component Caching Issue (August 19, 2025)

### Problem Description
After modifying React components (e.g., removing sections from GeneralSettingsTab), changes were not reflected in the browser despite multiple file edits and browser refreshes.

### Root Cause Analysis
1. **Vite Development Cache**: Vite caches compiled modules in `node_modules/.vite` directory
2. **Browser Cache**: Browser may cache previous component builds
3. **Build Cache Persistence**: Cached builds can persist through standard restarts

### Error Symptoms
- File modifications appear correct when inspected
- Browser shows old component version with removed sections still visible
- Standard browser refresh (F5) doesn't show changes
- Component appears to load from cached version

### Solution Steps (In Order)

#### Step 1: Clear Vite Development Cache
```bash
rm -rf node_modules/.vite
```

#### Step 2: Rebuild Project
```bash
npm run build
```

#### Step 3: Restart Development Server
```bash
npm run dev
```

#### Step 4: Hard Refresh Browser
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`
- **Alternative**: Open incognito/private window

### Complete Command Sequence
```bash
# Kill current dev server
# Clear Vite cache and rebuild
rm -rf node_modules/.vite && npm run build && npm run dev
```

### Prevention Measures
1. **Cache-First Troubleshooting**: Always suspect caching when changes don't appear
2. **Hard Refresh**: Use hard refresh by default during development
3. **Incognito Testing**: Use private windows to verify changes without cache interference
4. **Full Cache Clear**: Clear Vite cache when making structural component changes

### Related Files in This Case
- `client/src/components/settings/GeneralSettingsTab.tsx` - Component being modified
- `client/src/pages/settings.tsx` - Parent component importing the modified component
- `node_modules/.vite/` - Vite cache directory

### Testing Verification
✅ Component changes appear immediately after cache clear
✅ Browser shows updated component structure
✅ Removed sections no longer visible
✅ Hard refresh shows consistent results

### When to Use This Solution
- React component changes not appearing
- UI modifications not reflecting in browser  
- Structural changes to components seem ignored
- Standard refresh doesn't show file modifications

---

## Port Conflict Issue (August 19, 2025)

### Problem Description
Application hangs at "Your app is starting" with port already in use error, preventing server startup.

### Root Cause
Multiple instances of the development server running simultaneously, causing port 5000 to be occupied.

### Error Symptoms
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
    at Server.setupListenHandle [as _listen2] (node:net:1908:16)
    at listenInCluster (node:net:1965:12)
```

### Solution Steps
1. **Kill Existing Processes**
   ```bash
   pkill -f "tsx watch" || true
   ```

2. **Restart Workflow**
   - Use the "Start application" workflow restart button
   - Or manually restart the development server

### Resolution Confirmation
✅ Check for "serving on port 5000" message in workflow logs
✅ Application loads dashboard successfully
✅ API endpoints respond normally

### Smart Script Solution (August 19, 2025)
Created enhanced `scripts/start-dev.js` with automatic port conflict prevention:
- Automatically detects and kills processes on port 5000
- Cleans up tsx watch processes proactively
- Uses cross-platform process killing (npx kill-port, lsof, taskkill)
- Runs via `npm run dev:safe` command for reliable startup

### Prevention
- Use `npm run dev:safe` instead of `npm run dev` for automatic conflict prevention
- Smart script handles cleanup automatically, reducing manual troubleshooting
- Monitor workflow logs for "✅ Killed existing process" confirmation

---

## Replit Deployment Cache Issue (August 19, 2025)

### Problem Description
After syncing file changes to Replit, the deployed application still shows old component versions (e.g., removed sections still visible), despite localhost showing correct updates.

### Root Cause Analysis
1. **Replit Build Cache**: Replit caches built assets and doesn't automatically rebuild on file sync
2. **Production vs Development**: Localhost development server rebuilds automatically, Replit production doesn't
3. **Vite Cache Persistence**: Cached builds in `node_modules/.vite` and `dist` directories persist across syncs

### Error Symptoms
- Localhost shows updated components correctly
- Replit hosted version shows old component structure
- Files appear synced correctly in Replit file explorer
- Standard Replit restart doesn't show changes

### Solution Steps (In Order)

#### Method 1: Force Rebuild in Replit Terminal
```bash
# In Replit Shell tab:
rm -rf node_modules/.vite
rm -rf dist
npm run build
# Then restart the Replit application
```

#### Method 2: Combined Cache Clear
```bash
# Single command in Replit Shell:
rm -rf node_modules/.vite && rm -rf dist && npm run build
```

#### Method 3: Full Replit Restart
1. Stop the Replit application completely
2. Wait 30 seconds
3. Restart the entire Replit project
4. Allow automatic rebuild process to complete

### Prevention Measures
1. **Always rebuild after major component changes** when deploying to Replit
2. **Use Replit Shell** to manually clear cache before restart
3. **Monitor for cache persistence** when file changes don't appear in production
4. **Document Replit-specific build steps** for team members

### Related Files/Directories
- `node_modules/.vite/` - Vite development cache
- `dist/` - Built production assets
- `client/src/components/` - React components being modified

### Testing Verification
✅ Replit shows updated component structure after cache clear
✅ Removed sections no longer visible in production
✅ Build process completes successfully in Replit Shell
✅ Application restarts with fresh build

### When to Use This Solution
- Local changes work but Replit deployment shows old version
- Component modifications not appearing in hosted environment
- File sync completed but UI unchanged
- Production environment serving cached components

### Environment-Specific Notes
- **Localhost**: Auto-rebuilds on file changes
- **Replit Production**: Requires manual cache clearing and rebuild
- **Other Hosting**: Similar cache clearing may be needed

---

## Syntax Error Build Failure (August 19, 2025)

### Problem Description
Application startup fails during Vite build process due to JSX syntax errors in React components, preventing server startup.

### Root Cause
Malformed JSX conditional rendering structure causing ESBuild parse errors during Vite compilation.

### Error Symptoms
```
ERROR: Expected ")" but found "{"
file: /client/src/components/settings/GeneralSettingsTab.tsx:98:8
Transform failed with 1 error
```

### Solution Steps
1. **Identify the broken component** from build error logs
2. **Fix JSX structure** ensuring proper conditional rendering syntax
3. **Verify proper closing tags** and JSX element nesting
4. **Rebuild application** once syntax is corrected

### Resolution Confirmation
✅ Build process completes without syntax errors
✅ Server starts with "serving on port 5000" message
✅ Application loads properly in browser

### Prevention
- Use TypeScript strict mode to catch syntax errors early
- Implement proper JSX conditional rendering patterns
- Test builds locally before deployment

---

## Complete Startup Hang Resolution Process (August 19, 2025)

### Comprehensive Solution Sequence
When "Your app is starting" hangs occur, follow this systematic approach:

1. **Port Conflict Resolution**
   ```bash
   pkill -f "tsx watch" || true
   # Restart workflow
   ```

2. **Smart Script Usage**
   ```bash
   npm run dev:safe  # Uses enhanced startup script
   ```

3. **Syntax Error Detection**
   - Check build logs for JSX/TypeScript errors
   - Fix component syntax issues
   - Verify proper imports and exports

4. **Dependency Verification**
   ```bash
   npm install  # Ensure all dependencies present
   ```

### Success Indicators
✅ "serving on port 5000" in workflow logs
✅ No build/compilation errors
✅ API endpoints respond correctly
✅ Dashboard loads with data

---

## Additional Troubleshooting Patterns

### Database Connection Issues
- Verify DATABASE_URL environment variable
- Check PostgreSQL service status
- Confirm Drizzle schema migrations are applied

### Authentication 401 Errors
- Expected behavior for unauthenticated dashboard access (emergency feature)
- Admin-only endpoints return 401 without authentication
- Core guest management functionality works without login

### Build and Deployment
- Always restart workflow after dependency changes
- Clear browser cache if UI changes don't appear
- Check for TypeScript errors in LSP diagnostics

### Performance Optimization
- Monitor API response times in workflow logs
- Use pagination for large datasets
- Implement proper caching strategies