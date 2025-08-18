# Comprehensive Testing System

## Overview
The testing system in Settings > Test now includes comprehensive tests for all major issues we've encountered and fixed, providing immediate feedback and troubleshooting suggestions.

## How to Use

### 🧪 Running Tests
1. Go to **Settings > Test** tab
2. Click **"Run Tests"** button
3. View real-time progress and detailed results
4. Check suggestions if any tests fail

### 📊 Comprehensive Test Categories

The system now includes **18 comprehensive tests** covering all critical business processes:

## 🔐 **Authentication & Security Tests**

#### 1. **Authentication System Test**
**What it tests:**
- Default admin user exists and has proper structure
- Required user fields (id, email, username, password, role)
- Authentication system readiness

#### 2. **Session Management Test**
**What it tests:**
- Session creation and validation methods
- Token-based authentication capability
- Session storage functionality

## 👥 **Guest Management Tests**

#### 3. **Guest Check-in Process Test**
**What it tests:**
- Available capsules for guest assignment
- Guest data structure requirements
- Check-in workflow validation
- Required field validation

#### 4. **Guest Check-out Process Test**
**What it tests:**
- Guest checkout functionality
- Capsule cleanup integration
- Check-out workflow completeness

#### 5. **Guest Data Validation Test**
**What it tests:**
- Email format validation
- Phone number format validation
- Malaysian IC format validation
- Age constraint validation

## 🏠 **Capsule Management Tests**

#### 6. **Capsule Assignment Logic Test**
**What it tests:**
- Auto-assignment priority rules
- Manual assignment capabilities
- Section distribution (back/middle/front)
- Position logic (even=bottom, odd=top)

#### 7. **Capsule Cleaning Workflow Test**
**What it tests:**
- Cleaning status management
- Mark as cleaned/needs cleaning functionality
- Cleaning workflow methods

#### 8. **Database Migration - toRent Field Test**
**What it tests:**
- All capsules have the `toRent` field
- Proper boolean data types
- Migration completeness

## 💰 **Financial Operations Tests**

#### 9. **Payment Processing Test**
**What it tests:**
- Payment amount format validation (XX.XX)
- Valid payment methods (cash, card, transfer, qr)
- Payment data structure integrity

#### 10. **Expense Management Test**
**What it tests:**
- Expense creation and retrieval methods
- Expense data structure validation
- Financial record keeping functionality

## 🛠️ **Problem Tracking & Notifications Tests**

#### 11. **Problem Tracking System Test**
**What it tests:**
- Capsule problem reporting functionality
- Problem resolution workflow
- Severity level validation (low/medium/high/critical)

#### 12. **Admin Notifications Test**
**What it tests:**
- Admin notification creation
- Notification type validation (info/warning/error/success)
- Notification data structure

## 📊 **Dashboard & Reporting Tests**

#### 13. **Dashboard Data Aggregation Test**
**What it tests:**
- Occupancy rate calculations
- Available capsule counting
- Statistical data integrity

#### 14. **Settings Management Test**
**What it tests:**
- System configuration storage
- Accommodation type validation
- Settings update functionality

## 🔗 **Integration & Token Tests**

#### 15. **Guest Token Creation Test** (Instant Create/Create Link)
**What it tests:**
- `/api/guest-tokens` endpoint exists and functions
- Auto-assignment logic works
- Available capsules for assignment

#### 16. **Mark as Cleaned Validation Test**
**What it tests:**
- Schema validation for mark-cleaned endpoint
- Proper data structure requirements
- Field validation logic

## 🔧 **System Integrity Tests**

#### 17. **Schema Integrity Test**
**What it tests:**
- All required fields present in capsules
- Proper data types (boolean, string, enum)
- Consistent data structure

#### 18. **Data Consistency Check Test**
**What it tests:**
- No orphaned guest assignments
- No double capsule assignments
- Capsule availability consistency
- Data integrity across related entities

## 🌐 **Additional System Tests**

#### 19. **API Endpoints Availability Test**
**What it tests:**
- Critical endpoints respond correctly
- Storage layer accessibility
- Data query functionality

**If it fails:**
- Check server startup logs
- Verify storage initialization
- Check database connection

#### 6. **Frontend-Backend Integration Tests**
**What it tests:**
- Data structure compatibility
- Field expectations match
- Type consistency

**If it fails:**
- Check type definitions in `shared/schema.ts`
- Verify component field usage
- Check API response format

## Test Results Interpretation

