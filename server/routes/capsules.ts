import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  insertCapsuleSchema,
  updateCapsuleSchema,
  markCapsuleCleanedSchema
} from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get available capsules
router.get("/available", async (_req, res) => {
  try {
    const capsules = await storage.getAvailableCapsules();
    res.json(capsules);
  } catch (error) {
    res.status(500).json({ message: "Failed to get available capsules" });
  }
});

// Get all available capsules with assignment eligibility info (for admin check-in UI)
router.get("/available-with-status", async (_req, res) => {
  try {
    const checkedInGuests = await storage.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));
    
    // Get all capsules and show all except those occupied by guests
    // This allows admins to see unavailable capsules as disabled options
    const allCapsules = await storage.getAllCapsules();
    const displayableCapsules = allCapsules.filter(capsule => {
      // Only skip if occupied by a guest
      return !occupiedCapsules.has(capsule.number);
    });

    // Add assignment eligibility info to each capsule
    const capsulesWithStatus = displayableCapsules.map(capsule => ({
      ...capsule,
      canAssign: capsule.cleaningStatus === "cleaned" && capsule.isAvailable && capsule.toRent !== false
    }));

    res.json(capsulesWithStatus);
  } catch (error) {
    console.error("Error in available-with-status endpoint:", error);
    res.status(500).json({ message: "Failed to get available capsules with status" });
  }
});

// Get all capsules with their status
router.get("/", async (_req, res) => {
  try {
    const capsules = await storage.getAllCapsules();
    res.json(capsules);
  } catch (error) {
    res.status(500).json({ message: "Failed to get capsules" });
  }
});

// Create new capsule
router.post("/", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertCapsuleSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;
    const capsule = await storage.createCapsule(validatedData);
    res.json(capsule);
  } catch (error: any) {
    console.error("Error creating capsule:", error);
    res.status(400).json({ message: error.message || "Failed to create capsule" });
  }
});

// Update capsule by ID
router.patch("/:id", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateCapsuleSchema, 'body'),
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Get capsule by ID first to check its number
    const capsule = await storage.getCapsuleById(id);
    if (!capsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }
    
    const updatedCapsule = await storage.updateCapsule(capsule.number, updates);
    
    if (!updatedCapsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    res.json(updatedCapsule);
  } catch (error: any) {
    console.error("Error updating capsule:", error);
    res.status(400).json({ message: error.message || "Failed to update capsule" });
  }
});

// Update capsule by number
router.patch("/:number", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateCapsuleSchema, 'body'),
  async (req: any, res) => {
  try {
    const { number } = req.params;
    const updates = req.body;
    const capsule = await storage.updateCapsule(number, updates);
    
    if (!capsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    res.json(capsule);
  } catch (error: any) {
    console.error("Error updating capsule:", error);
    res.status(400).json({ message: error.message || "Failed to update capsule" });
  }
});

// Delete capsule by ID
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Get capsule by ID first to check its number
    const capsule = await storage.getCapsuleById(id);
    if (!capsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }
    
    const deleted = await storage.deleteCapsule(capsule.number);
    
    if (!deleted) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    res.json({ message: "Capsule deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting capsule:", error);
    res.status(400).json({ message: error.message || "Failed to delete capsule" });
  }
});

// Delete capsule by number
router.delete("/:number", authenticateToken, async (req: any, res) => {
  try {
    const { number } = req.params;
    
    const deleted = await storage.deleteCapsule(number);
    
    if (!deleted) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    res.json({ message: "Capsule deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting capsule:", error);
    res.status(400).json({ message: error.message || "Failed to delete capsule" });
  }
});

// Get capsules by cleaning status
router.get("/cleaning-status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    if (!['cleaned', 'to_be_cleaned'].includes(status)) {
      return res.status(400).json({ message: "Invalid cleaning status" });
    }
    
    const capsules = await storage.getCapsulesByCleaningStatus(status as 'cleaned' | 'to_be_cleaned');
    res.json(capsules);
  } catch (error) {
    res.status(500).json({ message: "Failed to get capsules by cleaning status" });
  }
});

// Mark capsule as cleaned
router.post("/:number/mark-cleaned", securityValidationMiddleware, async (req, res) => {
  try {
    const { number } = req.params;
    const { cleanedBy } = markCapsuleCleanedSchema.parse(req.body);
    
    const updatedCapsule = await storage.markCapsuleCleaned(number, cleanedBy);
    
    if (!updatedCapsule) {
      return res.status(404).json({ message: "Capsule not found" });
    }

    res.json(updatedCapsule);
  } catch (error: any) {
    console.error("Error marking capsule as cleaned:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(400).json({ message: error.message || "Failed to mark capsule as cleaned" });
  }
});

// Mark all capsules as cleaned
router.post("/mark-cleaned-all", authenticateToken, async (req: any, res) => {
  try {
    const cleanedBy = req.user.username || req.user.email || "Unknown";
    const toBeCleaned = await storage.getCapsulesByCleaningStatus('to_be_cleaned');
    
    let count = 0;
    for (const cap of toBeCleaned) {
      const updated = await storage.markCapsuleCleaned(cap.number, cleanedBy);
      if (updated) count++;
    }
    res.json({ count });
  } catch (error) {
    console.error("Bulk mark cleaned failed:", error);
    res.status(500).json({ message: "Failed to mark all as cleaned" });
  }
});

export default router;