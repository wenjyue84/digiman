# Debugging Lessons Learned: Guest Checkout & Cache Issues

## Issue Summary
**Date**: 2025-01-18  
**Problem**: Guest rows not disappearing after checkout + Capsules not appearing in Cleaning page  
**Root Causes**: Missing API endpoint + Ineffective React Query cache strategy  

## Critical Debugging Process

### ❌ What I Initially Tried (Wrong Approach)
1. **Assumed schema issues** → Fixed missing `status` field (✅ good but not root cause)
2. **Added more query invalidations** → Added comprehensive invalidateQueries calls (❌ still passive)
3. **Focused on frontend logic** → Checked React Query configurations (❌ missed backend gap)

### ✅ What Actually Worked (Systematic Approach)

#### Step 1: Verify Query Key Matching
```bash
# Check frontend query keys
grep -r "queryKey.*guests.*checked-in" client/src/
grep -r "queryKey.*needs-attention" client/src/

# Check backend API endpoints  
grep -r "router\.get" server/routes/capsules.ts
```

**Key Finding**: Frontend called `/api/capsules/needs-attention` but endpoint **didn't exist**!

#### Step 2: Test API Endpoints Directly
```bash
# List all available endpoints
grep -n "router\.get" server/routes/capsules.ts
```

**Available**: `/available`, `/available-with-status`, `/`, `/cleaning-status/:status`  
**Missing**: `/needs-attention` ❌

#### Step 3: Create Missing Endpoint
```typescript
// Created: /api/capsules/needs-attention
router.get("/needs-attention", async (_req, res) => {
  const allCapsules = await storage.getAllCapsules();
  const needsAttention = allCapsules.filter(capsule => 
    capsule.cleaningStatus === 'to_be_cleaned' ||
    capsule.toRent === false ||
    !capsule.isAvailable
  );
  res.json(needsAttention);
});
```

#### Step 4: Aggressive Cache Strategy
```typescript
// BEFORE (passive - doesn't force immediate update):
queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });

// AFTER (aggressive - forces immediate refetch):
queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
queryClient.refetchQueries({ queryKey: ["/api/capsules/needs-attention"] });
```

## Lessons Learned

### 🔍 Always Verify API Endpoints First
**Before assuming frontend/cache issues:**
1. ✅ Check if API endpoints actually exist
2. ✅ Verify endpoint returns expected data format
3. ✅ Test with direct API calls (browser/Postman)

### 📋 Systematic Debugging Checklist
When components don't update after mutations:

1. **API Layer**:
   - [ ] Does the API endpoint exist?
   - [ ] Does it return correct data after the mutation?
   - [ ] Are there any server-side errors?

2. **Query Keys**:
   - [ ] Do frontend query keys exactly match API endpoints?
   - [ ] Are invalidation query keys identical to component query keys?

3. **Cache Strategy**:
   - [ ] Is `invalidateQueries()` sufficient or do we need `refetchQueries()`?
   - [ ] Are we invalidating all related queries?

4. **React Query Configuration**:
   - [ ] Check `staleTime`, `gcTime`, and `refetchOnWindowFocus` settings
   - [ ] Consider using `refetchQueries()` for critical real-time updates

### 🚨 Red Flags to Watch For
- **404 errors in Network tab** → Missing API endpoints
- **Component works after page refresh** → Cache invalidation issue  
- **Data doesn't update despite successful mutation** → Wrong query keys or passive invalidation
- **TypeScript errors about missing properties** → Schema mismatches

### 💡 Best Practices Going Forward

#### API Development
```typescript
// Always create endpoints BEFORE frontend components use them
// Use consistent naming: /api/resource/action-pattern
router.get("/capsules/needs-attention", ...)     // ✅ Clear, consistent
router.get("/capsules/needsAttention", ...)      // ❌ camelCase inconsistent  
router.get("/capsules/problematic", ...)         // ❌ Vague naming
```

#### React Query Mutations
```typescript
// Use refetchQueries for critical real-time updates
onSuccess: () => {
  // Force immediate updates for user-visible changes
  queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
  queryClient.refetchQueries({ queryKey: ["/api/capsules/needs-attention"] });
  
  // Passive invalidation for background data
  queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
}
```

#### Debugging Tools
```typescript
// Add debug logging for query invalidations
onSuccess: () => {
  console.log("🔄 Invalidating queries after checkout...");
  queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
  console.log("✅ Query invalidation complete");
}
```

### 🎯 Prevention Strategy

#### Before Making Backend Changes:
1. **Audit related frontend components** → What API calls do they make?
2. **Check if endpoints exist** → `grep -r "queryKey" client/src/`
3. **Verify endpoint naming consistency** → Follow established patterns

#### Before Making Frontend Changes:
1. **Test API endpoints directly** → Browser network tab or curl
2. **Verify data flow** → Backend mutation → API response → Frontend update
3. **Check React Query DevTools** → Query status and cache behavior

## Files Modified in This Fix
- `server/routes/capsules.ts` → Added `/needs-attention` endpoint
- `client/src/components/sortable-guest-table.tsx` → Changed to `refetchQueries()`
- `server/Storage/MemStorage.ts` → Added missing `status` field

## Success Metrics
- ✅ Guest rows disappear immediately after checkout (no refresh needed)
- ✅ Checked-out capsules appear immediately in Cleaning page
- ✅ Real-time UI updates across all components
- ✅ Consistent data flow from backend to frontend

---

## Update: Cleaning Page Scope Issue (2025-01-18)

### Issue
Cleaning page was showing capsules with maintenance issues (`toRent = false`) and general availability issues (`!isAvailable`), not just cleaning issues.

### Root Cause  
When creating the `/api/capsules/needs-attention` endpoint, I incorrectly included ALL types of issues instead of just cleaning-related ones.

### Fix Applied
```typescript
// BEFORE (incorrect - included maintenance issues):
const needsAttention = allCapsules.filter(capsule => 
  capsule.cleaningStatus === 'to_be_cleaned' ||
  capsule.toRent === false ||           // ❌ Maintenance issues  
  !capsule.isAvailable                  // ❌ General availability
);

// AFTER (correct - only cleaning issues):
const needsAttention = allCapsules.filter(capsule => 
  capsule.cleaningStatus === 'to_be_cleaned'  // ✅ Only cleaning
);
```

### Lesson: Scope Boundaries Matter
- ✅ **Cleaning page** = Only cleaning-related issues (`cleaningStatus === 'to_be_cleaned'`)
- ✅ **Maintenance page** = Only maintenance issues (`toRent === false`)  
- ✅ **General availability** = Different concern entirely

**Key Takeaway**: Always verify the complete data flow (Backend API → Frontend Query → UI Update) rather than assuming one layer is working correctly. Also ensure API endpoints return data appropriate for their specific use case.