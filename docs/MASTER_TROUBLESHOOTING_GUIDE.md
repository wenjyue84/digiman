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

### **009 - Finance Page Crash & Expense Creation Errors (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Finance page shows "Something went wrong" error with error ID (e.g., error_1755734762244_3m5bb9sqr)
- Expense creation fails with "401: Invalid or expired token" error
- Page completely crashes when trying to access /finance
- Error boundary catches JavaScript errors during component rendering

**Root Causes:**
1. **ObjectUploader Component Issues**: The Uppy-based photo upload component has dependency conflicts
2. **Authentication Token Expiry**: Session tokens expire and need refresh
3. **Storage Method Mismatch**: Backend methods `createExpense`/`getAllExpenses` vs interface methods `addExpense`/`getExpenses`

**SOLUTION:**
```bash
# 1. Fix authentication - logout and login again
# In browser: Click profile > Logout > Login again

# 2. Clear browser storage if needed
# DevTools > Application > Storage > Clear

# 3. Temporarily disable photo uploads (already fixed in code)
# ObjectUploader components replaced with disabled buttons

# 4. Fixed backend storage method names
# Changed routes to use correct IStorage interface methods
```

**Files Modified:**
- `client/src/pages/finance.tsx` - Disabled ObjectUploader components
- `server/routes/expenses.ts` - Fixed method names (createExpense → addExpense, getAllExpenses → getExpenses)

**Prevention:**
- Regular session refresh for long-running sessions
- Monitor Uppy dependency updates for breaking changes
- Ensure storage interface consistency between routes and implementations

---

### **009 - Finance Page Crash & Expense Creation Errors (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Finance page shows "Something went wrong" error with error ID (e.g., error_1755734762244_3m5bb9sqr)
- Expense creation fails with "401: Invalid or expired token" error
- Page completely crashes when trying to access /finance
- Error boundary catches JavaScript errors during component rendering
- TypeError: G.toFixed is not a function

**Root Causes:**
1. **ObjectUploader Component Issues**: The Uppy-based photo upload component has dependency conflicts
2. **Authentication Token Expired**: User session has expired and needs fresh login
3. **Backend Method Mismatch**: API calls wrong storage methods (createExpense vs addExpense)
4. **Amount Type Error**: Expense amounts stored as strings but .toFixed() called on them

**Complete Solution:**
1. **Fix Amount Parsing Issues** (Main fix):
   ```typescript
   // Add parseAmount helper function in finance.tsx:
   const parseAmount = (amount: any): number => {
     if (typeof amount === 'number') return amount;
     if (typeof amount === 'string') return parseFloat(amount) || 0;
     return 0;
   };
   
   // Replace all amount calculations:
   expense.amount.toFixed(2) → parseAmount(expense.amount).toFixed(2)
   .reduce((sum, exp) => sum + (exp.amount || 0), 0) → 
   .reduce((sum, exp) => sum + parseAmount(exp.amount), 0)
   ```

2. **Fix Backend Storage Methods** (server/routes/expenses.ts):
   ```typescript
   // Change method names to match IStorage interface:
   storage.getAllExpenses() → storage.getExpenses()
   storage.createExpense() → storage.addExpense()
   ```

3. **Add Error Reporting Endpoint** (server/routes/index.ts):
   ```typescript
   app.post("/api/errors/report", async (req, res) => {
     const errorReport = req.body;
     if (process.env.NODE_ENV === 'development') {
       console.log('🐛 Client Error Report:', JSON.stringify(errorReport, null, 2));
     }
     res.json({ success: true, message: 'Error report received' });
   });
   ```

4. **Temporarily Disable Photo Upload** (if ObjectUploader causes issues):
   ```typescript
   // Comment out ObjectUploader imports and usage
   // Replace with disabled buttons until Uppy dependencies are fixed
   ```

5. **Authentication Fix**:
   - Log out and log back in (admin@pelangi.com / admin123)
   - Clear localStorage auth_token if needed
   - Restart server: `npm run build && npm run dev`

