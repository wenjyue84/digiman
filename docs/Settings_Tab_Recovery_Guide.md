# Settings Tab Recovery Guide
# PelangiManager - Capsule Hostel Management System

**Document Version:** 2025.08  
**Date:** August 2025  
**Purpose:** Documentation for recovering Users and Tests tabs functionality  

---

## Issue Background

During development, the Users and Tests tabs in the Settings page were moved from direct TabsTrigger elements to a dropdown menu structure. This change was made to maintain a clean interface while preserving full functionality.

## Current Tab Structure

### Main Tabs (Direct Access)
1. **General** - System-wide configuration
2. **Capsules** - Accommodation management  
3. **Maintenance** - Issue tracking and resolution
4. **Guest Guide** - Customer-facing content management

### Secondary Tabs (Dropdown Access)
Located in the "More" dropdown menu:
1. **Users** - User account management
2. **Tests** - System testing and validation

## Technical Implementation

### Tab Navigation Structure
```typescript
<TabsList className="grid w-full grid-cols-5">
  {/* 4 Direct tabs */}
  <TabsTrigger value="general">General</TabsTrigger>
  <TabsTrigger value="capsules">Capsules</TabsTrigger>
  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
  <TabsTrigger value="guide">Guest Guide</TabsTrigger>
  
  {/* 1 Dropdown for secondary tabs */}
  <DropdownMenu>
    <DropdownMenuTrigger>More</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onSelect={() => setActiveTab("users")}>
        Users
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setActiveTab("tests")}>
        Tests
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TabsList>
```

### Tab Content Sections
All tabs maintain their full functionality through TabsContent sections:

```typescript
<TabsContent value="users" className="space-y-6">
  <UsersTab
    users={users}
    isLoading={usersLoading}
    queryClient={queryClient}
    toast={toast}
  />
</TabsContent>

<TabsContent value="tests" className="space-y-6">
  <TestsTab />
</TabsContent>
```

## Features Preserved

### Users Tab Functionality
- ✅ Create new user accounts
- ✅ Edit existing user profiles  
- ✅ Manage user roles (admin/staff)
- ✅ Delete user accounts
- ✅ Password management
- ✅ User authentication integration

### Tests Tab Functionality
- ✅ System validation tests
- ✅ Business logic testing
- ✅ Data validation checks
- ✅ Performance monitoring
- ✅ Real-time test execution
- ✅ Test result display

## User Experience Improvements

### Enhanced Tooltips
- **Main tabs**: Descriptive tooltips explaining functionality
- **Dropdown items**: Detailed tooltips with specific actions
- **Mobile compatibility**: Icon-only display with full tooltip support

### Navigation Labels
- **Desktop**: Full text labels visible
- **Mobile**: Icon-only display for space efficiency
- **Dropdown items**: Always show full text labels for clarity

## Accessing Secondary Tabs

1. Navigate to Settings page
2. Click the "More" button (rightmost tab)
3. Select "Users" or "Tests" from dropdown
4. Tab content will display with full functionality

## Prevention Guidelines

### For Future Development
1. **Preserve Tab Structure**: Do not remove TabsContent sections
2. **Maintain Dropdown Logic**: Keep setActiveTab functionality intact
3. **Test Secondary Tabs**: Always verify Users and Tests tabs after changes
4. **Document Changes**: Update this guide when modifying tab structure

### Testing Checklist
- [ ] Main tabs (General, Capsules, Maintenance, Guest Guide) work
- [ ] "More" dropdown opens correctly
- [ ] Users tab accessible via dropdown
- [ ] Tests tab accessible via dropdown  
- [ ] All tab functionality preserved
- [ ] Tooltips display correctly
- [ ] Mobile responsiveness maintained

## Backup Reference

### Archive Location
Original working settings.tsx file is backed up at:
```
C:\Users\Jyue\Desktop\PelangiManager\archive\settings.tsx.backup
```

### Key Differences
- Backup: Direct TabsTrigger for users/tests
- Current: Dropdown structure for users/tests
- Both: Identical TabsContent functionality

## Contact & Support

For issues related to Settings tab functionality:
1. Check this guide first
2. Verify archive backup exists
3. Test dropdown functionality
4. Ensure all imports are present (UsersTab, TestsTab)
5. Verify React Query setup for users data

---

**Last Updated:** August 2025  
**Next Review:** When making changes to Settings page structure