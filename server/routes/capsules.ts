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

// Helper function to determine warning level for capsule assignment
function getWarningLevel(capsule: any): 'none' | 'minor' | 'major' | 'blocked' {
  // Blocked - Cannot be assigned automatically
  if (!capsule.isAvailable || capsule.toRent === false) {
    return 'blocked';
  }
  
  // Major warning - Needs cleaning
  if (capsule.cleaningStatus === 'to_be_cleaned') {
    return 'major';
  }
  
  // Minor warning - Maintenance issues but still rentable
  if (capsule.toRent !== false && capsule.cleaningStatus === 'cleaned') {
    // Check if there are any active problems (we'd need to query this)
    // For now, assume no minor warnings unless we have active problems
    return 'none';
  }
  
  return 'none';
}

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
      canAssign: capsule.cleaningStatus === "cleaned" && capsule.isAvailable && capsule.toRent !== false,
      warningLevel: getWarningLevel(capsule),
      // Allow manual override - show all capsules but mark those that need warnings
      canManualAssign: capsule.isAvailable // As long as it's not occupied, admin can assign it
    }));

    // Sort by pure sequential order: C1, C2, C3, C4... C20, C21, C24 (regardless of assignment status)
    const sortedCapsules = capsulesWithStatus.sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      
      // Pure numerical sort: lowest to highest
      return aNum - bNum;
    });

    res.json(sortedCapsules);
  } catch (error) {
    console.error("Error in available-with-status endpoint:", error);
    res.status(500).json({ message: "Failed to get available capsules with status" });
  }
});

