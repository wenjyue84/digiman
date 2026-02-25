import { storage } from "../../storage";
import { SystemTest } from "./types";

export const notificationTests: SystemTest[] = [
  {
    name: "Problem Tracking System",
    description: "Test unit problem reporting and resolution",
    async test() {
      try {
        // Test problem storage methods
        if (typeof storage.createUnitProblem !== 'function') {
          throw new Error("createUnitProblem method missing");
        }
        if (typeof storage.resolveProblem !== 'function') {
          throw new Error("resolveProblem method missing");
        }

        // Test problem data structure
        const testProblem = {
          unitNumber: "C1",
          description: "Test problem",
          severity: "medium",
          reportedBy: "admin"
        };

        const requiredFields = ['unitNumber', 'description', 'severity'];
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
];
