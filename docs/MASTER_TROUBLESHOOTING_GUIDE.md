# 🚨 MASTER TROUBLESHOOTING GUIDE
# PelangiManager - Complete Problem Resolution Reference

**Document Version:** 2025.01  
**Date:** January 2025  
**Project:** Pelangi Capsule Hostel Management System  

---

## 🚨 **EMERGENCY RECOVERY PROCEDURE**

### **Complete Reset Procedure (Use This First!)**
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

### **Quick Fix Checklist**
- [ ] Server shows "serving on port 5000"
- [ ] http://localhost:5000 loads login page
- [ ] Login with admin@pelangi.com / admin123 succeeds
- [ ] Dashboard loads without errors
- [ ] Check-in page loads available capsules
- [ ] Check-out page shows current guests
- [ ] Settings > Save Settings works
- [ ] Maintenance > Report Problem works

---

## 🔧 **ISSUE DATABASE - SOLVED PROBLEMS**

### **008 - Push Notification Test Failures (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- "Send Test Notification" button fails with generic error messages
- Users get unclear feedback about what went wrong
- No guidance on how to resolve notification issues
- Test attempts don't provide actionable troubleshooting steps

**Root Cause:**
- **Limited Error Handling**: Basic error catching without categorization
- **Generic Error Messages**: "Failed to send test notification" without context
- **No User Guidance**: Users left confused about how to fix issues
- **Missing Troubleshooting**: No step-by-step resolution instructions

**Solution Implemented:**
1. **Enhanced Error Categorization**: 
   - Network errors (connection issues)
   - Permission errors (browser blocking)
   - Subscription errors (not subscribed)
   - Server errors (backend issues)
   - Browser compatibility errors

2. **Comprehensive Troubleshooting Messages**:
   - Specific error descriptions
   - Step-by-step resolution steps
   - Actionable guidance for users
   - Browser-specific instructions

3. **Improved User Experience**:
   - Retry functionality
   - Browser settings guidance
   - Test attempt tracking
   - Visual error indicators

**Error Categories & Solutions:**

#### **Network Connection Issues**
- **Symptoms**: "Network Connection Issue" error
- **Solutions**:
  - Check internet connection
  - Ensure server is running
  - Refresh the page
  - Check firewall/proxy settings

#### **Permission Issues**
- **Symptoms**: "Notification Permission Issue" error
- **Solutions**:
  - Click lock/info icon in browser address bar
  - Set notifications to "Allow"
  - Refresh page after permission change
  - Check browser notification settings

#### **Subscription Issues**
- **Symptoms**: "Subscription Not Active" error
- **Solutions**:
  - Click "Enable Push Notifications"
  - Grant permission when prompted
  - Ensure user is logged in
  - Check service worker registration

#### **Server Errors**
- **Symptoms**: "Server Error" or HTTP 500
- **Solutions**:
  - Wait and try again later
  - Contact support if persistent
  - Check server status
  - Verify VAPID key configuration

#### **Browser Compatibility**
- **Symptoms**: "Browser Not Supported" error
- **Solutions**:
  - Use Chrome, Firefox, Edge, or Safari
  - Update to latest browser version
  - Enable JavaScript
  - Avoid private/incognito mode

**Testing & Verification:**
```javascript
// Browser console commands for debugging
console.log('ServiceWorker:', 'serviceWorker' in navigator);
console.log('PushManager:', 'PushManager' in window);
console.log('Notification:', 'Notification' in window);
console.log('Permission:', Notification.permission);
console.log('SW Controller:', navigator.serviceWorker.controller);
```

**Prevention:**
- **Regular Testing**: Test notifications after major changes
- **Browser Updates**: Keep browsers updated
- **Permission Management**: Guide users through permission setup
- **Error Monitoring**: Track common failure patterns

---

### **007 - Frontend Changes Not Reflecting Due to Build Artifacts (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Frontend changes appear to be made but aren't reflected in the UI
- Components deleted from source code still appear in the application
- Changes work in incognito mode but not in regular browser (ruling out browser caching)
- Similar to nationality editing issue where changes weren't reflected

**Root Cause:**
- **Build Artifacts Issue**: The `dist/` directory contains outdated compiled JavaScript code
- **Source vs Compiled Mismatch**: Even after deleting source files, old compiled versions are still being served
- **Build Process Dependency**: The `npm run build` script generates compiled code that must be updated after source changes

