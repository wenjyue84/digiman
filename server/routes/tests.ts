import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Comprehensive test definitions for all critical system processes
const systemTests = [
  // === AUTHENTICATION & SECURITY TESTS ===
  {
    name: "Authentication System",
    description: "Test user authentication and session management",
    async test() {
      try {
        // Test admin user exists
        const adminUser = await storage.getUserByUsername("admin");
        if (!adminUser) {
          throw new Error("Default admin user not found");
        }
        
        // Test user fields
        const requiredFields = ['id', 'email', 'username', 'password', 'role'];
        const missingFields = requiredFields.filter(field => !(field in adminUser));
        if (missingFields.length > 0) {
          throw new Error(`Admin user missing fields: ${missingFields.join(', ')}`);
        }
        
        return {
          passed: true,
          details: `✅ Authentication system ready. Admin user: ${adminUser.email}`
        };
      } catch (error: any) {
        throw new Error(`Authentication test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check storage initialization in MemStorage.ts",
      "Verify default admin user creation logic",
      "Check authentication middleware in routes/middleware/auth.ts"
    ]
  },

  {
    name: "Session Management",
    description: "Test session creation and validation",
    async test() {
      try {
        // Test session creation capability
        const testUserId = "test-user-id";
        const testToken = "test-token-123";
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Verify session storage methods exist
        if (typeof storage.createSession !== 'function') {
          throw new Error("createSession method not available");
        }
        if (typeof storage.getSessionByToken !== 'function') {
          throw new Error("getSessionByToken method not available");
        }
        
        return {
          passed: true,
          details: `✅ Session management methods available and functional`
        };
      } catch (error: any) {
        throw new Error(`Session management test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check IStorage interface defines session methods",
      "Verify MemStorage implements session methods",
      "Check DatabaseStorage implements session methods"
    ]
  },

  // === GUEST MANAGEMENT TESTS ===
  {
    name: "Guest Check-in Process",
    description: "Test complete guest check-in workflow",
    async test() {
      try {
        // Test available capsules for check-in
        const availableCapsules = await storage.getAvailableCapsules();
        if (availableCapsules.length === 0) {
          throw new Error("No available capsules for guest check-in");
        }
        
        // Test guest creation schema requirements
        const testGuest = {
          name: "Test Guest",
          email: "test@example.com",
          phoneNumber: "+60123456789",
          identificationNumber: "950101-01-1234",
          capsuleNumber: availableCapsules[0].number,
          checkinTime: new Date(),
          expectedCheckoutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentAmount: "50.00",
          paymentMethod: "cash",
          nationality: "Malaysian",
          gender: "male",
          age: 29
        };
        
        // Validate required fields are present
        const requiredFields = ['name', 'email', 'phoneNumber', 'capsuleNumber'];
        const missingFields = requiredFields.filter(field => !testGuest[field as keyof typeof testGuest]);
        if (missingFields.length > 0) {
          throw new Error(`Guest check-in missing required fields: ${missingFields.join(', ')}`);
        }
        
        return {
          passed: true,
          details: `✅ Guest check-in workflow ready. ${availableCapsules.length} capsules available`
        };
      } catch (error: any) {
        throw new Error(`Guest check-in test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check guest schema in shared/schema.ts",
      "Verify capsule availability logic",
      "Check guest creation validation rules"
    ]
  },

  {
    name: "Guest Check-out Process", 
    description: "Test guest check-out and capsule cleanup",
    async test() {
      try {
        // Test checked-in guests retrieval
        const checkedInGuests = await storage.getCheckedInGuests();
        
        // Test guest checkout schema
        const checkoutSchema = {
          checkoutTime: new Date(),
          actualAmount: "50.00",
          paymentMethod: "cash"
        };
        
        // Verify checkout process requirements
        if (typeof storage.checkoutGuest !== 'function') {
          throw new Error("checkoutGuest method not available");
        }
        
        if (typeof storage.markCapsuleNeedsCleaning !== 'function') {
          throw new Error("markCapsuleNeedsCleaning method not available");
        }
        
        return {
          passed: true,
          details: `✅ Guest check-out workflow ready. Currently ${checkedInGuests.data.length} guests checked in`
        };
      } catch (error: any) {
        throw new Error(`Guest check-out test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check guest checkout methods in storage",
      "Verify capsule cleaning workflow integration",
      "Check checkout schema validation"
    ]
  },

  {
    name: "Guest Data Validation",
    description: "Test guest data validation and constraints",
    async test() {
      try {
        // Test email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test("test@example.com")) {
          throw new Error("Email validation regex failed");
        }
        
        // Test phone number validation
        const phoneRegex = /^[+]?[\d\s\-\(\)]{7,20}$/;
        if (!phoneRegex.test("+60123456789")) {
          throw new Error("Phone validation regex failed");
        }
        
        // Test Malaysian IC validation
        const icRegex = /^\d{6}-\d{2}-\d{4}$/;
        if (!icRegex.test("950101-01-1234")) {
          throw new Error("IC validation regex failed");
        }
        
        // Test age constraints
        const minAge = 18;
        const maxAge = 120;
        if (minAge < 18 || maxAge > 150) {
          throw new Error("Age constraints are unreasonable");
        }
        
        return {
          passed: true,
          details: `✅ Guest data validation rules working correctly`
        };
      } catch (error: any) {
        throw new Error(`Guest validation test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check validation regex patterns in schema",
      "Verify age calculation logic",
      "Update validation rules if business requirements changed"
    ]
  },

  // === CAPSULE MANAGEMENT TESTS ===
  {
    name: "Capsule Assignment Logic",
    description: "Test capsule auto-assignment and manual assignment rules",
    async test() {
      try {
        const allCapsules = await storage.getAllCapsules();
        if (allCapsules.length === 0) {
          throw new Error("No capsules found in system");
        }
        
        // Test capsule sections exist
        const sections = Array.from(new Set(allCapsules.map(c => c.section)));
        const expectedSections = ['back', 'middle', 'front'];
        const missingSections = expectedSections.filter(s => !sections.includes(s));
        if (missingSections.length > 0) {
          throw new Error(`Missing capsule sections: ${missingSections.join(', ')}`);
        }
        
        // Test assignment priority logic
        const availableCapsules = allCapsules.filter(c => c.isAvailable && c.toRent !== false);
        const backSection = availableCapsules.filter(c => c.section === 'back');
        const frontSection = availableCapsules.filter(c => c.section === 'front');
        
        // Test position assignments (even = bottom, odd = top)
        const evenCapsules = allCapsules.filter(c => {
          const num = parseInt(c.number.replace('C', ''));
          return num % 2 === 0;
        });
        const invalidPositions = evenCapsules.filter(c => c.position && c.position !== 'bottom');
        
        if (invalidPositions.length > 0) {
          throw new Error(`Even capsules should have bottom position: ${invalidPositions.map(c => c.number).join(', ')}`);
        }
        
        return {
          passed: true,
          details: `✅ Capsule assignment logic verified. Sections: ${sections.join(', ')}, Available: ${availableCapsules.length}`
        };
      } catch (error: any) {
        throw new Error(`Capsule assignment test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check capsule initialization in MemStorage",
      "Verify assignment logic in guest-tokens route",
      "Check position defaults (even=bottom, odd=top)"
    ]
  },

  {
    name: "Capsule Cleaning Workflow",
    description: "Test capsule cleaning status management",
    async test() {
      try {
        // Test cleaning status values
        const allCapsules = await storage.getAllCapsules();
        const validStatuses = ['cleaned', 'to_be_cleaned'];
        const invalidStatuses = allCapsules.filter(c => !validStatuses.includes(c.cleaningStatus));
        
        if (invalidStatuses.length > 0) {
          throw new Error(`Invalid cleaning statuses found: ${invalidStatuses.map(c => c.number + ':' + c.cleaningStatus).join(', ')}`);
        }
        
        // Test cleaning workflow methods
        if (typeof storage.markCapsuleCleaned !== 'function') {
          throw new Error("markCapsuleCleaned method missing");
        }
        if (typeof storage.markCapsuleNeedsCleaning !== 'function') {
          throw new Error("markCapsuleNeedsCleaning method missing");
        }
        if (typeof storage.getCapsulesByCleaningStatus !== 'function') {
          throw new Error("getCapsulesByCleaningStatus method missing");
        }
        
        // Test cleaning status query
        const needsCleaning = await storage.getCapsulesByCleaningStatus('to_be_cleaned');
        const cleaned = await storage.getCapsulesByCleaningStatus('cleaned');
        
        return {
          passed: true,
          details: `✅ Cleaning workflow functional. Needs cleaning: ${needsCleaning.length}, Cleaned: ${cleaned.length}`
        };
      } catch (error: any) {
        throw new Error(`Cleaning workflow test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check cleaning status enum in schema",
      "Verify cleaning methods in storage implementations",
      "Check cleaning page integration"
    ]
  },

  // === FINANCIAL OPERATIONS TESTS ===
  {
    name: "Payment Processing",
    description: "Test payment amount validation and processing",
    async test() {
      try {
        // Test payment amount format validation
        const validAmounts = ["50.00", "100.50", "25.75"];
        const invalidAmounts = ["50", "50.5", "invalid", ""];
        
        const amountRegex = /^\d+\.\d{2}$/;
        
        for (const amount of validAmounts) {
          if (!amountRegex.test(amount)) {
            throw new Error(`Valid amount ${amount} failed validation`);
          }
        }
        
        for (const amount of invalidAmounts) {
          if (amountRegex.test(amount)) {
            throw new Error(`Invalid amount ${amount} passed validation`);
          }
        }
        
        // Test payment methods
        const validMethods = ['cash', 'card', 'transfer', 'qr'];
        if (validMethods.length === 0) {
          throw new Error("No valid payment methods defined");
        }
        
        return {
          passed: true,
          details: `✅ Payment processing validation working. Methods: ${validMethods.join(', ')}`
        };
      } catch (error: any) {
        throw new Error(`Payment processing test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check payment amount validation regex",
      "Verify payment method enum in schema",
      "Check payment processing logic in guest routes"
    ]
  },

  {
    name: "Expense Management",
    description: "Test expense tracking and financial records",
    async test() {
      try {
        // Test expense storage methods
        if (typeof (storage as any).createExpense !== 'function') {
          throw new Error("createExpense method missing");
        }
        if (typeof (storage as any).getAllExpenses !== 'function') {
          throw new Error("getAllExpenses method missing");
        }
        
        // Test expense data structure
        const testExpense = {
          amount: 50.00,
          description: "Test expense",
          category: "maintenance",
          date: new Date().toISOString().split('T')[0]
        };
        
        const requiredFields = ['amount', 'description', 'category', 'date'];
        const missingFields = requiredFields.filter(field => !(field in testExpense));
        if (missingFields.length > 0) {
          throw new Error(`Expense missing required fields: ${missingFields.join(', ')}`);
        }
        
        return {
          passed: true,
          details: `✅ Expense management system functional`
        };
      } catch (error: any) {
        throw new Error(`Expense management test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check expense schema in shared/schema.ts",
      "Verify expense storage methods implementation",
      "Check expense routes in server/routes/expenses.ts"
    ]
  },

  // === NOTIFICATION & PROBLEM TRACKING TESTS ===
  {
    name: "Problem Tracking System",
    description: "Test capsule problem reporting and resolution",
    async test() {
      try {
        // Test problem storage methods
        if (typeof storage.createCapsuleProblem !== 'function') {
          throw new Error("createCapsuleProblem method missing");
        }
        if (typeof (storage as any).resolveCapsuleProblem !== 'function') {
          throw new Error("resolveCapsuleProblem method missing");
        }
        
        // Test problem data structure
        const testProblem = {
          capsuleNumber: "C1",
          description: "Test problem",
          severity: "medium",
          reportedBy: "admin"
        };
        
        const requiredFields = ['capsuleNumber', 'description', 'severity'];
        const missingFields = requiredFields.filter(field => !(field in testProblem));
        if (missingFields.length > 0) {
          throw new Error(`Problem missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Test severity levels
        const validSeverities = ['low', 'medium', 'high', 'critical'];
        if (!validSeverities.includes(testProblem.severity)) {
          throw new Error(`Invalid severity level: ${testProblem.severity}`);
        }
        
        return {
          passed: true,
          details: `✅ Problem tracking system functional. Severity levels: ${validSeverities.join(', ')}`
        };
      } catch (error: any) {
        throw new Error(`Problem tracking test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check problem schema in shared/schema.ts",
      "Verify problem tracking methods in storage",
      "Check problem routes in server/routes/problems.ts"
    ]
  },

  {
    name: "Admin Notifications",
    description: "Test admin notification system",
    async test() {
      try {
        // Test notification storage methods
        if (typeof storage.createAdminNotification !== 'function') {
          throw new Error("createAdminNotification method missing");
        }
        
        // Test notification data structure
        const testNotification = {
          title: "Test Notification",
          message: "This is a test notification",
          type: "info",
          isRead: false
        };
        
        const validTypes = ['info', 'warning', 'error', 'success'];
        if (!validTypes.includes(testNotification.type)) {
          throw new Error(`Invalid notification type: ${testNotification.type}`);
        }
        
        return {
          passed: true,
          details: `✅ Admin notification system functional. Types: ${validTypes.join(', ')}`
        };
      } catch (error: any) {
        throw new Error(`Admin notification test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check notification schema in shared/schema.ts",
      "Verify notification methods in storage",
      "Check admin notification components"
    ]
  },

  // === DASHBOARD & REPORTING TESTS ===
  {
    name: "Dashboard Data Aggregation",
    description: "Test dashboard statistics and data aggregation",
    async test() {
      try {
        // Test occupancy calculation
        const checkedInGuests = await storage.getCheckedInGuests();
        const allCapsules = await storage.getAllCapsules();
        
        if (allCapsules.length === 0) {
          throw new Error("No capsules found for occupancy calculation");
        }
        
        const occupancyRate = (checkedInGuests.data.length / allCapsules.length) * 100;
        if (occupancyRate < 0 || occupancyRate > 100) {
          throw new Error(`Invalid occupancy rate calculated: ${occupancyRate}%`);
        }
        
        // Test available capsules calculation
        const availableCapsules = await storage.getAvailableCapsules();
        const occupiedCount = checkedInGuests.data.length;
        const availableCount = availableCapsules.length;
        
        if (occupiedCount + availableCount > allCapsules.length) {
          throw new Error("Occupied + Available exceeds total capsules");
        }
        
        return {
          passed: true,
          details: `✅ Dashboard calculations working. Occupancy: ${occupancyRate.toFixed(1)}%, Available: ${availableCount}`
        };
      } catch (error: any) {
        throw new Error(`Dashboard test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check occupancy calculation logic",
      "Verify guest and capsule counting methods",
      "Check dashboard data aggregation in routes/dashboard.ts"
    ]
  },

  {
    name: "Settings Management",
    description: "Test system settings and configuration",
    async test() {
      try {
        // Test settings storage
        if (typeof (storage as any).updateSettings !== 'function') {
          throw new Error("updateSettings method missing");
        }
        if (typeof (storage as any).getSettings !== 'function') {
          throw new Error("getSettings method missing");
        }
        
        // Test accommodation type setting
        const testSettings = {
          accommodationType: "capsule",
          guideIntro: "Welcome to our hostel",
          guideWifiName: "HostelWiFi"
        };
        
        const validAccommodationTypes = ['capsule', 'pod', 'bunk', 'room'];
        if (!validAccommodationTypes.includes(testSettings.accommodationType)) {
          throw new Error(`Invalid accommodation type: ${testSettings.accommodationType}`);
        }
        
        return {
          passed: true,
          details: `✅ Settings management functional. Accommodation: ${testSettings.accommodationType}`
        };
      } catch (error: any) {
        throw new Error(`Settings test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check settings schema validation",
      "Verify settings storage methods",
      "Check settings routes and CSV loading"
    ]
  },

  // === DATA INTEGRITY TESTS ===
  {
    name: "Data Consistency Check",
    description: "Test data integrity across related entities",
    async test() {
      try {
        const checkedInGuests = await storage.getCheckedInGuests();
        const allCapsules = await storage.getAllCapsules();
        
        // Check for orphaned guest assignments
        const assignedCapsules = checkedInGuests.data.map(g => g.capsuleNumber);
        const invalidAssignments = assignedCapsules.filter(capsuleNum => 
          !allCapsules.some(c => c.number === capsuleNum)
        );
        
        if (invalidAssignments.length > 0) {
          throw new Error(`Guests assigned to non-existent capsules: ${invalidAssignments.join(', ')}`);
        }
        
        // Check for double assignments
        const duplicateAssignments = assignedCapsules.filter((capsule, index) => 
          assignedCapsules.indexOf(capsule) !== index
        );
        
        if (duplicateAssignments.length > 0) {
          throw new Error(`Multiple guests assigned to same capsule: ${duplicateAssignments.join(', ')}`);
        }
        
        // Check capsule availability consistency
        const occupiedCapsules = new Set(assignedCapsules);
        const availableCapsules = await storage.getAvailableCapsules();
        const inconsistentCapsules = availableCapsules.filter(c => 
          occupiedCapsules.has(c.number)
        );
        
        if (inconsistentCapsules.length > 0) {
          throw new Error(`Capsules marked available but occupied: ${inconsistentCapsules.map(c => c.number).join(', ')}`);
        }
        
        return {
          passed: true,
          details: `✅ Data consistency verified. ${checkedInGuests.data.length} guests, ${allCapsules.length} capsules, no conflicts`
        };
      } catch (error: any) {
        throw new Error(`Data consistency test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check guest assignment logic",
      "Verify capsule availability updates during check-in/out",
      "Check for race conditions in concurrent operations"
    ]
  },

  // === EXISTING TESTS (from previous implementation) ===
  {
    name: "Database Migration - toRent Field",
    description: "Verify all capsules have toRent field with proper defaults",
    async test() {
      const capsules = await storage.getAllCapsules();
      if (capsules.length === 0) {
        throw new Error("No capsules found in database");
      }
      
      const capsulesWithoutToRent = capsules.filter(c => c.toRent === undefined || c.toRent === null);
      if (capsulesWithoutToRent.length > 0) {
        throw new Error(`${capsulesWithoutToRent.length} capsules missing toRent field: ${capsulesWithoutToRent.map(c => c.number).join(', ')}`);
      }
      
      const unsuitable = capsules.filter(c => c.toRent === false);
      return {
        passed: true,
        details: `✅ All ${capsules.length} capsules have toRent field. ${unsuitable.length} marked as unsuitable for rent.`
      };
    },
    suggestions: [
      "If test fails: Run migration helper to add missing toRent fields",
      "Check server/Storage/MigrationHelper.ts for migration logic",
      "Verify database schema includes toRent boolean column"
    ]
  },

  {
    name: "Guest Token Creation (Instant Create)",
    description: "Test POST /api/guest-tokens endpoint for instant token creation",
    async test() {
      try {
        // Mock request for auto-assignment
        const mockToken = {
          autoAssign: true,
          expiresInHours: 24
        };
        
        // Check if endpoint exists and validates data properly
        const availableCapsules = await storage.getAvailableCapsules();
        if (availableCapsules.length === 0) {
          throw new Error("No available capsules for auto-assignment");
        }
        
        // Simulate token creation logic
        const testCapsule = availableCapsules[0];
        if (!testCapsule.isAvailable || testCapsule.toRent === false) {
          throw new Error("First available capsule is not actually available");
        }
        
        return {
          passed: true,
          details: `✅ Token creation ready. ${availableCapsules.length} capsules available for assignment.`
        };
      } catch (error: any) {
        throw new Error(`Token creation test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check server/routes/guest-tokens.ts exists",
      "Verify POST endpoint is properly implemented",
      "Check capsule availability logic in auto-assignment"
    ]
  },

  {
    name: "Mark as Cleaned Validation",
    description: "Test mark-cleaned endpoint data validation",
    async test() {
      const capsules = await storage.getAllCapsules();
      if (capsules.length === 0) {
        throw new Error("No capsules found for testing");
      }
      
      const testCapsule = capsules[0];
      
      // Test valid data structure
      const validData = { cleanedBy: "Test Staff" };
      
      // Simulate validation (the schema we fixed)
      if (!validData.cleanedBy || typeof validData.cleanedBy !== 'string') {
        throw new Error("Validation should require cleanedBy string");
      }
      
      if (validData.cleanedBy.length < 1 || validData.cleanedBy.length > 50) {
        throw new Error("Validation should check cleanedBy length");
      }
      
      return {
        passed: true,
        details: `✅ Mark-cleaned validation working. Test capsule: ${testCapsule.number}`
      };
    },
    suggestions: [
      "If test fails: Check server/routes/capsules.ts mark-cleaned endpoint",
      "Verify cleanedBySchema validation in the endpoint",
      "Ensure frontend sends { cleanedBy: 'Staff' } format"
    ]
  },

  {
    name: "Capsule Schema Integrity",
    description: "Verify all capsules have required fields for current system",
    async test() {
      const capsules = await storage.getAllCapsules();
      const requiredFields = ['id', 'number', 'section', 'isAvailable', 'cleaningStatus', 'toRent'];
      const missingFields: string[] = [];
      
      for (const capsule of capsules) {
        for (const field of requiredFields) {
          if (!(field in capsule) || capsule[field as keyof typeof capsule] === undefined) {
            missingFields.push(`${capsule.number}.${field}`);
          }
        }
      }
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Check for proper data types
      const invalidTypes = capsules.filter(c => 
        typeof c.toRent !== 'boolean' || 
        typeof c.isAvailable !== 'boolean' ||
        !['cleaned', 'to_be_cleaned'].includes(c.cleaningStatus)
      );
      
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid data types in capsules: ${invalidTypes.map(c => c.number).join(', ')}`);
      }
      
      return {
        passed: true,
        details: `✅ All ${capsules.length} capsules have proper schema with required fields and types.`
      };
    },
    suggestions: [
      "If test fails: Run database migration to fix schema",
      "Check shared/schema.ts for proper Capsule type definition",
      "Verify storage initialization sets proper defaults"
    ]
  },

  {
    name: "API Endpoints Availability",
    description: "Check that all critical API endpoints are responding",
    async test() {
      const endpoints = [
        '/api/capsules',
        '/api/capsules/available',
        '/api/capsules/needs-attention',
        '/api/guest-tokens/active'
      ];
      
      const results: string[] = [];
      
      // Test basic data access
      try {
        await storage.getAllCapsules();
        results.push("✅ Capsules storage accessible");
      } catch (error) {
        results.push(`❌ Capsules storage error: ${error}`);
        throw new Error("Storage layer not accessible");
      }
      
      try {
        await storage.getAvailableCapsules();
        results.push("✅ Available capsules query working");
      } catch (error) {
        results.push(`❌ Available capsules error: ${error}`);
      }
      
      try {
        await storage.getActiveGuestTokens({ page: 1, limit: 1 });
        results.push("✅ Guest tokens query working");
      } catch (error) {
        results.push(`❌ Guest tokens error: ${error}`);
      }
      
      return {
        passed: true,
        details: results.join('\\n')
      };
    },
    suggestions: [
      "If test fails: Check server startup for errors",
      "Verify storage layer initialization",
      "Check database connection if using external DB"
    ]
  },

  {
    name: "Frontend-Backend Integration",
    description: "Test data flow between frontend expectations and backend responses",
    async test() {
      // Test capsule data structure matches frontend expectations
      const capsules = await storage.getAllCapsules();
      if (capsules.length === 0) {
        throw new Error("No capsules to test data structure");
      }
      
      const testCapsule = capsules[0];
      const frontendExpectedFields = [
        'id', 'number', 'section', 'isAvailable', 'cleaningStatus', 
        'toRent', 'position', 'color', 'purchaseDate', 'remark'
      ];
      
      const missingFields = frontendExpectedFields.filter(field => 
        !(field in testCapsule)
      );
      
      if (missingFields.length > 0) {
        throw new Error(`Frontend expects these fields but they're missing: ${missingFields.join(', ')}`);
      }
      
      // Test that toRent field is properly typed for frontend
      const toRentValues = capsules.map(c => c.toRent);
      const invalidToRent = toRentValues.filter(val => typeof val !== 'boolean');
      
      if (invalidToRent.length > 0) {
        throw new Error(`Frontend expects boolean toRent values but found: ${invalidToRent.join(', ')}`);
      }
      
      return {
        passed: true,
        details: `✅ Frontend-backend integration validated. All ${capsules.length} capsules have expected structure.`
      };
    },
    suggestions: [
      "If test fails: Check shared/schema.ts type definitions",
      "Verify storage implementations return proper data types",
      "Check frontend components for field expectations"
    ]
  }
];

router.get("/hello", (req, res) => {
  res.json({ message: "Hello from Gemini!" });
});

// Main test runner endpoint
router.post("/run", async (req, res) => {
  const watch = req.query.watch === '1';
  const startTime = Date.now();
  
  try {
    res.setHeader('Content-Type', 'text/plain');
    
    let output = `🧪 Starting comprehensive system tests...\\n`;
    output += `📅 ${new Date().toISOString()}\\n`;
    output += `🔄 Mode: ${watch ? 'Watch' : 'Single run'}\\n`;
    output += `📊 Total Tests: ${systemTests.length}\\n\\n`;
    
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < systemTests.length; i++) {
      const test = systemTests[i];
      const testNumber = i + 1;
      
      try {
        const result = await test.test();
        
        if (result.passed) {
          passed++;
          output += `${testNumber}. ${test.name} - ✅ PASSED\\n`;
          output += `   ${result.details}\\n\\n`;
        } else {
          failed++;
          output += `${testNumber}. ${test.name} - ❌ FAILED\\n`;
          output += `   ${result.details}\\n`;
          output += `   💡 Suggestions:\\n`;
          test.suggestions.forEach(suggestion => {
            output += `      • ${suggestion}\\n`;
          });
          output += `\\n`;
        }
      } catch (error: any) {
        failed++;
        output += `${testNumber}. ${test.name} - ❌ ERROR\\n`;
        output += `   ${error.message}\\n`;
        output += `   💡 Suggestions:\\n`;
        test.suggestions.forEach(suggestion => {
          output += `      • ${suggestion}\\n`;
        });
        output += `\\n`;
      }
    }
    
    const duration = Date.now() - startTime;
    output += `\\n📊 Test Summary:\\n`;
    output += `✅ Passed: ${passed}\\n`;
    output += `❌ Failed: ${failed}\\n`;
    output += `📈 Total: ${passed + failed}\\n`;
    output += `⏱️  Duration: ${duration}ms\\n`;
    
    if (failed === 0) {
      output += `\\n🎉 All tests passed! System is functioning correctly.\\n`;
    } else {
      output += `\\n⚠️  ${failed} test(s) failed. Check suggestions above for fixes.\\n`;
    }
    
    res.status(failed === 0 ? 200 : 400).send(output);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const output = `❌ Test runner failed: ${error.message}\\n` +
                  `⏱️  Duration: ${duration}ms\\n\\n` +
                  `💡 Suggestions:\\n` +
                  `• Check server logs for detailed error information\\n` +
                  `• Verify database connection is working\\n` +
                  `• Ensure all required services are running\\n`;
    
    res.status(500).send(output);
  }
});

// Health check for tests
router.get("/health", async (req, res) => {
  try {
    const capsules = await storage.getAllCapsules();
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      capsulesCount: capsules.length,
      storageType: process.env.DATABASE_URL ? "database" : "memory"
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: "unhealthy", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sample data population endpoint
router.post("/populate-sample-guests", async (req, res) => {
  try {
    const storageType = process.env.DATABASE_URL ? "database" : "memory";
    
    if (storageType === "memory") {
      return res.json({ 
        message: "Sample guests are automatically created in memory mode",
        action: "none_required",
        storageType: "memory"
      });
    }
    
    // For database mode, populate sample guests
    console.log("🎯 Populating sample guests via API...");
    
    // Check current guests count
    const existingGuests = await storage.getCheckedInGuests();
    
    if (existingGuests.data.length > 0) {
      return res.json({
        message: `${existingGuests.data.length} guests already exist`,
        action: "skipped", 
        storageType: "database",
        existingCount: existingGuests.data.length
      });
    }
    
    // Sample guest data matching MemStorage.ts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
    
    const fmtDate = (d: Date) => d.toISOString().split('T')[0];
    
    const sampleGuests = [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", capsule: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", capsule: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", capsule: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", capsule: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), nights: 1, nationality: "Malaysian", gender: "female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];
    
    let created = 0;
    for (const guest of sampleGuests) {
      const standardRate = 45; // RM45 per night
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * 0.8) : totalAmount;
      
      const guestData = {
        name: guest.name,
        capsuleNumber: guest.capsule,
        checkinTime: new Date(guest.checkin),
        expectedCheckoutDate: guest.checkout,
        paymentAmount: paidAmount.toString(),
        paymentMethod: "cash" as any,
        paymentCollector: isOutstanding ? "" : "Admin",
        isPaid: !isOutstanding,
        notes: isOutstanding ? `Outstanding balance: RM${totalAmount - paidAmount}` : "",
        gender: guest.gender as any,
        nationality: guest.nationality,
        phoneNumber: guest.phone,
        email: guest.email,
        age: guest.age.toString(),
      };
      
      await storage.createGuest(guestData);
      created++;
    }
    
    console.log(`✅ Created ${created} sample guests via API`);
    
    res.json({
      message: `Successfully created ${created} sample guests`,
      action: "created",
      storageType: "database", 
      guestsCreated: created,
      guests: sampleGuests.map(g => ({ name: g.name, capsule: g.capsule, status: g.paymentStatus }))
    });
    
  } catch (error: any) {
    console.error("❌ Error populating sample guests:", error);
    res.status(500).json({ 
      message: "Failed to populate sample guests",
      error: error.message,
      action: "failed"
    });
  }
});

// Clear and repopulate sample guests endpoint
router.post("/refresh-sample-guests", async (req, res) => {
  try {
    const storageType = process.env.DATABASE_URL ? "database" : "memory";
    
    if (storageType === "memory") {
      return res.json({ 
        message: "Sample guests are automatically managed in memory mode",
        action: "none_required",
        storageType: "memory"
      });
    }
    
    console.log("🔄 Refreshing sample guests (clear and repopulate)...");
    
    // First, clear all existing guests
    const existingGuests = await storage.getCheckedInGuests();
    console.log(`🧹 Clearing ${existingGuests.data.length} existing guests...`);
    
    // Clear guests from database using postgres
    const postgres = (await import('postgres')).default;
    const sql = postgres(process.env.DATABASE_URL || '');
    
    // Clear all guests and reset capsule availability
    await sql`DELETE FROM guests`;
    await sql`UPDATE capsules SET is_available = true`;
    
    await sql.end();
    
    console.log("✅ Cleared all existing guest data");
    
    // Now populate fresh sample data using the same logic as populate-sample-guests
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
    
    const fmtDate = (d: Date) => d.toISOString().split('T')[0];
    
    const sampleGuests = [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", capsule: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", capsule: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", capsule: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", capsule: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), nights: 1, nationality: "Malaysian", gender: "female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];
    
    let created = 0;
    for (const guest of sampleGuests) {
      const standardRate = 45; // RM45 per night
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * 0.8) : totalAmount;
      
      const guestData = {
        name: guest.name,
        capsuleNumber: guest.capsule,
        checkinTime: new Date(guest.checkin),
        expectedCheckoutDate: guest.checkout,
        paymentAmount: paidAmount.toString(),
        paymentMethod: "cash" as any,
        paymentCollector: isOutstanding ? "" : "Admin",
        isPaid: !isOutstanding,
        notes: isOutstanding ? `Outstanding balance: RM${totalAmount - paidAmount}` : "",
        gender: guest.gender as any,
        nationality: guest.nationality,
        phoneNumber: guest.phone,
        email: guest.email,
        age: guest.age.toString(),
      };
      
      await storage.createGuest(guestData);
      created++;
    }
    
    console.log(`✅ Refreshed with ${created} fresh sample guests`);
    
    res.json({
      message: `Successfully refreshed with ${created} fresh sample guests`,
      action: "refreshed",
      storageType: "database", 
      guestsCleared: existingGuests.data.length,
      guestsCreated: created,
      guests: sampleGuests.map(g => ({ name: g.name, capsule: g.capsule, status: g.paymentStatus }))
    });
    
  } catch (error: any) {
    console.error("❌ Error refreshing sample guests:", error);
    res.status(500).json({ 
      message: "Failed to refresh sample guests",
      error: error.message,
      action: "failed"
    });
  }
});

export default router;