# Troubleshooting Guide
# PelangiManager - Capsule Hostel Management System

**Document Version:** 2.0  
**Date:** December 2024  
**Project:** Pelangi Capsule Hostel Management System  

---

## Issue Database

### 001 - Connection Problem / Server Crashes (SOLVED)

**Date Solved:** August 9, 2025  
**Symptoms:**
- "Connection Problem, please check your internet connection and try again" toast appears
- Occurs when accessing Check-in, Check-out pages, Settings > Save Settings, Report Capsule Problem
- Login shows "Login failed..." even with correct credentials
- Browser DevTools shows "Failed to fetch" network errors

**Root Cause:**
- Server error middleware was rethrowing errors after sending response (`throw err;`)
- This crashed the Node.js process, causing subsequent requests to fail
- Browser interpreted crashed server as network connectivity issues

**Solution Steps:**
1. **Stop and restart server with clean environment:**
   ```powershell
   # Stop running server (Ctrl+C)
   cd "C:\Users\Jyue\Desktop\PelangiManager"
   Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
   npm run dev
   ```

2. **Clear browser auth cache:**
   - Chrome DevTools > Application > Local Storage > http://localhost:5000
   - Remove `auth_token` key
   - Refresh page

3. **Test with correct credentials:**
   - Email: `admin@pelangi.com`, Password: `admin123`
   - OR Username: `admin`, Password: `admin123`

**Technical Fix Applied:**
- Modified `server/index.ts` error middleware to log errors without rethrowing
- Before: `res.status(status).json({ message }); throw err;` (crashed server)
- After: Logs error context and returns JSON response safely

**Files Modified:**
- `server/index.ts` - Fixed error middleware to prevent server crashes

**Prevention:**
- Always restart dev server after pulling code changes
- Use `Remove-Item Env:DATABASE_URL` to ensure in-memory storage mode
- Monitor server console for stack traces indicating crashes

---

### 003 - Google OAuth Not Working (SOLVED)

**Date Solved:** December 2024  
**Symptoms:**
- Google OAuth login button shows but doesn't redirect
- "Failed to authenticate with Google" error appears
- OAuth callback returns to login page without authentication

**Root Cause:**
- Google OAuth credentials not properly configured
- Missing or incorrect environment variables
- OAuth callback URL mismatch

**Solution Steps:**
1. **Configure Google OAuth credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create or select a project
   - Enable Google+ API and Google OAuth 2.0
   - Create OAuth 2.0 credentials

2. **Set environment variables:**
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

3. **Configure authorized redirect URIs:**
   - Add `http://localhost:5000/api/auth/google/callback` for development
   - Add your production domain callback URL for production

4. **Restart server:**
   ```bash
   npm run dev
   ```

**Technical Fix Applied:**
- Updated `server/routes.ts` with proper OAuth configuration
- Added environment variable validation
- Implemented proper OAuth callback handling

**Files Modified:**
- `server/routes.ts` - Added Google OAuth configuration
- `server/config.ts` - Added OAuth environment variables

**Verification:**
- Click "Sign in with Google" button
- Should redirect to Google OAuth consent screen
- After consent, should redirect back and log in successfully

---

### 004 - File Uploads Not Working (SOLVED)

**Date Solved:** December 2024  
**Symptoms:**
- File upload interface shows but uploads fail
- "Upload failed" error appears
- Files not appearing in the system

**Root Cause:**
- File storage not properly configured
- Missing upload directory permissions
- File size or type validation issues

**Solution Steps:**
1. **Check upload directory:**
   ```bash
   # Ensure uploads directory exists
   mkdir -p uploads
   # Set proper permissions
   chmod 755 uploads
   ```

2. **Verify file storage configuration:**
   ```bash
   # Check if using local storage (default for development)
   # No additional environment variables needed for local storage
   ```

3. **Check file validation:**
   - Ensure file size is under 10MB limit
   - Verify file type is allowed (images, documents)
   - Check file name doesn't contain special characters

4. **Restart server:**
   ```bash
   npm run dev
   ```