### ✅ **All Tests Pass**
```
🎉 All tests passed! System is functioning correctly.
✅ Passed: 6
❌ Failed: 0
📈 Total: 6
```
**Action:** System is healthy, no action needed.

### ⚠️ **Some Tests Fail**
```
⚠️ 2 test(s) failed. Check suggestions above for fixes.
✅ Passed: 4
❌ Failed: 2
📈 Total: 6
```
**Action:** Check specific test failures and follow suggestions.

### ❌ **Server Connection Failed**
```
⚠️ Server connection failed: Failed to fetch
🔄 Falling back to local test runner...
```
**Action:** 
- Verify server is running on port 5000
- Check for build/startup errors
- Local tests will run as fallback

## Troubleshooting Common Issues

### Issue 1: "No capsules found in database"
**Cause:** Database not initialized or migration not run  
**Fix:**
1. Check server startup logs
2. Verify storage initialization
3. Run migration manually if needed

### Issue 2: "Missing required fields"
**Cause:** Incomplete database migration  
**Fix:**
1. Check `migrations/0006_add_capsule_to_rent.sql`
2. Run migration helper: `MigrationHelper.runMigrationChecks()`
3. Verify all fields in schema

### Issue 3: "Token creation test failed"
**Cause:** Missing or broken guest-tokens endpoint  
**Fix:**
1. Verify `server/routes/guest-tokens.ts` exists
2. Check route registration in `server/routes/index.ts`
3. Test endpoint manually: `POST /api/guest-tokens`

### Issue 4: "Frontend expects these fields but they're missing"
**Cause:** Schema mismatch between frontend and backend  
**Fix:**
1. Check `shared/schema.ts` type definitions
2. Verify storage implementations return correct types
3. Update frontend components if needed

## Automatic Suggestions

Each failing test provides specific suggestions:

```
💡 Suggestions:
• Check server/routes/guest-tokens.ts exists
• Verify POST endpoint is properly implemented  
• Check capsule availability logic in auto-assignment
```

## Development Workflow

### Before Making Changes
1. Run tests to establish baseline
2. Note any existing failures
3. Make your changes
4. Run tests again to verify no regressions

### After Fixing Issues  
1. Run tests to verify fix worked
2. Check that no new issues were introduced
3. Document any new patterns in test system

### Deployment Checklist
1. ✅ All tests pass locally
2. ✅ Build completes successfully
3. ✅ No TypeScript errors
4. ✅ No console errors in browser

## Technical Details

### Server-Side Tests (`server/routes/tests.ts`)
- Direct storage layer testing
- Real database/memory storage verification
- Comprehensive error reporting
- Detailed suggestions for fixes

### Client-Side Fallback Tests (`client/src/components/settings/TestsTab.tsx`)
- Mock data validation
- Schema structure verification
- Basic functionality checks
- Works when server unavailable

### Test Architecture
```
Settings > Test Tab
├── Try server-side tests first (comprehensive)
├── Fall back to client-side tests (basic)
├── Real-time progress display
└── Detailed error reporting with suggestions
```

## Adding New Tests

### Server-Side Test (Recommended)
```typescript
// In server/routes/tests.ts
{
  name: "Your Test Name",
  description: "What this test validates",
  async test() {
    // Your test logic here
    if (someCondition) {
      throw new Error("Specific error message");
    }
    return {
      passed: true,
      details: "✅ Test passed with specific details"
    };
  },
  suggestions: [
    "If test fails: Do this specific action",
    "Check this file: path/to/file.ts",
    "Verify this configuration setting"
  ]
}
```

### Client-Side Test (Fallback)
```typescript
// In client/src/components/settings/TestsTab.tsx
{ 
  name: 'Your Test Name', 
  fn: () => {
    const result = yourTestLogic();
    return expect(result).toBe(expectedValue);
  }
}
```

## Monitoring and Maintenance

### Weekly Health Checks
- Run comprehensive tests
- Review any persistent failures
- Update test scenarios as system evolves

### After Major Changes
- Add new tests for new functionality
- Update existing tests if APIs change
- Verify all existing tests still pass

### Performance Monitoring
- Tests should complete within 15 seconds
- Monitor for slow-running tests
- Optimize test logic if needed

---

## Quick Reference

**Access Tests:** Settings > Test tab  
**Run Tests:** Click "Run Tests" button  
**Check Health:** Look for ✅/❌ indicators  
**Get Help:** Read suggestions for failed tests  
**Emergency:** Use local tests if server fails  

The testing system is designed to catch issues early and provide actionable guidance for fixes. It covers all the major issues we've encountered and resolved, ensuring system reliability and easier troubleshooting.