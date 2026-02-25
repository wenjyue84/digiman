import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertUnitSchema,
  updateUnitSchema,
} from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Helper function to determine warning level for unit assignment
function getWarningLevel(unit: any, activeProblems: any[] = []): 'none' | 'minor' | 'major' | 'blocked' {
  // Blocked - Cannot be assigned automatically
  if (!unit.isAvailable || unit.toRent === false) {
    return 'blocked';
  }

  // Major warning - Needs cleaning
  if (unit.cleaningStatus === 'to_be_cleaned') {
    return 'major';
  }

  // Minor warning - Has active maintenance problems but still rentable
  if (unit.toRent !== false && unit.cleaningStatus === 'cleaned' && activeProblems.length > 0) {
    return 'minor';
  }

  return 'none';
}

// Get available units
router.get("/available", async (_req, res) => {
  try {
    const units = await storage.getAvailableUnits();
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: "Failed to get available units" });
  }
});

// Get all available units with assignment eligibility info (for admin check-in UI)
router.get("/available-with-status", authenticateToken, async (_req, res) => {
  try {
    const checkedInGuests = await storage.getCheckedInGuests();
    const occupiedUnits = new Set(checkedInGuests.data.map(guest => guest.unitNumber));

    // Get all units and show all except those occupied by guests
    // This allows admins to see unavailable units as disabled options
    const allUnits = await storage.getAllUnits();
    const displayableUnits = allUnits.filter(unit => {
      // Only skip if occupied by a guest
      return !occupiedUnits.has(unit.number);
    });

    // Get all active problems to check for maintenance issues
    const activeProblemsResponse = await storage.getActiveProblems({ page: 1, limit: 1000 });
    const allActiveProblems = activeProblemsResponse.data;

    // Add assignment eligibility info to each unit
    const unitsWithStatus = displayableUnits.map(unit => {
      // Find active problems for this specific unit
      const unitProblems = allActiveProblems.filter(problem =>
        problem.unitNumber === unit.number && !problem.isResolved
      );

      return {
        ...unit,
        canAssign: unit.cleaningStatus === "cleaned" && unit.isAvailable && unit.toRent !== false,
        warningLevel: getWarningLevel(unit, unitProblems),
        activeProblems: unitProblems, // Include problems data for frontend use
        // Allow manual override - show all units but mark those that need warnings
        canManualAssign: unit.isAvailable // As long as it's not occupied, admin can assign it
      };
    });

    // Sort by pure sequential order (regardless of assignment status)
    const sortedUnits = unitsWithStatus.sort((a, b) => {
      const aMatch = a.number.match(/(\d+)/);
      const bMatch = b.number.match(/(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1]) : 0;
      const bNum = bMatch ? parseInt(bMatch[1]) : 0;
      return aNum - bNum;
    });

    res.json(sortedUnits);
  } catch (error) {
    console.error("Error in available-with-status endpoint:", error);
    res.status(500).json({ message: "Failed to get available units with status" });
  }
});

// Get units that need cleaning attention (ONLY cleaning-related issues)
router.get("/needs-attention", async (_req, res) => {
  try {
    const allUnits = await storage.getAllUnits();

    // Filter units that need CLEANING attention ONLY
    const needsAttention = allUnits.filter(unit =>
      unit.cleaningStatus === 'to_be_cleaned'
    );

    // Sort by unit number for consistent ordering
    const sortedUnits = needsAttention.sort((a, b) => {
      const aMatch = a.number.match(/(\d+)/);
      const bMatch = b.number.match(/(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1]) : 0;
      const bNum = bMatch ? parseInt(bMatch[1]) : 0;
      return aNum - bNum;
    });

    res.json(sortedUnits);
  } catch (error) {
    console.error("Error getting units needing cleaning:", error);
    res.status(500).json({ message: "Failed to get units needing cleaning" });
  }
});

// Get all units with their status
router.get("/", async (_req, res) => {
  try {
    const units = await storage.getAllUnits();
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: "Failed to get units" });
  }
});

// Create new unit
router.post("/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertUnitSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;
    const unit = await storage.createUnit(validatedData);
    res.json(unit);
  } catch (error: any) {
    console.error("Error creating unit:", error);
    res.status(400).json({ message: error.message || "Failed to create unit" });
  }
});

// Update unit by ID
router.patch("/:id",
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateUnitSchema, 'body'),
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get unit by ID first to check its number
    const unit = await storage.getUnitById(id);
    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const updatedUnit = await storage.updateUnit(unit.number, updates);

    if (!updatedUnit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json(updatedUnit);
  } catch (error: any) {
    console.error("Error updating unit:", error);
    res.status(400).json({ message: error.message || "Failed to update unit" });
  }
});

