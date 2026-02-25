import { storage } from "../../storage";
import { SystemTest } from "./types";

export const dataIntegrityTests: SystemTest[] = [
  {
    name: "Data Consistency Check",
    description: "Test data integrity across related entities",
    async test() {
      try {
        const checkedInGuests = await storage.getCheckedInGuests();
        const allUnits = await storage.getAllUnits();

        // Check for orphaned guest assignments
        const assignedUnits = checkedInGuests.data.map(g => g.unitNumber);
        const invalidAssignments = assignedUnits.filter(unitNum =>
          !allUnits.some(c => c.number === unitNum)
        );

        if (invalidAssignments.length > 0) {
          throw new Error(`Guests assigned to non-existent units: ${invalidAssignments.join(', ')}`);
        }

        // Check for double assignments
        const duplicateAssignments = assignedUnits.filter((unit, index) =>
          assignedUnits.indexOf(unit) !== index
        );

        if (duplicateAssignments.length > 0) {
          throw new Error(`Multiple guests assigned to same unit: ${duplicateAssignments.join(', ')}`);
        }

        // Check unit availability consistency
        const occupiedUnits = new Set(assignedUnits);
        const availableUnits = await storage.getAvailableUnits();
        const inconsistentUnits = availableUnits.filter(c =>
          occupiedUnits.has(c.number)
        );

        if (inconsistentUnits.length > 0) {
          throw new Error(`Units marked available but occupied: ${inconsistentUnits.map(c => c.number).join(', ')}`);
        }

        return {
          passed: true,
          details: `✅ Data consistency verified. ${checkedInGuests.data.length} guests, ${allUnits.length} units, no conflicts`
        };
      } catch (error: any) {
        throw new Error(`Data consistency test failed: ${error.message}`);
      }
    },
    suggestions: [
      "If test fails: Check guest assignment logic",
      "Verify unit availability updates during check-in/out",
      "Check for race conditions in concurrent operations"
    ]
  },
];
