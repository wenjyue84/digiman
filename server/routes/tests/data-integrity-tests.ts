import { storage } from "../../storage";
import { SystemTest } from "./types";

export const dataIntegrityTests: SystemTest[] = [
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
];