**Solution Steps:**
1. **Stop Development Server:**
   ```powershell
   # Ctrl+C to stop server
   ```

2. **Clean Build Artifacts:**
   ```powershell
   # Remove compiled code directory
   Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
   ```

3. **Rebuild Application:**
   ```powershell
   npm run build
   ```

4. **Verify Clean Build:**
   ```powershell
   # Check that old components are removed from compiled code
   Get-ChildItem dist -Recurse | Select-String "OLD_COMPONENT_NAME"
   ```

5. **Start Fresh Server:**
   ```powershell
   npm run dev
   ```

**Prevention:**
- **Always rebuild after major component changes**: `npm run build`
- **Clear build artifacts when changes don't reflect**: Remove `dist/` directory
- **Follow build process**: Source changes → Rebuild → Test

---

### **006 - JSX Syntax Error: Expected corresponding JSX closing tag for <CardContent> (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Vite dev server shows: "Internal server error: Expected corresponding JSX closing tag for <CardContent>. (1344:12)"
- React application fails to compile and run
- Browser shows "localhost refused to connect" or "ERR_CONNECTION_REFUSED"
- Server crashes due to JSX parsing error

**Root Cause:**
- Unbalanced JSX tags in `client/src/pages/settings.tsx`
- `<CardContent>` tag opened at line 1059 in `GuestGuideTab` function was never properly closed
- Multiple nested `<div>` tags created structural imbalance

**Solution Steps:**
1. **Identify the JSX structure issue:**
   ```typescript
   // Line 1059: CardContent opens
   <CardContent>
     <div className={`preview-content...`}>
       // ... complex nested content ...
   
   // Line 1344: Should be </CardContent> but was </div>
   </div>  // WRONG - should be </CardContent>
   </Card>
   ```

2. **Fix the JSX structure:**
   ```typescript
   // Remove extra nested div and properly close CardContent
   </div>
   </div>
   </div>
   </CardContent>  // FIXED - proper closing tag
   </Card>
   ```

**Prevention:**
- Always verify JSX tag balance when making structural changes
- Use proper indentation to visualize JSX nesting
- Count opening/closing tags to ensure balance

---

### **005 - IC Photo Upload Failed: "Failed to construct 'URL': Invalid URL" (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Clicking "Upload IC photo" in Self Check-in form shows error: "Failed to construct 'URL': Invalid URL"
- Console shows Uppy error: `[Uppy] Failed to construct 'URL': Invalid URL`
- Upload fails in local development environment using localhost

**Root Cause:**
- Server returned relative URL `/api/objects/dev-upload/{id}` for local development
- Uppy AWS S3 plugin expects a full URL (with protocol and host) not a relative path
- The AWS S3 plugin tries to construct a URL object from the relative path, which fails

**Solution Steps:**
1. **Update server to return full URLs for dev uploads:**
   ```typescript
   // server/routes.ts - in /api/objects/upload endpoint
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
   ```

**Prevention:**
- Always return full URLs from server when dealing with file upload libraries
- Test file uploads in local development environment
- Add proper CORS headers for development endpoints

---

### **008 - Complete Upload System Failure: "Upload Failed" Generic Error (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- All file uploads show generic "Upload failed" error message
- IC photo uploads in check-in page failing
- Document uploads in guest check-in failing  
- Finance receipt/item photo uploads failing
- Console may show various Uppy-related errors

**Root Cause:**
- **Missing Server Implementation**: `/api/objects/upload` endpoint was calling non-existent `objectStorage.upload()` method
- **Wrong API Flow**: Client was generating upload URLs locally instead of requesting from server
- **Broken ObjectStorageService**: Server was trying to use Google Cloud Storage service without proper configuration
- **API Specification Mismatch**: Implementation didn't follow DEVELOPMENT_REFERENCE.md specification

**Complete Solution Steps:**

