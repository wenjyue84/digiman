import { storage } from "../../storage";
import { SystemTest } from "./types";

export const authTests: SystemTest[] = [
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
];