**Technical Fix Applied:**
- Created `uploads/` directory with proper permissions
- Implemented file validation middleware
- Added error handling for upload failures

**Files Modified:**
- `server/routes.ts` - Added file upload validation
- `server/objectStorage.ts` - Implemented local file storage

**Verification:**
- Try uploading a small image file (< 1MB)
- Check `uploads/` directory for uploaded files
- Verify file appears in the system interface

---

### 005 - Real-time Updates Not Working (SOLVED)

**Date Solved:** December 2024  
**Symptoms:**
- Dashboard doesn't update in real-time
- Changes require manual page refresh
- WebSocket connection errors in console

**Root Cause:**
- WebSocket server not properly initialized
- Client-side WebSocket connection issues
- Missing real-time update handlers

**Solution Steps:**
1. **Check WebSocket server:**
   - Verify WebSocket server is running
   - Check console for WebSocket initialization messages

2. **Verify client connection:**
   - Check browser console for WebSocket connection status
   - Ensure no firewall blocking WebSocket connections

3. **Test real-time updates:**
   - Open dashboard in multiple browser tabs
   - Make a change in one tab
   - Verify update appears in other tabs

**Technical Fix Applied:**
- Implemented WebSocket server in `server/index.ts`
- Added real-time update handlers
- Created client-side WebSocket connection management

**Files Modified:**
- `server/index.ts` - Added WebSocket server
- `client/src/hooks/useVisibilityQuery.ts` - Added real-time updates

**Verification:**
- Open dashboard in multiple tabs
- Make a guest check-in/check-out
- Verify occupancy updates appear in real-time across tabs

---

### 002 - Active Problems Not Displaying (SOLVED)

**Date Solved:** August 9, 2025  
**Symptoms:**
- Problem reporting succeeds with "Problem Reported" message
- Active problems section remains empty even after refresh
- Problems are created but not visible in Settings > Maintenance tab

**Root Cause:**
- Settings page was calling `/api/problems` which returns `PaginatedResponse<CapsuleProblem>`
- Frontend code expected simple `CapsuleProblem[]` array
- Type mismatch caused active problems to never display

**Solution Steps:**
1. **Update the problems query in Settings page:**
   ```typescript
   // Before: Expected CapsuleProblem[]
   const { data: problems = [], isLoading: problemsLoading } = useQuery<CapsuleProblem[]>({
     queryKey: ["/api/problems"],
   });

   // After: Handle PaginatedResponse properly
   const { data: problemsResponse, isLoading: problemsLoading } = useQuery<PaginatedResponse<CapsuleProblem>>({
     queryKey: ["/api/problems"],
   });
   const problems = problemsResponse?.data || [];
   ```

2. **Add missing import:**
   ```typescript
   import { type PaginatedResponse } from "@shared/schema";
   ```

**Technical Fix Applied:**
- Modified `client/src/pages/settings.tsx` to handle paginated API response
- Added proper type annotations for PaginatedResponse
- Extract problems array from response.data property

**Files Modified:**
- `client/src/pages/settings.tsx` - Fixed problems query and data extraction

**Verification:**
- Report a capsule problem → Should show "Problem Reported" success
- Go to Settings > Maintenance tab → Problem should appear in "Active Problems"
- Refresh page → Problem should persist in the list

---

### 003 - Problem Deletion Shows Success But Doesn't Delete (SOLVED)

**Date Solved:** August 9, 2025  
**Symptoms:**
- "Problem Deleted" success message appears when deleting active problems
- Problem remains visible in active problems list even after refresh
- Delete action appears to succeed but has no effect

**Root Cause:**
- Frontend sends DELETE request to `/api/problems/${id}`
- Server route handler for DELETE `/api/problems/:id` was missing completely
- Frontend shows success message from mutation, but server returns 404 (not found)
- React Query doesn't refetch because it thinks the operation succeeded

