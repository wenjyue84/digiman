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
];
