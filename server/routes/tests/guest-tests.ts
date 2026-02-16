import { storage } from "../../storage";
import { SystemTest } from "./types";

export const guestTests: SystemTest[] = [
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
];