**Solution Steps:**
1. **Add DELETE endpoint to server routes:**
   ```typescript
   // Delete problem
   app.delete("/api/problems/:id", authenticateToken, async (req: any, res) => {
     try {
       const { id } = req.params;
       const deleted = await storage.deleteProblem(id);
       if (!deleted) {
         return res.status(404).json({ message: "Problem not found" });
       }
       res.json({ message: "Problem deleted successfully" });
     } catch (error: any) {
       res.status(400).json({ message: error.message || "Failed to delete problem" });
     }
   });
   ```

2. **Add deleteProblem method to storage interface:**
   ```typescript
   deleteProblem(problemId: string): Promise<boolean>;
   ```

3. **Implement deleteProblem in both storage classes:**
   - MemStorage: Remove from Map and update capsule availability if needed
   - DatabaseStorage: Delete from database using Drizzle ORM

**Technical Fix Applied:**
- Added `/api/problems/:id` DELETE endpoint in `server/routes.ts`
- Added `deleteProblem` method to IStorage interface
- Implemented `deleteProblem` in both MemStorage and DatabaseStorage classes
- Fixed logic to mark capsule as available when last active problem is deleted

**Files Modified:**
- `server/routes.ts` - Added DELETE endpoint for problems
- `server/storage.ts` - Added deleteProblem interface and implementations

**Verification:**
- Delete an active problem → Should show "Problem Deleted" success
- Refresh Settings > Maintenance tab → Problem should be removed from list
- Check capsule availability → Should be marked as available if it was the last active problem

---

### 004 - Settings page runtime error: CapsulesTab is not defined (SOLVED)

**Date Solved:** August 9, 2025  
**Symptoms:**
- Visiting `http://localhost:5000/settings` shows Vite overlay: `CapsulesTab is not defined`
- Stack points to `client/src/pages/settings.tsx:163`

**Root Cause:**
- New Capsules tab added to Settings referenced `<CapsulesTab ... />` but component was not implemented

**Solution Steps:**
1. Implement a minimal `CapsulesTab` component inside `client/src/pages/settings.tsx`
2. Import `Building` icon and render basic capsule list
3. Ensure capsules query is enabled for `activeTab === "capsules"`

**Technical Fix Applied:**
- Added `CapsulesTab` component (minimal, lists capsules with availability badges)
- Updated tabs to include Capsules tab and icon
- Enabled `/api/capsules` query for Capsules tab

**Files Modified:**
- `client/src/pages/settings.tsx`

**Verification:**
- Navigate to `http://localhost:5000/settings` → Page loads without runtime error
- Capsules tab renders with list of capsules

---

### 005 - IC Photo Upload Failed: "Failed to construct 'URL': Invalid URL" (SOLVED)

**Date Solved:** January 2025  
**Symptoms:**
- Clicking "Upload IC photo" in Self Check-in form shows error: "Failed to construct 'URL': Invalid URL"
- Console shows Uppy error: `[Uppy] Failed to construct 'URL': Invalid URL`
- Upload fails in local development environment using localhost
- Files are actually uploaded to `uploads/` directory but client fails to process the response

**Root Cause:**
- Server returned relative URL `/api/objects/dev-upload/{id}` for local development
- Uppy AWS S3 plugin expects a full URL (with protocol and host) not a relative path
- The AWS S3 plugin tries to construct a URL object from the relative path, which fails