**Test Steps:**
1. Go to http://localhost:5000/finance
2. Add expense (description, amount, category, date)
3. Should create successfully without crashes
4. Amount displays correctly in table

**Prevention:**
- Always use parseAmount() helper for any amount calculations
- Ensure backend storage method names match IStorage interface
- Include error reporting endpoint in all deployments

---

### **017 - Pagination Bug Breaking Client Analytics (SOLVED)**

**Date Solved:** August 21, 2025  
**Symptoms:**
- `GET /api/expenses` endpoint always applies default pagination (page 1, limit 20)
- Client only receives first 20 expenses instead of complete dataset
- Existing client-side analytics, filtering, and sorting features broken
- Finance page shows incomplete expense data

**Root Cause:**
```typescript
// BEFORE: Always forced pagination
const page = parseInt(req.query.page as string) || 1;        // Always defaulted to 1
const limit = parseInt(req.query.limit as string) || 20;     // Always defaulted to 20
const expenses = await storage.getExpenses({ page, limit }); // Always paginated
```

**Solution Implemented:**
```typescript
// AFTER: Pagination only when explicitly requested
const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;

if (hasPagination) {
  // Apply pagination when client requests it
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const expenses = await storage.getExpenses({ page, limit });
  res.json(expenses);
} else {
  // Return all expenses for backward compatibility
  const expenses = await storage.getExpenses();
  res.json(expenses);
}
```

**Benefits:**
✅ **Backward Compatibility**: Existing clients get all expenses as before  
✅ **Pagination Support**: New clients can request paginated results  
✅ **Analytics Fixed**: Client-side filtering and sorting work again  
✅ **Performance**: No unnecessary pagination overhead when not needed  

**Files Modified:**
- `server/routes/expenses.ts` - Fixed pagination logic and duplicate `id` parameter issue

**Prevention:**
- Only apply pagination when client explicitly requests it
- Maintain backward compatibility for existing API consumers
- Test both paginated and non-paginated scenarios

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

## 🗄️ **DATABASE CONSTRAINT VIOLATION ERRORS**

### **009 - Database Constraint Violation on Test Notification (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Error: `"null value in column \"key\" of relation \"app_settings\" violates not-null constraint"`
- HTTP 400 error when clicking "Send Test Notification"
- Database constraint violation preventing notification testing
- Settings not being saved properly

**Root Cause:**
- **Null Key Values**: Code attempting to save settings with null/undefined key values
- **Missing Validation**: Server-side validation not preventing invalid data
- **Automatic Saving**: Some automatic preference saving triggered during test notification
- **Database Constraints**: PostgreSQL enforcing NOT NULL constraint on app_settings.key column

**Solution Implemented:**
1. **Client-Side Validation**: Added proper key format for notification preferences
2. **Server-Side Validation**: Enhanced settings route to validate key/value parameters
3. **Storage Layer Validation**: Added validation in DatabaseStorage and MemStorage
4. **Error Handling**: Better error categorization for database constraint violations
5. **Preference Saving**: Fixed notification preferences to use proper key format

**Error Prevention:**
- **Input Validation**: All settings must have non-empty string keys
- **Type Safety**: Values are converted to strings before database storage
- **Key Format**: Notification preferences use `notification.{preferenceName}` format
- **Error Messages**: Clear error messages for constraint violations

**Testing & Verification:**
```javascript
// Check if settings are being saved properly
console.log('Notification preferences:', preferences);

// Verify API calls have proper key/value format
fetch('/api/settings', {
  method: 'PATCH',
  body: JSON.stringify({
    key: 'notification.guestCheckIn', // ✅ Proper format
    value: 'true'                     // ✅ String value
  })
});
```

**Prevention:**
- **Always validate inputs** before database operations
- **Use consistent key naming** conventions
- **Test database operations** with edge cases
- **Monitor constraint violations** in logs

---

## 🔑 **INVALID KEY ERRORS**

### **010 - Invalid Key Error During Test Notification (INVESTIGATING)**

**Date Identified:** January 2025  
**Symptoms:**
- Error: `400: {"message":"Setting key is required and must be a non-empty string","error":"INVALID_KEY"}`
- Occurs when clicking "Send Test Notification"
- Server-side validation catching invalid data before database
- No database constraint violations (validation working)

