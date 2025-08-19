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

### Prevention
- Always use workflow restart instead of manual server commands
- Monitor for duplicate processes before starting new instances
- Use proper workflow management to avoid port conflicts

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