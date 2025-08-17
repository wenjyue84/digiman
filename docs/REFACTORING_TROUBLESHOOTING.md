# Routes.ts Refactoring Troubleshooting Guide

## Overview
This document captures the complete process and troubleshooting steps from refactoring a monolithic 2,756-line `routes.ts` file into a modular architecture with 97% code reduction.

## Refactoring Results
- **Before:** 2,756 lines in single file
- **After:** 79 lines main file + 12 focused modules (1,449 total lines)
- **Reduction:** 97% main file reduction, 45% overall code reduction
- **Routes Organized:** 70+ routes across 12 modules

## Common Issues & Solutions

### 1. ERR_CONNECTION_REFUSED - Server Not Starting

**Problem:** `localhost refused to connect` error

**Causes & Solutions:**
```bash
# Issue: Server not running
npm run dev

# Issue: Port conflict
npx kill-port 5000
npm run dev

# Issue: Process stuck
tasklist | findstr node
taskkill /F /PID <process_id>
```

### 2. Client Build Issues

**Problem:** `ENOENT: no such file or directory, stat 'client/dist/index.html'`

**Solution:**
```bash
# Build the client first
npm run build

# Check build output location
ls dist/public/  # Should contain index.html and assets/

# Update server paths if needed
# In routes.ts:
app.use(express.static(path.join(process.cwd(), "dist/public")));
res.sendFile(path.join(process.cwd(), "dist/public/index.html"));
```

### 3. Authentication Issues

**Problem:** `{"message":"Invalid credentials"}` with correct-looking credentials

**Solution:**
```bash
# Check the actual admin password in storage.ts
grep -n "password.*admin" server/storage.ts

# Default credentials:
# Email: admin@pelangi.com  
# Password: admin123 (not 'admin')
```

**Test Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pelangi.com","password":"admin123"}'
```

### 4. Module Import Errors

**Problem:** TypeScript compilation errors with @shared imports

**Root Cause:** Path configuration in tsconfig.json

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### 5. Route Registration Issues

**Problem:** Routes not working after modularization

**Checklist:**
1. ✅ Route modules properly exported with `export default router`
2. ✅ Routes registered in `routes/index.ts`
3. ✅ Middleware imported correctly (`authenticateToken`, etc.)
4. ✅ Schema imports from `@shared/schema` working
5. ✅ Main `routes.ts` calls `registerModularRoutes(app)`

### 6. Development Server Auto-Restart Issues

**Problem:** Server not restarting after file changes

**Solutions:**
```bash
# Kill and restart manually
npx kill-port 5000
npm run dev

# Check tsx watch is working
# Should see: "[tsx] change in ./server/routes.ts Restarting..."

# Clear tsx cache if needed
rm -rf node_modules/.cache
```

## File Structure After Refactoring

```
server/
├── routes.ts (79 lines) ← Main orchestrator
└── routes/
    ├── index.ts (42 lines) - Route registration
    ├── middleware/
    │   └── auth.ts (25 lines) - Auth middleware
    ├── auth.ts (143 lines) - Authentication routes
    ├── guests.ts (372 lines) - Guest management
    ├── guest-tokens.ts (30 lines) - Guest tokens
    ├── capsules.ts (197 lines) - Capsule management
    ├── admin.ts (106 lines) - Admin configuration
    ├── problems.ts (102 lines) - Problem tracking
    ├── settings.ts (111 lines) - Settings management
    ├── expenses.ts (82 lines) - Expense tracking
    ├── objects.ts (108 lines) - Object storage
    └── dashboard.ts (131 lines) - Dashboard/analytics

archive/
├── routes.ts.backup (2,756 lines) - First backup
└── routes-original-backup.ts (2,756 lines) - Final backup
```

## Testing Checklist

### Frontend Testing
```bash
# 1. Build client
npm run build

# 2. Start server
npm run dev

# 3. Access frontend
open http://localhost:5000
```

### API Testing
```bash
# 1. Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pelangi.com","password":"admin123"}'