**Root Cause (Under Investigation):**
- **Unknown Source**: Some code is calling `/api/settings` with null/undefined key
- **Not from Preferences**: `handlePreferencesChange` has proper validation
- **Not from Test Function**: `handleTestNotification` doesn't call settings API
- **Possible External Code**: Another component or hook might be interfering

**Current Investigation:**
1. **Added Debug Logging**: Track all preference changes and API calls
2. **Fetch Interceptor**: Monitor unexpected settings API calls during tests
3. **Test Progress Flag**: Prevent preference saving during test notifications
4. **Enhanced Validation**: Better error handling for invalid keys

**Debug Information:**
```javascript
// Check browser console for these logs:
🔧 handlePreferencesChange called with: { key, value, isTestInProgress }
🚨 INTERCEPTED SETTINGS API CALL during test: { url, options }
📝 Request body: { key, value }
❌ INVALID KEY DETECTED: undefined
```

**Temporary Workaround:**
- **Refresh the page** before testing notifications
- **Check browser console** for debug information
- **Report exact error** to support team

**Next Steps:**
- **Identify source** of invalid API calls
- **Fix root cause** of automatic preference saving
- **Remove temporary** fetch interceptor
- **Add permanent** prevention measures

---

## 🔐 **AUTHENTICATION ERRORS**

### **011 - 401 Unauthorized During Test Notification (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Error: `401: {"message":"Invalid or expired token"}`
- Occurs when clicking "Send Test Notification"
- Authentication error preventing notification testing
- Push notification routes expect no authentication

**Root Cause:**
- **Fetch Interceptor Issue**: Temporary debug interceptor was interfering with push API calls
- **Route Configuration**: Push notification routes (`/api/push/*`) don't require authentication
- **Client Side**: Test notification was being intercepted and modified by debug code
- **Server Side**: Server was rejecting requests with unexpected auth headers

**Solution Implemented:**
1. **Fixed Fetch Interceptor**: Modified to only intercept `/api/settings` calls, not push API calls
2. **Enhanced Error Handling**: Added specific 401 error categorization and user guidance
3. **Route Isolation**: Ensured push notification routes remain unauthenticated
4. **Better User Feedback**: Clear troubleshooting steps for authentication issues

**Technical Details:**
```javascript
// BEFORE: Interceptor was affecting ALL fetch calls
window.fetch = async (...args) => { /* intercepts everything */ };

// AFTER: Only intercept settings API calls
if (typeof url === 'string' && url.includes('/api/settings')) {
  // Only intercept settings calls
}
// Push API calls use original fetch
return originalFetch(...args);
```

**Error Categories Added:**
- **Authentication Required**: Session expired or login needed
- **Clear Troubleshooting**: Refresh page, log in again, clear cache
- **User Action Required**: Specific steps to resolve authentication issues

**Testing & Verification:**
- ✅ Test notification works without authentication
- ✅ Settings API calls are still monitored for debugging
- ✅ No interference with push notification functionality
- ✅ Clear error messages for authentication issues

**Prevention:**
- **Route Isolation**: Keep push routes unauthenticated
- **Selective Interception**: Only intercept specific API endpoints
- **Clear Error Messages**: Provide actionable troubleshooting steps
- **Test Authentication**: Verify routes work with/without auth as expected

---

## 🔔 **NOTIFICATION PERMISSION TROUBLESHOOTING**

### **Understanding Notification Permissions**

**What are Notification Permissions?**
Notification permissions are a web browser security feature that controls whether websites can send push notifications to users. This is a privacy protection mechanism that prevents websites from sending unwanted notifications without user consent.

**Why Do Permissions Get Denied?**

#### **1. User Action (Most Common)**
- **Previous Denial**: User previously clicked "Block" when browser asked for permission
- **Accidental Click**: User accidentally clicked "Block" instead of "Allow"
- **Misunderstanding**: User thought "Block" would stop the popup, not permanently deny access

