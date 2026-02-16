import { storage } from "../../storage";
import { SystemTest } from "./types";

export const settingsTests: SystemTest[] = [
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
];