// Update unit by number
router.patch("/:number",
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateUnitSchema, 'body'),
  async (req: any, res) => {
  try {
    const { number } = req.params;
    const updates = req.body;
    const unit = await storage.updateUnit(number, updates);

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json(unit);
  } catch (error: any) {
    console.error("Error updating unit:", error);
    res.status(400).json({ message: error.message || "Failed to update unit" });
  }
});

// Delete unit by ID
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Get unit by ID first to check its number
    const unit = await storage.getUnitById(id);
    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const deleted = await storage.deleteUnit(unit.number);

    if (!deleted) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json({ message: "Unit deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    res.status(400).json({ message: error.message || "Failed to delete unit" });
  }
});

// Delete unit by number
router.delete("/:number", authenticateToken, async (req: any, res) => {
  try {
    const { number } = req.params;

    const deleted = await storage.deleteUnit(number);

    if (!deleted) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json({ message: "Unit deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    res.status(400).json({ message: error.message || "Failed to delete unit" });
  }
});

// Get units by cleaning status
router.get("/cleaning-status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    if (!['cleaned', 'to_be_cleaned'].includes(status)) {
      return res.status(400).json({ message: "Invalid cleaning status" });
    }

    const units = await storage.getUnitsByCleaningStatus(status as 'cleaned' | 'to_be_cleaned');
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: "Failed to get units by cleaning status" });
  }
});

// Mark unit as cleaned
router.post("/:number/mark-cleaned", securityValidationMiddleware, async (req, res) => {
  try {
    const { number } = req.params;

    const cleanedBySchema = z.object({
      cleanedBy: z.string()
        .min(1, "Cleaner name is required")
        .max(50, "Cleaner name must not exceed 50 characters")
        .transform(val => val.trim()),
    });

    const { cleanedBy } = cleanedBySchema.parse(req.body);

    const updatedUnit = await storage.markUnitCleaned(number, cleanedBy);

    if (!updatedUnit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    res.json(updatedUnit);
  } catch (error: any) {
    console.error("Error marking unit as cleaned:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(400).json({ message: error.message || "Failed to mark unit as cleaned" });
  }
});

// Mark all units as cleaned
router.post("/mark-cleaned-all", authenticateToken, async (req: any, res) => {
  try {
    const cleanedBy = req.user.username || req.user.email || "Unknown";
    const toBeCleaned = await storage.getUnitsByCleaningStatus('to_be_cleaned');

    let count = 0;
    for (const unit of toBeCleaned) {
      const updated = await storage.markUnitCleaned(unit.number, cleanedBy);
      if (updated) count++;
    }
    res.json({ count });
  } catch (error) {
    console.error("Bulk mark cleaned failed:", error);
    res.status(500).json({ message: "Failed to mark all as cleaned" });
  }
});

// Switch guest between units with maintenance tracking
router.post("/switch",
  securityValidationMiddleware,
  authenticateToken,
  async (req: any, res) => {
  try {
    const unitSwitchSchema = z.object({
      guestId: z.string().min(1, "Guest ID is required"),
      oldUnitNumber: z.string().min(1, "Old unit number is required"),
      newUnitNumber: z.string().min(1, "New unit number is required"),
      maintenanceRemark: z.string().nullable().optional()
    });

    const { guestId, oldUnitNumber, newUnitNumber, maintenanceRemark } = unitSwitchSchema.parse(req.body);

    // Prevent switching to the same unit
    if (oldUnitNumber === newUnitNumber) {
      return res.status(400).json({ message: "Cannot switch to the same unit" });
    }

    // Check if guest exists and is currently in the old unit
    const guest = await storage.getGuest(guestId);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    if (guest.unitNumber !== oldUnitNumber) {
      return res.status(400).json({
        message: `Guest is not currently in unit ${oldUnitNumber}. Current unit: ${guest.unitNumber}`
      });
    }

    // Check if new unit exists and is available
    const newUnit = await storage.getUnit(newUnitNumber);
    if (!newUnit) {
      return res.status(404).json({ message: `Unit ${newUnitNumber} not found` });
    }

    // Check if new unit is available (not occupied by another guest)
    const allGuests = await storage.getCheckedInGuests();
    const occupiedUnits = new Set(allGuests.data.map(g => g.unitNumber));

    if (occupiedUnits.has(newUnitNumber) && newUnitNumber !== oldUnitNumber) {
      return res.status(400).json({
        message: `Unit ${newUnitNumber} is already occupied by another guest`
      });
    }

    // Perform the switch with proper error handling and data sanitization
    try {
      // Sanitize maintenance remark to prevent injection
      const sanitizedRemark = maintenanceRemark?.trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially harmful characters
        .substring(0, 500); // Ensure max length

      // Double-check unit availability just before the switch to prevent race conditions
      const recentGuests = await storage.getCheckedInGuests();
      const recentlyOccupiedUnits = new Set(recentGuests.data.map(g => g.unitNumber));

      if (recentlyOccupiedUnits.has(newUnitNumber) && newUnitNumber !== oldUnitNumber) {
        return res.status(409).json({
          message: `Unit ${newUnitNumber} was just assigned to another guest`
        });
      }

      const operations = [
        // Update guest's unit assignment
        () => storage.updateGuest(guestId, { unitNumber: newUnitNumber } as any),

        // Release old unit and mark it as needing cleaning
        () => storage.updateUnit(oldUnitNumber, {
          cleaningStatus: 'to_be_cleaned' as const,
          isAvailable: true
        }),

        // Update new unit as occupied
        () => storage.updateUnit(newUnitNumber, {
          isAvailable: false
        })
      ];

      // Execute all operations
      await Promise.all(operations.map(op => op()));

      // Handle maintenance remark separately after successful switch
      if (sanitizedRemark && sanitizedRemark.length > 0) {
        try {
          const timestamp = new Intl.DateTimeFormat('en-CA').format(new Date());
          const remarkWithTimestamp = `[${timestamp}] ${sanitizedRemark}`;

          const oldUnit = await storage.getUnit(oldUnitNumber);
          const existingRemark = oldUnit?.remark || '';

          const combinedRemark = existingRemark
            ? `${existingRemark}\n${remarkWithTimestamp}`
            : remarkWithTimestamp;

          const truncatedRemark = combinedRemark.length > 2000
            ? combinedRemark.substring(0, 2000) + '...'
            : combinedRemark;

          await storage.updateUnit(oldUnitNumber, {
            remark: truncatedRemark
          });
        } catch (remarkError) {
          console.warn("Failed to update maintenance remark:", remarkError);
        }
      }

      const switchResult = {
        success: true,
        guestId,
        oldUnitNumber,
        newUnitNumber,
        maintenanceRemark: sanitizedRemark || null,
        message: `Guest successfully moved from ${oldUnitNumber} to ${newUnitNumber}`
      };

      res.json(switchResult);

    } catch (switchError) {
      console.error("Error during unit switch:", switchError);

      try {
        await storage.updateGuest(guestId, { unitNumber: oldUnitNumber } as any);
      } catch (rollbackError) {
        console.error("Failed to rollback guest assignment:", rollbackError);
      }

      throw new Error("Failed to complete unit switch operation");
    }

  } catch (error: any) {
    console.error("Unit switch error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid data",
        errors: error.errors
      });
    }

    res.status(500).json({
      message: error.message || "Failed to switch units"
    });
  }
});