#### **2. Browser Settings**
- **Global Disable**: Browser has notifications globally turned off
- **Site-Specific Block**: This specific site is blocked in browser's site settings
- **Privacy Mode**: User is browsing in incognito/private mode
- **Browser Version**: Outdated browser doesn't support modern notification APIs

#### **3. System-Level Issues**
- **Operating System**: Windows/Mac has notifications disabled
- **Do Not Disturb**: System is in "Do Not Disturb" mode
- **Focus Assist**: Windows Focus Assist is blocking notifications
- **System Updates**: Recent OS update changed notification settings

#### **4. Extension Interference**
- **Ad Blockers**: uBlock Origin, AdBlock Plus block notification requests
- **Privacy Extensions**: Privacy Badger, Ghostery block tracking/notifications
- **VPN Extensions**: Some VPNs block certain web features
- **Security Extensions**: Malware blockers may block notification APIs

#### **5. Network/Corporate Issues**
- **Corporate Firewall**: Company network blocks push notification services
- **School/University**: Educational institutions often block notifications
- **Public WiFi**: Some public networks block certain web features
- **ISP Restrictions**: Internet service provider blocking push services

### **Browser-Specific Solutions**

#### **🌐 Google Chrome / Microsoft Edge**
```text
1. Click the lock/info icon 🔒 in the address bar
2. Click "Site settings" or "Permissions"
3. Find "Notifications" in the list
4. Change from "Block" to "Allow"
5. Refresh the page
6. Alternative: chrome://settings/content/notifications
```

#### **🦊 Mozilla Firefox**
```text
1. Click the shield icon 🛡️ in the address bar
2. Click "Site Permissions" → "Notifications"
3. Change from "Block" to "Allow"
4. Refresh the page
5. Alternative: about:preferences#privacy
```

#### **🍎 Safari (Mac)**
```text
1. Safari → Preferences → Websites → Notifications
2. Find this site in the list
3. Change from "Deny" to "Allow"
4. Refresh the page
5. Alternative: System Preferences → Notifications → Safari
```

#### **🌍 Other Browsers**
- **Opera**: opera://settings/content/notifications
- **Brave**: brave://settings/content/notifications
- **Vivaldi**: vivaldi://settings/content/notifications

### **System-Level Solutions**

#### **Windows 10/11**
```text
1. Settings → System → Notifications & actions
2. Turn on "Get notifications from apps and other senders"
3. Turn on "Show notifications on the lock screen"
4. Check "Focus assist" settings
5. Ensure "Do not disturb" is off
```

#### **macOS**
```text
1. System Preferences → Notifications & Focus
2. Select your browser (Chrome, Firefox, Safari)
3. Ensure notifications are enabled
4. Check "Do Not Disturb" settings
5. Verify "Focus" modes aren't blocking notifications
```

#### **Linux**
```text
1. Check notification daemon (e.g., dunst, notify-osd)
2. Ensure desktop environment notifications are enabled
3. Check system notification settings
4. Verify browser has notification permissions
```

### **Extension Troubleshooting**

#### **Common Problematic Extensions**
- **Ad Blockers**: uBlock Origin, AdBlock Plus, AdGuard
- **Privacy Tools**: Privacy Badger, Ghostery, DuckDuckGo Privacy
- **Security**: Malwarebytes, Norton, McAfee
- **VPN**: NordVPN, ExpressVPN, ProtonVPN extensions

#### **Testing Steps**
```text
1. Open browser in incognito/private mode (extensions disabled)
2. Test notification permission request
3. If it works, an extension is blocking it
4. Disable extensions one by one to identify the culprit
5. Add the site to extension whitelist if possible
```

### **Advanced Troubleshooting**

#### **Reset Site Permissions**
```text
Chrome/Edge:
1. chrome://settings/content/notifications
2. Find this site
3. Click the trash icon to remove
4. Refresh page and try again

Firefox:
1. about:preferences#privacy
2. Site Permissions → Notifications
3. Remove the site entry
4. Refresh page and try again
```

#### **Clear Browser Data**
```text
1. Clear cookies and site data for this domain
2. Clear browser cache
3. Restart browser
4. Try permission request again
```