# 2. Test protected route (use token from step 1)
curl -X GET http://localhost:5000/api/guests/checked-in \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Test other modules
curl -X GET http://localhost:5000/api/capsules/available
curl -X GET http://localhost:5000/api/occupancy
```

## Performance Improvements

### Before Refactoring
- Single 2,756-line file
- Difficult to navigate and maintain
- Team conflicts on same file
- Large bundle size

### After Refactoring
- 12 focused modules averaging 120 lines each
- Easy to find and modify specific features
- Multiple developers can work simultaneously
- Optimized imports and bundle sizes
- Clean separation of concerns

## Best Practices Established

1. **Route Organization**: Group by domain (auth, guests, capsules, etc.)
2. **Middleware Sharing**: Extract common middleware to `middleware/` folder
3. **Validation**: Consistent use of schema validation per route
4. **Error Handling**: Standardized error responses across modules
5. **Authentication**: Centralized auth middleware for protected routes
6. **Testing**: Each module can be tested independently

## Backup Strategy

Always backup before major refactoring:
```bash
# Create archive folder
mkdir -p archive

# Backup original
cp server/routes.ts archive/routes-original-backup.ts

# During refactoring, keep intermediate backups
cp server/routes.ts archive/routes-$(date +%Y%m%d-%H%M%S).ts
```

## Rollback Plan

If issues arise, restore from backup:
```bash
# Stop server
npx kill-port 5000

# Restore backup
cp archive/routes-original-backup.ts server/routes.ts

# Remove modular routes (optional)
rm -rf server/routes/

# Restart
npm run dev
```

## Success Metrics

✅ **97% reduction** in main routes.ts file size  
✅ **12 focused modules** replacing 1 monolithic file  
✅ **Zero downtime** - all functionality preserved  
✅ **Better maintainability** - easy to find and modify features  
✅ **Team-ready** - multiple developers can work simultaneously  
✅ **Clean architecture** - separation of concerns achieved  

### 7. Storage Module Import Errors

**Problem:** `SyntaxError: The requested module './IStorage' does not provide an export named 'IStorage'`

**Root Cause:** Using TypeScript path mappings (`@shared/*`) in Storage module files that work for compilation but fail at Node.js runtime.

**Solution:**
```typescript
// ❌ Before - using path mapping
import { type User } from "@shared/schema";

// ✅ After - using relative paths  
import { type User } from "../../shared/schema";
```

**Fix Applied:**
- Updated `server/Storage/IStorage.ts` 
- Updated `server/Storage/MemStorage.ts`
- Changed all `@shared/*` imports to relative paths `../../shared/*`

**Test Result:** `npm run dev` starts successfully

### 8. Port Already in Use (EADDRINUSE) 

**Problem:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:5000`

**Root Cause:** Multiple Node.js processes running from previous dev sessions.

**Solution (Windows):**
```bash
# Find all Node.js processes
tasklist | findstr node

# Kill all Node.js processes
taskkill /f /im node.exe

# Restart development server
npm run dev
```

**Alternative Solutions:**
```bash
# Check specific port usage
netstat -ano | findstr :5000

# Kill specific process by PID
taskkill /f /PID <process_id>

# Use different port in package.json if needed
"dev": "cross-env PORT=3000 tsx watch server/index.ts"
```

**Test Result:** Server starts successfully on port 5000

## Lessons Learned

1. **Always backup** before major refactoring
2. **Test incrementally** - verify each module works before proceeding
3. **Build first** - ensure client is built before testing frontend
4. **Check credentials** - verify actual admin password in code
5. **Path configuration** - ensure TypeScript paths are configured correctly
6. **Port management** - kill conflicting processes before restart
7. **Runtime vs Compile-time paths** - TypeScript path mappings work for compilation but Node.js runtime requires actual relative paths

---

*This guide documents the complete refactoring journey from a 2,756-line monolithic routes.ts to a clean, modular architecture. Use it as reference for future refactoring projects.*