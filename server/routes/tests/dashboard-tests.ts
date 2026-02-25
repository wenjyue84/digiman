import { storage } from "../../storage";
import { SystemTest } from "./types";

export const dashboardTests: SystemTest[] = [
  {
    name: "Dashboard Data Aggregation",
    description: "Test dashboard statistics and data aggregation",
    async test() {
      try {
        // Test occupancy calculation
        const checkedInGuests = await storage.getCheckedInGuests();
        const allUnits = await storage.getAllUnits();

        if (allUnits.length === 0) {
          throw new Error("No units found for occupancy calculation");
        }

        const occupancyRate = (checkedInGuests.data.length / allUnits.length) * 100;
        if (occupancyRate < 0 || occupancyRate > 100) {
          throw new Error(`Invalid occupancy rate calculated: ${occupancyRate}%`);
        }

        // Test available units calculation
        const availableUnits = await storage.getAvailableUnits();
        const occupiedCount = checkedInGuests.data.length;
        const availableCount = availableUnits.length;

        if (occupiedCount + availableCount > allUnits.length) {
          throw new Error("Occupied + Available exceeds total units");
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
      "Verify guest and unit counting methods",
      "Check dashboard data aggregation in routes/dashboard.ts"
    ]
  },
];
