import { Router } from "express";
import { z } from "zod";
import path from "path";
import { storage } from "../storage";
import { updateSettingsSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { csvSettings } from "../csvSettings";
import { authenticateToken } from "./middleware/auth";
import multer from "multer";

const router = Router();

// Multer configuration for CSV uploads
// ⚠️  CRITICAL CSV UPLOAD CONFIGURATION - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This configuration handles CSV file uploads for settings import/export.
// Changes here can break the entire settings management system.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.cwd());
    },
    filename: (req, file, cb) => {
      cb(null, 'settings.csv');
    }
  }),
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get all settings
router.get("/", authenticateToken, async (req, res) => {
  try {
    const settingsArray = await storage.getAllSettings();
    
    // Transform array of {key, value} objects into a flat object
    const settings: Record<string, any> = {};
    for (const setting of settingsArray) {
      let value: any = setting.value;
      
      // Parse boolean values
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Parse numeric values
      else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      
      settings[setting.key] = value;
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update settings
router.patch("/", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateSettingsSchema, 'body'),
  async (req: any, res) => {
  try {
    const updatedBy = req.user.username || req.user.email || "Unknown";
    const settingsData = req.body;
    
    // Process each setting in the body
    const results = [];
    for (const [key, value] of Object.entries(settingsData)) {
      if (value !== null && value !== undefined) {
        const setting = await storage.setSetting(key, String(value), updatedBy);
        results.push(setting);
      }
    }
    
    res.json({ 
      success: true, 
      updatedSettings: results.length,
      settings: results 
    });
  } catch (error: any) {
    console.error("Error updating setting:", error);
    
    // Handle database constraint violations specifically
    if (error.message && error.message.includes('constraint')) {
      return res.status(400).json({ 
        message: "Database constraint violation. Please check the data being saved.",
        error: "CONSTRAINT_VIOLATION",
        details: error.message
      });
    }
    
    res.status(400).json({ message: error.message || "Failed to update setting" });
  }
});

// Export settings as CSV
router.get("/export", async (req, res) => {
  try {
    const settings = await storage.getAllSettings();
    
    // Generate CSV content from settings
    const csvContent = csvSettings.generateCsvFromSettings(settings);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="settings.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: "Failed to export settings" });
  }
});

// Get CSV file path
router.get("/csv-path", authenticateToken, async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'settings.csv');
    res.json({ path: csvPath });
  } catch (error) {
    res.status(500).json({ message: "Failed to get CSV path" });
  }
});

// Import settings from CSV
// ⚠️  CRITICAL CSV IMPORT ENDPOINT - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This endpoint handles CSV file uploads and imports settings data.
// It's working perfectly and any changes can break the settings import system.
router.post("/import",
  securityValidationMiddleware,
  authenticateToken,
  upload.single('file'),
  async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const updatedBy = req.user.username || req.user.email || "Unknown";
    // ⚠️  CRITICAL: DO NOT MODIFY - This processes the uploaded CSV file ⚠️
    // This call imports settings from the uploaded CSV file.
    // Changing this logic can break the entire settings import functionality.
    const results = await csvSettings.importFromFile(req.file.path, updatedBy);
    
    res.json({
      message: results.success ? "Settings imported successfully" : "Import completed with errors",
      imported: results.imported,
      errors: results.errors
    });
  } catch (error: any) {
    console.error("Error importing settings:", error);
    res.status(500).json({ message: error.message || "Failed to import settings" });
  }
});

// ─── Unit Assignment Rules ───────────────────────────────────────────

const UNIT_RULES_KEY = 'unitAssignmentRules';

const DEFAULT_UNIT_RULES = {
  deckPriority: true,              // Prefer even-numbered units (lower deck)
  excludedUnits: ['J1','J2','J3','J4','R1','R2','R3','R4','R5','R6'],
  genderRules: {
    female: { preferred: ['C1','C2','C3','C4','C5','C6'], fallbackToOther: true },
    male: { preferred: [] as string[], fallbackToOther: true },
  },
  maintenanceDeprioritize: true,
  deprioritizedUnits: [] as string[],
};

// GET /api/settings/unit-rules — No auth required (MCP tool + frontend both read this)
router.get("/unit-rules", async (_req, res) => {
  try {
    let rules = DEFAULT_UNIT_RULES;
    // Try new key first, fall back to legacy key for backward compat
    const setting = await storage.getSetting(UNIT_RULES_KEY)
      || await storage.getSetting('capsuleAssignmentRules');
    if (setting) {
      try {
        rules = JSON.parse(setting.value);
      } catch {
        // keep defaults
      }
    } else {
      // First access: persist defaults
      await storage.setSetting(UNIT_RULES_KEY, JSON.stringify(DEFAULT_UNIT_RULES), 'Default unit assignment rules');
    }

    // Auto-link units with active problems into deprioritized list
    let autoLinkedUnits: string[] = [];
    try {
      const activeProblems = await storage.getActiveProblems({ page: 1, limit: 1000 });
      autoLinkedUnits = [...new Set(activeProblems.data.map(p => p.unitNumber))];
    } catch {
      // If problems fetch fails, return rules without auto-link
    }

    const manualUnits: string[] = rules.deprioritizedUnits || [];
    const mergedUnits = [...new Set([...manualUnits, ...autoLinkedUnits])];

    res.json({
      ...rules,
      deprioritizedUnits: mergedUnits,
      autoLinkedUnits,
    });
  } catch (error) {
    console.error("Error fetching unit rules:", error);
    res.status(500).json({ message: "Failed to fetch unit rules" });
  }
});

// Backward-compat: old capsule-rules endpoint redirects to unit-rules
router.get("/capsule-rules", (req, res) => res.redirect(307, '/api/settings/unit-rules'));
router.put("/capsule-rules", (req, res) => res.redirect(307, '/api/settings/unit-rules'));

// PUT /api/settings/unit-rules — Auth required to modify
router.put("/unit-rules",
  authenticateToken,
  async (req: any, res) => {
  try {
    const rules = req.body;

    // Basic validation
    if (typeof rules !== 'object' || rules === null) {
      return res.status(400).json({ message: 'Rules must be a JSON object' });
    }
    if (rules.excludedUnits && !Array.isArray(rules.excludedUnits)) {
      return res.status(400).json({ message: 'excludedUnits must be an array' });
    }
    if (rules.deprioritizedUnits && !Array.isArray(rules.deprioritizedUnits)) {
      return res.status(400).json({ message: 'deprioritizedUnits must be an array' });
    }

    const updatedBy = req.user?.username || req.user?.email || 'Unknown';
    await storage.setSetting(UNIT_RULES_KEY, JSON.stringify(rules), 'Unit assignment rules', updatedBy);

    res.json({ success: true, rules });
  } catch (error: any) {
    console.error("Error saving unit rules:", error);
    res.status(500).json({ message: error.message || "Failed to save unit rules" });
  }
});

export default router;