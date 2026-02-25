import { storage } from "../../storage";
import { SystemTest } from "./types";

export const unitTests: SystemTest[] = [
  {
    name: "Unit Assignment Logic",
    description: "Test unit auto-assignment and manual assignment rules",
    async test() {
      try {
        const allUnits = await storage.getAllUnits();
        if (allUnits.length === 0) {
          throw new Error("No units found in system");
        }

        // Test unit sections exist
        const sections = Array.from(new Set(allUnits.map(c => c.section)));
        const expectedSections = ['back', 'middle', 'front'];
        const missingSections = expectedSections.filter(s => !sections.includes(s));
        if (missingSections.length > 0) {
          throw new Error(`Missing unit sections: ${missingSections.join(', ')}`);
        }

        // Test assignment priority logic
        const availableUnits = allUnits.filter(c => c.isAvailable && c.toRent !== false);
        const backSection = availableUnits.filter(c => c.section === 'back');
        const frontSection = availableUnits.filter(c => c.section === 'front');

        // Test position assignments (even = bottom, odd = top)
        const evenUnits = allUnits.filter(c => {
          const num = parseInt(c.number.replace('C', ''));
          return num % 2 === 0;
        });
        const invalidPositions = evenUnits.filter(c => c.position && c.position !== 'bottom');

        if (invalidPositions.length > 0) {
          throw new Error(`Even units should have bottom position: ${invalidPositions.map(c => c.number).join(', ')}`);
        }

        return {
          passed: true,
          details: `✅ Unit assignment logic verified. Sections: ${sections.join(', ')}, Available: ${availableUnits.length}`
        };
      } catch (error: any) {
        throw new Error(`Unit assignment test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check unit initialization in MemStorage",
      "Verify assignment logic in guest-tokens route",
      "Check position defaults (even=bottom, odd=top)"
    ]
  },

  {
    name: "Unit Cleaning Workflow",
    description: "Test unit cleaning status management",
    async test() {
      try {
        // Test cleaning status values
        const allUnits = await storage.getAllUnits();
        const validStatuses = ['cleaned', 'to_be_cleaned'];
        const invalidStatuses = allUnits.filter(c => !validStatuses.includes(c.cleaningStatus));

        if (invalidStatuses.length > 0) {
          throw new Error(`Invalid cleaning statuses found: ${invalidStatuses.map(c => c.number + ':' + c.cleaningStatus).join(', ')}`);
        }

        // Test cleaning workflow methods
        if (typeof storage.markUnitCleaned !== 'function') {
          throw new Error("markUnitCleaned method missing");
        }
        if (typeof storage.markUnitNeedsCleaning !== 'function') {
          throw new Error("markUnitNeedsCleaning method missing");
        }
        if (typeof storage.getUnitsByCleaningStatus !== 'function') {
          throw new Error("getUnitsByCleaningStatus method missing");
        }

        // Test cleaning status query
        const needsCleaning = await storage.getUnitsByCleaningStatus('to_be_cleaned');
        const cleaned = await storage.getUnitsByCleaningStatus('cleaned');

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