1. **Fix Server Upload Parameter Endpoint:**
   ```typescript
   // server/routes/objects.ts
   router.post("/api/objects/upload", async (req, res) => {
     try {
       // Generate unique upload ID
       const objectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
       
       // CRITICAL: Return full URL with protocol and host
       const protocol = req.protocol;
       const host = req.get('host');
       const uploadURL = `${protocol}://${host}/api/objects/dev-upload/${objectId}`;
       
       res.json({
         uploadURL: uploadURL,
         objectId: objectId
       });
     } catch (error) {
       console.error("Upload parameter error:", error);
       res.status(500).json({ message: error.message || "Failed to get upload URL" });
     }
   });
   ```

2. **Implement Local File Storage for Development:**
   ```typescript
   // server/routes/objects.ts
   router.put("/api/objects/dev-upload/:id", async (req, res) => {
     try {
       res.setHeader('Access-Control-Allow-Origin', '*');
       const { id } = req.params;
       
       // Simple local file storage
       const uploadsDir = path.join(process.cwd(), 'uploads');
       await fs.mkdir(uploadsDir, { recursive: true });
       const filePath = path.join(uploadsDir, id);
       
       // Handle different request body types
       let fileData: Buffer;
       if (Buffer.isBuffer(req.body)) {
         fileData = req.body;
       } else if (typeof req.body === 'string') {
         fileData = Buffer.from(req.body, 'binary');
       } else {
         fileData = Buffer.from(JSON.stringify(req.body));
       }
       
       await fs.writeFile(filePath, fileData);
       
       // Store metadata
       const metaPath = path.join(uploadsDir, `${id}.meta.json`);
       const metadata = {
         contentType: req.headers['content-type'] || 'application/octet-stream',
         filename: id,
         uploadDate: new Date().toISOString(),
         size: fileData.length
       };
       await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
       
       res.json({ message: "Upload successful", id: id, size: fileData.length });
     } catch (error) {
       console.error("Dev upload error:", error);
       res.status(500).json({ message: error.message || "Upload failed" });
     }
   });
   ```

3. **Fix Client Upload Parameter Requests:**
   ```typescript
   // client/src/components/*/upload-handlers
   const handleGetUploadParameters = async () => {
     try {
       // Request upload URL from server (not generate locally)
       const response = await fetch('/api/objects/upload', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({})
       });

       if (!response.ok) {
         throw new Error('Failed to get upload URL');
       }

       const data = await response.json();
       if (!data.uploadURL) {
         throw new Error('No upload URL returned from server');
       }

       return {
         method: 'PUT' as const,
         url: data.uploadURL, // Full URL from server
       };
     } catch (error) {
       console.error('Error getting upload parameters:', error);
       throw error;
     }
   };
   ```

4. **Implement File Serving for Uploads:**
   ```typescript
   // server/routes/objects.ts  
   router.get("/objects/uploads/:id", async (req, res) => {
     try {
       const { id } = req.params;
       const uploadsDir = path.join(process.cwd(), 'uploads');
       const filePath = path.join(uploadsDir, id);
       const metaPath = path.join(uploadsDir, `${id}.meta.json`);
       
       await fs.access(filePath);
       
       let contentType = 'application/octet-stream';
       try {
         const metaData = await fs.readFile(metaPath, 'utf8');
         const metadata = JSON.parse(metaData);
         contentType = metadata.contentType || contentType;
       } catch (metaError) {
         // Use default content type if no metadata
       }
       
       const fileData = await fs.readFile(filePath);
       res.setHeader('Content-Type', contentType);
       res.send(fileData);
     } catch (fileError) {
       res.status(404).json({ message: "Upload not found" });
     }
   });
   ```

**Verification Steps:**
1. **Test upload parameter endpoint:**
   ```bash
   curl -X POST http://localhost:5000/api/objects/upload -H "Content-Type: application/json" -d '{}'
   # Should return: {"uploadURL":"http://localhost:5000/api/objects/dev-upload/12345","objectId":"12345"}
   ```

2. **Check file storage:**
   ```bash
   ls uploads/  # Should show uploaded files and .meta.json files
   ```

3. **Test in browser:**
   - Go to check-in page
   - Try uploading IC photo
   - Should show "Photo uploaded Document photo uploaded successfully"

**Files Modified:**
- `server/routes/objects.ts` - Fixed upload endpoints
- `client/src/components/check-in/IdentificationPersonalSection.tsx` - Fixed client handler
- `client/src/hooks/guest-checkin/useDocumentUpload.ts` - Fixed document upload hook
- `client/src/pages/guest-checkin.tsx` - Fixed guest check-in uploads

**Prevention:**
- Always follow API specification in DEVELOPMENT_REFERENCE.md
- Test server endpoints independently before client integration
- Implement proper error handling and logging for upload failures
- Use server-generated upload URLs instead of client-generated ones
- Ensure CORS headers are properly configured for cross-origin uploads

---

### **004 - Settings page runtime error: CapsulesTab is not defined (SOLVED)**

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

**Files Modified:**
- `client/src/pages/settings.tsx`

---

### **003 - Problem Deletion Shows Success But Doesn't Delete (SOLVED)**

**Date Solved:** August 9, 2025  
**Symptoms:**
- "Problem Deleted" success message appears when deleting active problems
- Problem remains visible in active problems list even after refresh
- Delete action appears to succeed but has no effect

**Root Cause:**
- Frontend sends DELETE request to `/api/problems/${id}`
- Server route handler for DELETE `/api/problems/:id` was missing completely
- Frontend shows success message from mutation, but server returns 404 (not found)

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

2. **Add deleteProblem method to storage interface and implement in both storage classes**

**Files Modified:**
- `server/routes.ts` - Added DELETE endpoint for problems
- `server/storage.ts` - Added deleteProblem interface and implementations

---

### **002 - Active Problems Not Displaying (SOLVED)**

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

**Files Modified:**
- `client/src/pages/settings.tsx` - Fixed problems query and data extraction

---

### **001 - Connection Problem / Server Crashes (SOLVED)**

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

**Technical Fix Applied:**
- Modified `server/index.ts` error middleware to log errors without rethrowing
- Before: `res.status(status).json({ message }); throw err;` (crashed server)
- After: Logs error context and returns JSON response safely

**Files Modified:**
- `server/index.ts` - Fixed error middleware to prevent server crashes

---

## 🚨 **COMMON ISSUES REFERENCE**

### **Network/Connection Errors**
- **"Connection Problem" toast** → Server likely crashed, restart with clean env
- **"Failed to fetch" in DevTools** → Server process terminated, check error middleware
- **Login works but other pages fail** → Partial server crash, restart required

### **Authentication Issues**
- **"Login failed" with correct credentials** → Server crash during auth, restart server
- **Redirected to login on protected pages** → Clear `auth_token` from localStorage
- **API returns 401 on valid requests** → Token expired or corrupted, re-login

### **Development Setup**
- **Server won't start** → Check Node.js version (requires 18+), run `npm install`
- **Port 5000 busy** → Set `PORT=5001` in `.env` file
- **Database connection errors** → Remove `DATABASE_URL` env var for in-memory mode

---

## 🔍 **DIAGNOSTIC COMMANDS**

### **Check Server Health**
```powershell
# Test public endpoints
Invoke-WebRequest http://localhost:5000/api/capsules/available
Invoke-WebRequest http://localhost:5000/api/guests/checked-in

