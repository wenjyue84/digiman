import { Router } from "express";
import { storage } from "../storage";
import { authenticateToken } from "./middleware/auth";

const router = Router();

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  href: string;
  available?: boolean;
}

/**
 * GET /api/setup/checklist
 * Returns completion status for all 6 onboarding steps.
 * Rainbow AI items gracefully degrade when Rainbow is offline.
 */
router.get("/checklist", authenticateToken, async (_req, res) => {
  try {
    // --- Web app data (DB) ---
    const settingsArray = await storage.getAllSettings();
    const settings: Record<string, string> = {};
    for (const s of settingsArray) {
      settings[s.key] = s.value;
    }

    const propertyNameCompleted = !!(settings.appTitle && settings.appTitle.trim());
    const terminologyCompleted = !!(settings.accommodationType && settings.accommodationType.trim());

    const units = await storage.getAllUnits();
    const unitsCompleted = units.length > 0;

    // --- Rainbow AI data (proxy, may fail) ---
    let whatsappCompleted = false;
    let kbCompleted = false;
    let staffPhoneCompleted = false;
    let rainbowAvailable = false;

    try {
      const RAINBOW_URL = process.env.RAINBOW_URL || "http://localhost:3002";
      const TIMEOUT_MS = 2000;

      const fetchWithTimeout = (url: string) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
      };

      const [statusResult, kbResult, rainbowSettingsResult] = await Promise.allSettled([
        fetchWithTimeout(`${RAINBOW_URL}/api/rainbow/status`),
        fetchWithTimeout(`${RAINBOW_URL}/api/rainbow/kb-files`),
        fetchWithTimeout(`${RAINBOW_URL}/api/rainbow/settings`),
      ]);

      // If any request succeeded, Rainbow is considered available
      rainbowAvailable = statusResult.status === "fulfilled" ||
        kbResult.status === "fulfilled" ||
        rainbowSettingsResult.status === "fulfilled";

      if (statusResult.status === "fulfilled" && statusResult.value.ok) {
        const data = await statusResult.value.json();
        const instances = Array.isArray(data.instances) ? data.instances : [];
        whatsappCompleted = instances.length > 0 && instances[0]?.state === "open";
      }

      if (kbResult.status === "fulfilled" && kbResult.value.ok) {
        const data = await kbResult.value.json();
        kbCompleted = Array.isArray(data) && data.length > 0;
      }

      if (rainbowSettingsResult.status === "fulfilled" && rainbowSettingsResult.value.ok) {
        const data = await rainbowSettingsResult.value.json();
        const phones = data?.staff?.phones;
        staffPhoneCompleted = Array.isArray(phones) && phones.length > 0;
      }
    } catch {
      // Rainbow AI is offline — all Rainbow items stay false, available stays false
    }

    const items: ChecklistItem[] = [
      {
        id: "propertyName",
        label: "Set your property name",
        completed: propertyNameCompleted,
        href: "/settings?tab=general",
      },
      {
        id: "terminology",
        label: "Choose accommodation terminology",
        completed: terminologyCompleted,
        href: "/settings?tab=general",
      },
      {
        id: "units",
        label: "Add your first unit",
        completed: unitsCompleted,
        href: "/settings?tab=units",
      },
      {
        id: "whatsapp",
        label: "Connect WhatsApp",
        completed: whatsappCompleted,
        href: "/settings?tab=chatbot",
        available: rainbowAvailable,
      },
      {
        id: "kb",
        label: "Upload knowledge base content",
        completed: kbCompleted,
        href: "/settings?tab=chatbot",
        available: rainbowAvailable,
      },
      {
        id: "staffPhone",
        label: "Set staff escalation phone",
        completed: staffPhoneCompleted,
        href: "/settings?tab=chatbot",
        available: rainbowAvailable,
      },
    ];

    const completedCount = items.filter((i) => i.completed).length;

    res.json({ items, completedCount, totalCount: items.length });
  } catch (error) {
    console.error("Setup checklist error:", error);
    res.status(500).json({ message: "Failed to fetch setup checklist" });
  }
});

/**
 * GET /api/setup/dismiss-status
 * Returns whether the setup checklist has been dismissed.
 */
router.get("/dismiss-status", authenticateToken, async (_req, res) => {
  try {
    const setting = await storage.getSetting("setupChecklistDismissed");
    res.json({ dismissed: setting?.value === "true" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dismiss status" });
  }
});

/**
 * POST /api/setup/dismiss
 * Marks the setup checklist as dismissed in the DB.
 */
router.post("/dismiss", authenticateToken, async (req: any, res) => {
  try {
    const updatedBy = req.user?.username || req.user?.email || "system";
    await storage.setSetting("setupChecklistDismissed", "true", "Setup checklist dismissed", updatedBy);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to save dismiss status" });
  }
});

export default router;