**Solution Steps:**
1. **Update server to return full URLs for dev uploads:**
   ```typescript
   // server/routes.ts - in /api/objects/upload endpoint
   // Before: const uploadURL = `/api/objects/dev-upload/${id}`;
   // After:
   const protocol = req.protocol;
   const host = req.get('host');
   const uploadURL = `${protocol}://${host}/api/objects/dev-upload/${id}`;
   ```

2. **Add CORS headers for dev upload endpoint:**
   ```typescript
   // Handle OPTIONS preflight
   app.options("/api/objects/dev-upload/:id", (req, res) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'PUT, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     res.sendStatus(200);
   });

   // Add headers to PUT endpoint
   app.put("/api/objects/dev-upload/:id", async (req, res) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'PUT, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     // ... rest of handler
   });
   ```

3. **Update client to handle dev upload URLs properly:**
   ```typescript
   // client/src/pages/guest-checkin.tsx
   if (uploadURL.includes('/api/objects/dev-upload/')) {
     // Dev upload URL (can be full or relative)
     const parts = uploadURL.split('/api/objects/dev-upload/');
     objectId = parts[parts.length - 1];
   }
   ```

**Technical Fix Applied:**
- Modified server to return full URLs instead of relative paths for dev environment
- Added CORS headers and OPTIONS preflight handling for cross-origin PUT requests
- Enhanced client-side URL parsing to handle both full and relative URLs
- Added comprehensive logging to debug upload flow
- Fixed nested `<a>` tag warning in mobile navigation (bonus fix)

**Files Modified:**
- `server/routes.ts` - Return full URLs and add CORS headers
- `client/src/pages/guest-checkin.tsx` - Enhanced URL parsing and error handling
- `client/src/components/mobile-bottom-nav.tsx` - Fixed nested anchor tag issue

**Verification:**
- Upload IC photo → Should show "Document Uploaded" success
- Check `uploads/` directory → File should be saved with metadata
- Console should show full URL like `http://localhost:5000/api/objects/dev-upload/{id}`
- No CORS errors in browser console

**Prevention:**
- Always return full URLs from server when dealing with file upload libraries
- Test file uploads in local development environment
- Add proper CORS headers for development endpoints
- Use browser DevTools to debug upload flow

---

## Common Issues Reference

### Network/Connection Errors
- **"Connection Problem" toast** → Server likely crashed, restart with clean env
- **"Failed to fetch" in DevTools** → Server process terminated, check error middleware
- **Login works but other pages fail** → Partial server crash, restart required

### Authentication Issues
- **"Login failed" with correct credentials** → Server crash during auth, restart server
- **Redirected to login on protected pages** → Clear `auth_token` from localStorage
- **API returns 401 on valid requests** → Token expired or corrupted, re-login

### Development Setup
- **Server won't start** → Check Node.js version (requires 18+), run `npm install`
- **Port 5000 busy** → Set `PORT=5001` in `.env` file
- **Database connection errors** → Remove `DATABASE_URL` env var for in-memory mode

---

## Diagnostic Commands

### Check Server Health
```powershell
# Test public endpoints
Invoke-WebRequest http://localhost:5000/api/capsules/available
Invoke-WebRequest http://localhost:5000/api/guests/checked-in

# Test authentication
$body = @{ email = 'admin@pelangi.com'; password = 'admin123' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -Body $body -ContentType 'application/json'
```

### Environment Reset
```powershell
# Force in-memory storage mode
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

# Clean restart
npm run dev
```

### Browser Debug
```javascript
// Check stored auth token
localStorage.getItem('auth_token')

// Clear auth token
localStorage.removeItem('auth_token')
```

---

## Success Patterns

### Working Development Flow
1. Start server: `npm run dev`
2. Wait for "serving on port 5000" message
3. Visit http://localhost:5000
4. Login with admin@pelangi.com / admin123
5. All features should work without connection errors

### When to Restart Server
- After pulling code changes
- When seeing "Connection Problem" toasts
- After modifying server-side files
- When switching between database/in-memory modes

---

## Emergency Recovery

### Complete Reset Procedure
```powershell
# 1. Stop everything
# Ctrl+C to stop server

# 2. Clean environment
cd "C:\Users\Jyue\Desktop\PelangiManager"
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

# 3. Fresh start
npm install
npm run dev

# 4. Clear browser data
# DevTools > Application > Storage > Clear
```

### Verification Checklist
- [ ] Server shows "serving on port 5000"
- [ ] http://localhost:5000 loads login page
- [ ] Login with admin@pelangi.com / admin123 succeeds
- [ ] Dashboard loads without errors
- [ ] Check-in page loads available capsules
- [ ] Check-out page shows current guests
- [ ] Settings > Save Settings works
- [ ] Maintenance > Report Problem works

---

**Document Control:**
- **Maintained By:** Development Team
- **Last Updated:** January 2025
- **Next Review:** When new issues arise

*This guide captures proven solutions for recurring issues in PelangiManager development and deployment.*

 