# Test authentication
$body = @{ email = 'admin@pelangi.com'; password = 'admin123' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -Body $body -ContentType 'application/json'
```

### **Environment Reset**
```powershell
# Force in-memory storage mode
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue

# Clean restart
npm run dev
```

### **Browser Debug**
```javascript
// Check stored auth token
localStorage.getItem('auth_token')

// Clear auth token
localStorage.removeItem('auth_token')
```

---

## 📋 **SUCCESS PATTERNS**

### **Working Development Flow**
1. Start server: `npm run dev`
2. Wait for "serving on port 5000" message
3. Visit http://localhost:5000
4. Login with admin@pelangi.com / admin123
5. All features should work without connection errors

### **When to Restart Server**
- After pulling code changes
- When seeing "Connection Problem" toasts
- After modifying server-side files
- When switching between database/in-memory modes

---

## 🚨 **PORT 5000 EADDRINUSE TROUBLESHOOTING**

### **Quick Fixes**
```powershell
# Option 1: Kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Option 2: Use different port
$env:PORT=5001; npm run dev

# Option 3: Restart terminal/computer
```

---

## 🔧 **BUILD AND DEVELOPMENT SERVER ISSUES**

### **Vite Build Problems**
- **Build fails** → Check TypeScript errors, run `npm run check`
- **Hot reload not working** → Restart dev server, check file watchers
- **Assets not loading** → Clear browser cache, check build output

### **Development Server Issues**
- **Server won't start** → Check port availability, Node.js version
- **Changes not reflecting** → Suspect build artifacts, clear dist/ directory
- **Memory issues** → Restart server, check for memory leaks

---

**Document Control:**
- **Maintained By:** Development Team
- **Last Updated:** January 2025
- **Next Review:** When new issues arise

*This master guide consolidates all troubleshooting knowledge for quick problem resolution.*