// Fix unit sections and positions endpoint
router.post("/fix-unit-data", async (_req, res) => {
  try {
    const allUnits = await storage.getAllUnits();
    let fixedCount = 0;

    for (const unit of allUnits) {
      const numMatch = unit.number.match(/(\d+)/);
      if (!numMatch) continue;
      const num = parseInt(numMatch[1]);
      let correctSection = '';
      let correctPosition = '';

      // Determine section based on unit number
      if (num >= 1 && num <= 6) {
        correctSection = 'back';
      } else if (num >= 25 && num <= 26) {
        correctSection = 'middle';
      } else if (num >= 11 && num <= 24) {
        correctSection = 'front';
      }

      // Determine position (even = bottom, odd = top)
      correctPosition = num % 2 === 0 ? 'bottom' : 'top';

      const updates: any = {};
      if (correctSection && unit.section !== correctSection) {
        updates.section = correctSection;
      }
      if (correctPosition && unit.position !== correctPosition) {
        updates.position = correctPosition;
      }

      if (Object.keys(updates).length > 0) {
        await storage.updateUnit(unit.number, updates);
        console.log(`Fixed unit ${unit.number}: section=${updates.section || unit.section}, position=${updates.position || unit.position}`);
        fixedCount++;
      }
    }

    res.json({
      message: `Unit data fixed successfully. Updated ${fixedCount} units.`,
      fixedCount
    });
  } catch (error) {
    console.error("Error fixing unit data:", error);
    res.status(500).json({ message: "Failed to fix unit data" });
  }
});

// Debug endpoint to check unit data
router.get("/debug-units", async (_req, res) => {
  try {
    const allUnits = await storage.getAllUnits();
    const unitData = allUnits.map(unit => ({
      number: unit.number,
      section: unit.section,
      position: unit.position,
      cleaningStatus: unit.cleaningStatus,
      isAvailable: unit.isAvailable,
      toRent: unit.toRent,
      unitType: unit.unitType,
      maxOccupancy: unit.maxOccupancy,
      pricePerNight: unit.pricePerNight
    }));

    res.json({
      totalUnits: unitData.length,
      units: unitData,
      sections: Array.from(new Set(unitData.map(u => u.section))),
      positions: Array.from(new Set(unitData.map(u => u.position)))
    });
  } catch (error) {
    console.error("Error getting unit debug data:", error);
    res.status(500).json({ message: "Failed to get unit debug data" });
  }
});

export default router;
