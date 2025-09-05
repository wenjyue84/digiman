# Master Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Your app is starting" - Application Hangs at Startup

**Symptom:** 
- The Replit browser shows "Your app is starting" indefinitely
- Application appears stuck and won't load

**Root Cause:** 
- The server is running on the wrong port (typically port 3005 instead of port 5000)
- Replit expects applications to run on port 5000 for proper frontend-backend communication
- The workflow is running `dev:build` which uses `dev:memory` command that sets `PORT=3005`

**Diagnosis Steps:**
1. Check the workflow console logs for the port number:
   ```
   [express] serving on port 3005  ← WRONG PORT
   [express] serving on port 5000  ← CORRECT PORT
   ```

2. Test the server port directly:
   ```bash
   curl http://localhost:5000/api/database/config  # Should work
   curl http://localhost:3005/api/database/config  # May work but wrong for Replit
   ```

**Solution:**

**Method 1: Quick Fix (Temporary)**
1. Stop all server processes:
   ```bash
   pkill -f "tsx\|cross-env"
   ```

2. Start server on correct port (5000):
   ```bash
   NODE_ENV=development npx tsx watch --clear-screen=false server/index.ts &
   ```

3. Verify the server is running on port 5000:
   ```bash
   curl http://localhost:5000/api/database/config
   ```

**Method 2: Permanent Fix (Recommended)**
1. Create a new script that runs on port 5000:
   ```javascript
   // start-replit.js
   const { spawn } = require('child_process');
   
   // Build first
   const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
   buildProcess.on('close', (code) => {
     if (code !== 0) process.exit(1);
     
     // Start server on default port 5000 (no PORT override)
     const serverProcess = spawn('npx', ['tsx', 'watch', '--clear-screen=false', 'server/index.ts'], {
       stdio: 'inherit',
       env: { ...process.env, NODE_ENV: 'development' }
     });
   });
   ```

2. Update the workflow command to use `node start-replit.js`

**Prevention:**
- Always ensure server runs on port 5000 for Replit environments
- The server code defaults to port 5000: `const port = parseInt(process.env.PORT || '5000', 10);`
- Avoid using commands that override PORT to 3005 in Replit

**Verification:**
1. Check workflow logs show: `[express] serving on port 5000`
2. Test API endpoint: `curl http://localhost:5000/api/database/config`
3. Application should load normally in browser

---

### Issue: "Failed to cancel pending check-in" - Authentication Error

**Symptom:**
- Error when trying to cancel guest tokens
- User sees "Failed to cancel pending check-in" message

**Root Cause:**
- User is accessing dashboard in unauthenticated mode (emergency access feature)
- Cancel operations require authentication but user is not logged in

**Solution:**
1. The error handling automatically redirects to login page
2. User should log in with admin credentials (admin/admin123)
3. After login, cancel operations will work properly

**Technical Details:**
- Dashboard allows unauthenticated viewing for emergency access
- Modification operations (cancel, create, update) require authentication
- Enhanced error handling detects 401 responses and provides clear messaging

---

### Issue: Frontend Crashes with "Cannot read properties of undefined"

**Symptom:**
- Application crashes with error boundary showing
- Error message about undefined properties in error handling

**Root Cause:**
- Undefined error objects being passed to error boundary methods
- Missing null safety checks in error handling code

**Solution:**
- Fixed with comprehensive null safety checks in error boundaries
- Added safe defaults throughout error handling methods
- Enhanced both DatabaseErrorBoundary and GlobalErrorBoundary

---

## Quick Reference Commands

**Check server status:**
```bash
ps aux | grep tsx
curl http://localhost:5000/api/database/config
```

**Restart server on correct port:**
```bash
pkill -f "tsx\|cross-env"
NODE_ENV=development npx tsx watch --clear-screen=false server/index.ts &
```

**View server logs:**
```bash
tail -f server.log
```

**Test authentication:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}'
```

## Environment Information

**Expected Server Configuration:**
- Port: 5000 (default)
- Environment: development
- Database: PostgreSQL (configured via DATABASE_URL)
- Frontend: Served via Vite middleware in development

**Default User Accounts:**
- Admin: admin / admin123
- Staff: Jay / Jay123, Le / Le123, Alston / Alston123

---
*Last Updated: January 2025*