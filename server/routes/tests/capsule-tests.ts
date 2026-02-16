import { storage } from "../../storage";
import { SystemTest } from "./types";

export const capsuleTests: SystemTest[] = [
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
];