#### **Check Console for Errors**
```javascript
// Open browser console (F12) and check for:
console.log('Notification permission:', Notification.permission);
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Push Manager:', 'PushManager' in window);

// Common error messages:
// - "Permission denied"
// - "Service worker not found"
// - "Push subscription failed"
```

### **Prevention Strategies**

#### **For Users**
- **Understand the Request**: Read what the browser is asking for
- **Don't Rush**: Take time to understand permission requests
- **Use Supported Browsers**: Chrome, Firefox, Edge, Safari
- **Keep Updated**: Regular browser and OS updates
- **Check Extensions**: Be aware of what extensions might block

#### **For Developers**
- **Clear Messaging**: Explain why notifications are needed
- **Graceful Fallbacks**: Handle permission denial gracefully
- **User Education**: Provide clear troubleshooting steps
- **Progressive Enhancement**: App works without notifications
- **Testing**: Test on multiple browsers and devices

### **When All Else Fails**

#### **Alternative Solutions**
1. **Different Browser**: Try Chrome, Firefox, or Edge
2. **Different Device**: Test on mobile or another computer
3. **Contact Support**: Provide detailed error information
4. **Manual Check**: Check notifications manually in the app
5. **Email Alerts**: Use email notifications as backup

#### **Support Information to Provide**
- Browser name and version
- Operating system and version
- Error messages from console
- Steps already tried
- Screenshots of permission dialogs
- Extension list

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

### **Replit-Specific Issues**
- **ENOENT: no such file or directory, stat '/home/runner/workspace/dist/public/index.html'** → Missing build artifacts, need to run build command

---

## 🚀 **SERVER STARTUP AND GIT SYNC ISSUES**

### **012 - Server Won't Start After Git Sync (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Server fails to start with syntax errors after syncing with GitHub
- Error: `SyntaxError: The requested module './routes' does not provide an export named 'registerObjectRoutes'`
- `localhost:5000` shows "ERR_CONNECTION_REFUSED"
- Terminal shows corrupted import statements or syntax errors

**Root Cause:**
- **Git Sync Corruption**: Files may get corrupted during Git sync operations
- **Import/Export Mismatch**: Module exports not properly synchronized
- **TypeScript Compilation Issues**: Build artifacts may be corrupted
- **File Encoding Problems**: Special characters or encoding issues from Git

**Solution Implemented:**
1. **Clean Environment Reset**:
   ```powershell
   # Kill any existing processes
   npx kill-port 5000
   
   # Restart development server
   npm run dev
   ```

2. **Verify File Integrity**:
   - Check that `server/routes/index.ts` exports `registerObjectRoutes`
   - Ensure `server/index.ts` imports correctly
   - Verify no corrupted characters in import statements

3. **Server Restart Process**:
   - Always restart server after Git sync operations
   - Wait for "serving on port 5000" confirmation
   - Check terminal for any syntax errors before proceeding

**Prevention Steps:**
- Restart development server after every Git sync
- Check terminal output for syntax errors
- Verify server starts successfully before testing features
- Keep backup of working server files

**Troubleshooting Flow:**
1. **Immediate Action**: Restart development server with `npm run dev`
2. **Check Terminal**: Look for syntax errors or import issues
3. **Verify Port**: Ensure port 5000 is available and server starts
4. **Test Connection**: Visit `localhost:5000` to confirm server is running
5. **Check Features**: Verify push notifications and other features work

---

## 🚀 **REPLIT AND DEPLOYMENT ISSUES**

### **013 - Replit ENOENT: Missing Build Artifacts (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Error: `{"message":"ENOENT: no such file or directory, stat '/home/runner/workspace/dist/public/index.html'"}`
- Server starts but fails to serve the frontend application
- Browser shows server error instead of React app
- Occurs in Replit environment after code changes or deployment

**Root Cause:**
- **Missing Build Directory**: The `dist/` directory containing compiled frontend files doesn't exist
- **Build Process Not Run**: Frontend code hasn't been compiled from TypeScript/JSX to static HTML/CSS/JS
- **Replit Environment**: Replit may not automatically run build commands on startup
- **File System Issues**: Build artifacts may have been cleared or corrupted