// Get capsules that need cleaning attention (ONLY cleaning-related issues)
router.get("/needs-attention", async (_req, res) => {
  try {
    const allCapsules = await storage.getAllCapsules();
    
    // Filter capsules that need CLEANING attention ONLY:
    // Only include capsules that specifically need cleaning
    const needsAttention = allCapsules.filter(capsule => 
      capsule.cleaningStatus === 'to_be_cleaned'
    );

    // Sort by capsule number for consistent ordering
    const sortedCapsules = needsAttention.sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      return aNum - bNum;
    });

    res.json(sortedCapsules);
  } catch (error) {
    console.error("Error getting capsules needing cleaning:", error);
    res.status(500).json({ message: "Failed to get capsules needing cleaning" });
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
    
    // Create a simple schema for just the cleanedBy field since capsuleNumber comes from URL
    const cleanedBySchema = z.object({
      cleanedBy: z.string()
        .min(1, "Cleaner name is required")
        .max(50, "Cleaner name must not exceed 50 characters")
        .transform(val => val.trim()),
    });
    
    const { cleanedBy } = cleanedBySchema.parse(req.body);
    
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

// Switch guest between capsules with maintenance tracking
router.post("/switch", 
  securityValidationMiddleware,
  authenticateToken,
  async (req: any, res) => {
  try {
    const capsuleSwitchSchema = z.object({
      guestId: z.string().min(1, "Guest ID is required"),
      oldCapsuleNumber: z.string().min(1, "Old capsule number is required"),
      newCapsuleNumber: z.string().min(1, "New capsule number is required"),
      maintenanceRemark: z.string().nullable().optional()
    });
    
    const { guestId, oldCapsuleNumber, newCapsuleNumber, maintenanceRemark } = capsuleSwitchSchema.parse(req.body);
    
    // Prevent switching to the same capsule
    if (oldCapsuleNumber === newCapsuleNumber) {
      return res.status(400).json({ message: "Cannot switch to the same capsule" });
    }
    
    // Check if guest exists and is currently in the old capsule
    const guest = await storage.getGuest(guestId);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }
    
    if (guest.capsuleNumber !== oldCapsuleNumber) {
      return res.status(400).json({ 
        message: `Guest is not currently in capsule ${oldCapsuleNumber}. Current capsule: ${guest.capsuleNumber}` 
      });
    }
    
    // Check if new capsule exists and is available
    const newCapsule = await storage.getCapsule(newCapsuleNumber);
    if (!newCapsule) {
      return res.status(404).json({ message: `Capsule ${newCapsuleNumber} not found` });
    }
    
    // Check if new capsule is available (not occupied by another guest)
    const allGuests = await storage.getCheckedInGuests();
    const occupiedCapsules = new Set(allGuests.data.map(g => g.capsuleNumber));
    
    if (occupiedCapsules.has(newCapsuleNumber) && newCapsuleNumber !== oldCapsuleNumber) {
      return res.status(400).json({ 
        message: `Capsule ${newCapsuleNumber} is already occupied by another guest` 
      });
    }
    
    // Perform the switch with proper error handling and data sanitization
    try {
      // Sanitize maintenance remark to prevent injection
      const sanitizedRemark = maintenanceRemark?.trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially harmful characters
        .substring(0, 500); // Ensure max length
      
      // Double-check capsule availability just before the switch to prevent race conditions
      const recentGuests = await storage.getCheckedInGuests();
      const recentlyOccupiedCapsules = new Set(recentGuests.data.map(g => g.capsuleNumber));
      
      if (recentlyOccupiedCapsules.has(newCapsuleNumber) && newCapsuleNumber !== oldCapsuleNumber) {
        return res.status(409).json({ 
          message: `Capsule ${newCapsuleNumber} was just assigned to another guest` 
        });
      }
      
      // Perform all database operations atomically
      // Note: This assumes storage layer supports transactions
      // If not available, implement explicit rollback on error
      const operations = [
        // Update guest's capsule assignment
        () => storage.updateGuest(guestId, { capsuleNumber: newCapsuleNumber }),
        
        // Release old capsule and mark it as needing cleaning
        () => storage.updateCapsule(oldCapsuleNumber, { 
          cleaningStatus: 'to_be_cleaned' as const,
          isAvailable: true // Make it available but needs cleaning
        }),
        
        // Update new capsule as occupied
        () => storage.updateCapsule(newCapsuleNumber, { 
          isAvailable: false // Mark as occupied
        })
      ];
      
      // Execute all operations
      await Promise.all(operations.map(op => op()));
      
      // Handle maintenance remark separately after successful switch
      if (sanitizedRemark && sanitizedRemark.length > 0) {
        try {
          // Get fresh capsule data and append maintenance note with timestamp
          const timestamp = new Intl.DateTimeFormat('en-CA').format(new Date()); // YYYY-MM-DD format
          const remarkWithTimestamp = `[${timestamp}] ${sanitizedRemark}`;
          
          const oldCapsule = await storage.getCapsule(oldCapsuleNumber);
          const existingRemark = oldCapsule?.remark || '';
          
          // Limit total remark length to prevent database overflow
          const combinedRemark = existingRemark 
            ? `${existingRemark}\n${remarkWithTimestamp}`
            : remarkWithTimestamp;
          
          const truncatedRemark = combinedRemark.length > 2000 
            ? combinedRemark.substring(0, 2000) + '...'
            : combinedRemark;
            
          await storage.updateCapsule(oldCapsuleNumber, { 
            remark: truncatedRemark
          });
        } catch (remarkError) {
          // Don't fail the entire switch if remark update fails
          console.warn("Failed to update maintenance remark:", remarkError);
        }
      }
      
      const switchResult = {
        success: true,
        guestId,
        oldCapsuleNumber,
        newCapsuleNumber,
        maintenanceRemark: sanitizedRemark || null,
        message: `Guest successfully moved from ${oldCapsuleNumber} to ${newCapsuleNumber}`
      };
      
      res.json(switchResult);
      
    } catch (switchError) {
      console.error("Error during capsule switch:", switchError);
      
      // Attempt rollback if possible (implementation depends on storage layer capabilities)
      try {
        // Try to revert guest assignment
        await storage.updateGuest(guestId, { capsuleNumber: oldCapsuleNumber });
      } catch (rollbackError) {
        console.error("Failed to rollback guest assignment:", rollbackError);
      }
      
      throw new Error("Failed to complete capsule switch operation");
    }
    
  } catch (error: any) {
    console.error("Capsule switch error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: error.message || "Failed to switch capsules" 
    });
  }
});

export default router;