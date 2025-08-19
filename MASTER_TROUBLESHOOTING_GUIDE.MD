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

### Future Considerations
- PWA features remain available for production deployments
- Service worker will activate in localhost development and production environments
- Push notifications will work when deployed outside Replit environment

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

### Solution
```bash
npm install express-validator
```

### Prevention
- Always install dependencies immediately after adding new routes/features
- Check package.json dependencies match actual imports
- Test application startup after git pulls with new features

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