**Solution Implemented:**
1. **Run Build Command**:
   ```bash
   # In Replit terminal
   npm run build
   ```

2. **Verify Build Output**:
   ```bash
   # Check if dist directory exists
   ls -la dist/
   
   # Should show:
   # dist/
   # └── public/
   #     ├── index.html
   #     ├── assets/
   #     └── ...
   ```

3. **Start Server After Build**:
   ```bash
   # After successful build
   npm run dev
   ```

**Alternative Solutions:**
1. **Force Clean Build**:
   ```bash
   # Remove existing build artifacts
   rm -rf dist/
   
   # Rebuild from scratch
   npm run build
   ```

2. **Check Package.json Scripts**:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "dev": "tsx watch --clear-screen=false server/index.ts"
     }
   }
   ```

3. **Replit Configuration**:
   - Ensure `.replit` file has correct run command
   - Check if build command is set to run on startup
   - Verify file structure matches expected paths

**Prevention Steps:**
- **Always run `npm run build`** before starting server in Replit
- **Check build output** for any compilation errors
- **Verify dist/ directory** exists and contains expected files
- **Run build after major code changes** or dependency updates

**Troubleshooting Flow:**
1. **Check Build Status**: Look for `dist/` directory in file explorer
2. **Run Build Command**: Execute `npm run build` in terminal
3. **Verify Output**: Ensure `dist/public/index.html` exists
4. **Start Server**: Run `npm run dev` after successful build
5. **Test Application**: Visit the app to confirm it loads correctly

**Common Replit Issues:**
- **Build fails**: Check TypeScript errors, missing dependencies
- **Port conflicts**: Replit may use different ports than localhost
- **File permissions**: Ensure build process can write to workspace
- **Memory limits**: Large builds may exceed Replit memory constraints

---

---

### **014 - "Show All Capsules" Checkbox Not Visible After Code Changes (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Added new "Show all capsules" checkbox in Filter Guests section
- Code changes appear to be made but aren't reflected in the UI
- Checkbox still not visible in Dashboard > Filter Guests popover
- Browser shows old version without the new feature
- Similar to other frontend changes not reflecting issues

**Root Cause:**
- **Build Artifacts Issue**: The `dist/` directory contains outdated compiled JavaScript code
- **Vite Middleware Serving Old Code**: Server using Vite middleware serves from compiled build artifacts, not source code
- **Source vs Compiled Mismatch**: Even after adding new checkbox component, old compiled versions are still being served
- **Build Process Dependency**: The `npm run build` script generates compiled code that must be updated after source changes

**Solution Implemented:**
1. **Stop Development Server:**
   ```powershell
   # Ctrl+C to stop server
   # Or kill all Node processes
   taskkill /F /IM node.exe
   ```

2. **Clean Build Artifacts:**
   ```powershell
   # Remove compiled code directory
   Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
   ```

3. **Rebuild Application:**
   ```powershell
   npm run build
   # Wait for successful build completion
   ```

4. **Start Fresh Server:**
   ```powershell
   npm run dev
   # Wait for "serving on port 5000" message
   ```

**Verification Steps:**
1. **Check Build Success**: Ensure no errors during build process
2. **Verify Server Start**: Confirm server starts without port conflicts
3. **Test New Feature**: Navigate to Dashboard > Filter Guests > Look for "Capsule Display" section
4. **Confirm Checkbox Visible**: "Show all capsules" checkbox should now be visible with building icon

**Technical Details:**
- **Vite Middleware Setup**: Server configured with `setupVite()` in `server/vite.ts`
- **Build Process**: Frontend compiled from TypeScript/JSX to static assets in `dist/public/`
- **Serving Strategy**: Server serves compiled React app, not source code directly
- **Hot Reload**: Not available in production build mode, requires manual rebuild

**Prevention Steps:**
- **Always rebuild after major component changes**: `npm run build`
- **Clear build artifacts when changes don't reflect**: Remove `dist/` directory
- **Follow the build process**: Source changes → Rebuild → Test
- **Check build output**: Ensure no compilation errors before starting server

**Related Issues:**
- **Problem #007**: Frontend Changes Not Reflecting Due to Build Artifacts
- **Problem #013**: Replit ENOENT: Missing Build Artifacts
- **Port 5000 EADDRINUSE**: Address already in use errors

**Troubleshooting Flow:**
1. **Identify Issue**: Frontend changes not reflecting in UI
2. **Check Build Status**: Look for `dist/` directory and build artifacts
3. **Clean Environment**: Remove old compiled code
4. **Rebuild Application**: Run `npm run build` successfully
5. **Start Server**: Run `npm run dev` and wait for confirmation
6. **Test Changes**: Verify new features are now visible

---

### **015 - Calendar Not Displaying All Dates (SOLVED)**

**Date Solved:** January 2025  
**Symptoms:**
- Occupancy calendar only shows partial dates (e.g., 27/7, 28/7, 29/7, 30/7, 31/7, 1/8)
- Missing most August dates (2/8, 3/8, 4/8... 31/8)
- Calendar appears to only show end of previous month and beginning of current month
- Changes to calendar component code don't reflect in UI

**Root Cause:**
- **Wrong react-day-picker API Usage**: Using invalid `components={{ DayContent: ... }}` prop
- **Null Return Values**: `getDayContent` function returned `null` for dates without data
- **Component Integration Issue**: react-day-picker v8 doesn't support `DayContent` component override
- **Build Artifacts Problem**: Old compiled calendar code served despite source changes

**Solution Implemented:**

1. **Fixed react-day-picker Integration:**
   ```typescript
   // BEFORE: Invalid component override (caused dates to not render)
   <Calendar
     components={{
       DayContent: ({ date }) => getDayContent(date), // ❌ Wrong API
     }}
   />
   
   // AFTER: Proper modifiers approach
   <Calendar
     modifiers={{
       hasCheckins: (date) => {
         const dateString = date.toISOString().split('T')[0];
         const dayData = calendarData[dateString];
         return dayData && dayData.checkins.length > 0;
       },
       hasCheckouts: (date) => { /* similar logic */ },
       highOccupancy: (date) => { /* occupancy > 80% */ },
       // ... other modifiers
     }}
     modifiersClassNames={{
       hasCheckins: "relative after:absolute after:top-0 after:right-0 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full",
       hasCheckouts: "relative before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-red-500 before:rounded-full",
       // ... other styling
     }}
   />
   ```

2. **Removed Problematic getDayContent Function:**
   ```typescript
   // BEFORE: Function that returned null for dates without data
   const getDayContent = (date: Date) => {
     const dayData = calendarData[dateString];
     if (!dayData) return null; // ❌ This prevented dates from rendering
     // ... rest of function
   };
   
   // AFTER: Removed entirely, using modifiers instead
   ```

3. **Applied Build Artifacts Fix:**
   ```powershell
   # Kill port conflicts
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   
   # Clean build artifacts
   Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
   
   # Rebuild with calendar changes
   npm run build
   
   # Start on different port
   $env:PORT=5001; npm run dev
   ```

**Technical Details:**
- **react-day-picker v8.10.1**: Uses `modifiers` and `modifiersClassNames` for customization
- **Component Override**: `DayContent` component is not a valid prop in v8
- **Date Rendering**: Calendar must always render valid JSX for each date
- **CSS Approach**: Used Tailwind classes with pseudo-elements for visual indicators

**Visual Indicators Implemented:**
- ✅ **Green dots (top-right)**: Check-ins
- ✅ **Red dots (top-left)**: Check-outs  
- ✅ **Orange bars (bottom)**: 80%+ occupancy
- ✅ **Red bars (bottom)**: 100% occupancy
- ✅ **Blue dots (top-center)**: Festivals
- ✅ **Green dots (top-center)**: Public holidays

**Verification Steps:**
1. **Check All Dates Visible**: August calendar shows 1, 2, 3... 31
2. **Test Visual Indicators**: Dates with data show appropriate colored indicators
3. **Verify Month Navigation**: Can navigate between months properly
4. **Confirm Date Selection**: Clicking dates shows detailed information

**Files Modified:**
- `client/src/components/occupancy-calendar.tsx` - Fixed calendar integration
- Build artifacts cleaned and regenerated

**Prevention:**
- **Use correct react-day-picker API**: Always check documentation for component props
- **Test calendar components**: Ensure all dates render regardless of data availability
- **Follow build process**: Clean artifacts → Rebuild → Test after major component changes
- **Avoid null returns**: Calendar components should always return valid JSX

**Related Issues:**
- **Problem #007**: Frontend Changes Not Reflecting Due to Build Artifacts
- **Problem #014**: "Show All Capsules" Checkbox Not Visible After Code Changes
- **Port EADDRINUSE**: Address already in use errors

---

### **016 - System Updates Section Not Displaying After Code Addition (SOLVED)**

**Date Solved:** August 21, 2025  
**Symptoms:**
- Added new "System Updates" section to Settings > Tests page with recent development history
- Code changes made to `TestsTab.tsx` component but not visible in UI
- Section includes latest features like push notification enhancements, calendar fixes, etc.
- Browser shows old version without the new System Updates section

**Root Cause:**
- **Build Artifacts Issue**: The `dist/` directory contained outdated compiled JavaScript code
- **Forgot to Rebuild**: Developer made source code changes but forgot to run build process
- **Vite Middleware Serving Old Code**: Server serves compiled build artifacts, not source code
- **Classic Problem #007 Pattern**: Same root cause as "Frontend Changes Not Reflecting Due to Build Artifacts"

**Solution Applied (Following Problem #007 Pattern):**
1. **Kill Development Server:**
   ```bash
   npx kill-port 5000
   # Successfully killed process on port 5000
   ```

2. **Clean Build Artifacts:**
   ```bash
   rm -rf dist
   # Removed outdated compiled code directory
   ```

3. **Rebuild Application:**
   ```bash
   npm run build
   # Build completed successfully in 12.66s
   # Generated new compiled code with System Updates section
   ```

4. **Start Fresh Server:**
   ```bash
   npm run dev
   # Server started successfully on port 5000
   # "8:58:15 AM [express] serving on port 5000"
   ```

**Verification Results:**
- ✅ Build completed without errors
- ✅ Server started successfully with in-memory storage
- ✅ System Updates section now visible in Settings > Tests
- ✅ All recent development history properly displayed

**System Updates Content Added:**
- **System Updates Feature Added** (Today) - This new feature itself
- **Push Notification Test Enhancement** (January 2025) - Enhanced error handling
- **Calendar Display Fix** (January 2025) - Fixed react-day-picker API usage
- **Upload System Complete Rebuild** (January 2025) - Fixed file upload system
- **Storage System Modular Refactoring** (August 2025) - 96% code reduction
- **Component Refactoring Success** (August 2025) - Large component optimization

**Key Learning:**
- **Always remember to rebuild** after making frontend component changes
- **Classic symptom pattern**: Code changes not reflecting = build artifacts issue
- **Standard solution works**: Kill server → Clean dist → Rebuild → Restart
- **Prevention**: Include rebuild step in development workflow for major changes

**Files Modified:**
- `client/src/components/settings/TestsTab.tsx` - Added System Updates section
- Build artifacts cleaned and regenerated with new content

**Prevention Steps:**
- **Remember to rebuild** after adding new components or major UI changes
- **Follow the pattern**: Source changes → Build → Test
- **Check troubleshooting guide** when changes don't reflect
- **Use Problem #007 solution** for similar build artifacts issues

**Success Pattern Confirmed:**
This case validates that Problem #007's solution pattern is reliable and should be the first approach when frontend changes don't appear in the UI. The exact same steps resolved the issue quickly and effectively.

---

**Document Control:**
- **Maintained By:** Development Team
- **Last Updated:** August 21, 2025
- **Next Review:** When new issues arise

*This master guide consolidates all troubleshooting knowledge for quick problem resolution.*
