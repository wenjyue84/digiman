import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { 
  guestSelfCheckinSchema,
  createTokenSchema
} from "@shared/schema";
import { calculateAgeFromIC } from "@shared/utils";
import { validateData, securityValidationMiddleware, sanitizers, validators } from "../validation";
import { getConfig, AppConfig } from "../configManager";
import { authenticateToken } from "./middleware/auth";
import sgMail from "@sendgrid/mail";
import { pushNotificationService, createNotificationPayload } from "../lib/pushNotifications.js";

const router = Router();

// Create guest token (for Instant Create and Create Link functionality)
router.post("/", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(createTokenSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;
    
    // Determine capsule assignment
    let assignedCapsule: string | null = null;
    
    if (validatedData.autoAssign) {
      // Auto-assign logic: get available capsules and pick the best one
      const availableCapsules = await storage.getAvailableCapsules();
      
      if (availableCapsules.length === 0) {
        return res.status(400).json({ message: "No capsules available for assignment" });
      }
      
      // Sort by priority: C1-C6 (back), then C25-C26 (middle), then C11-C24 (front)
      // Within each section, prefer even numbers (bottom bunks)
      const sortedCapsules = availableCapsules.sort((a, b) => {
        const aNum = parseInt(a.number.replace('C', ''));
        const bNum = parseInt(b.number.replace('C', ''));
        
        // Section priority: back (1-6) > middle (25-26) > front (11-24)
        const getSectionPriority = (num: number) => {
          if (num >= 1 && num <= 6) return 1; // back
          if (num >= 25 && num <= 26) return 2; // middle
          return 3; // front
        };
        
        const aSectionPriority = getSectionPriority(aNum);
        const bSectionPriority = getSectionPriority(bNum);
        
        if (aSectionPriority !== bSectionPriority) {
          return aSectionPriority - bSectionPriority;
        }
        
        // Within same section, prefer even numbers (bottom bunks)
        const aIsEven = aNum % 2 === 0;
        const bIsEven = bNum % 2 === 0;
        
        if (aIsEven && !bIsEven) return -1;
        if (!aIsEven && bIsEven) return 1;
        
        // Same parity, sort by number
        return aNum - bNum;
      });
      
      assignedCapsule = sortedCapsules[0].number;
    } else if (validatedData.capsuleNumber) {
      // Verify specific capsule is available
      const capsule = await storage.getCapsule(validatedData.capsuleNumber);
      if (!capsule) {
        return res.status(400).json({ message: "Specified capsule not found" });
      }
      if (!capsule.isAvailable) {
        return res.status(400).json({ message: "Specified capsule is not available" });
      }
      assignedCapsule = validatedData.capsuleNumber;
    }
    
    // Create guest token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (validatedData.expiresInHours || 24));
    
    const guestToken = {
      id: randomUUID(),
      token,
      capsuleNumber: assignedCapsule,
      guestName: validatedData.guestName || null,
      phoneNumber: validatedData.phoneNumber || null,
      email: validatedData.email || null,
      expectedCheckoutDate: validatedData.expectedCheckoutDate || null,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
      // Guide overrides
      guideOverrideEnabled: validatedData.guideOverrideEnabled || false,
      guideShowIntro: validatedData.guideShowIntro || null,
      guideShowAddress: validatedData.guideShowAddress || null,
      guideShowWifi: validatedData.guideShowWifi || null,
      guideShowCheckin: validatedData.guideShowCheckin || null,
      guideShowOther: validatedData.guideShowOther || null,
      guideShowFaq: validatedData.guideShowFaq || null,
      guideShowSelfCheckinMessage: validatedData.guideShowSelfCheckinMessage || null,
      guideShowHostelPhotos: validatedData.guideShowHostelPhotos || null,
      guideShowGoogleMaps: validatedData.guideShowGoogleMaps || null,
      guideShowCheckinVideo: validatedData.guideShowCheckinVideo || null,
      guideShowTimeAccess: validatedData.guideShowTimeAccess || null,
    };
    
    const createdToken = await storage.createGuestToken(guestToken);
    
    // Generate the check-in link
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const link = `${baseUrl}/guest-checkin?token=${token}`;
    
    res.json({
      token: createdToken.token,
      link,
      capsuleNumber: assignedCapsule,
      guestName: validatedData.guestName || "Guest",
      expiresAt: createdToken.expiresAt,
    });
    
  } catch (error: any) {
    console.error("Error creating guest token:", error);
    res.status(400).json({ message: error.message || "Failed to create guest token" });
  }
});

// Get active guest tokens (reserved capsules)
router.get("/active", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const activeTokens = await storage.getActiveGuestTokens({ page, limit });
    res.json(activeTokens);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active tokens" });
  }
});

// Get guest token by token (for guest check-in page)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const guestToken = await storage.getGuestToken(token);
    
    if (!guestToken) {
      return res.status(404).json({ message: "Token not found" });
    }
    
    if (guestToken.isUsed) {
      return res.status(400).json({ message: "Token has already been used" });
    }
    
    if (guestToken.expiresAt && new Date() > guestToken.expiresAt) {
      return res.status(400).json({ message: "Token has expired" });
    }
    
    res.json(guestToken);
  } catch (error) {
    console.error("Error fetching guest token:", error);
    res.status(500).json({ message: "Failed to fetch guest token" });
  }
});

// Mark token as used (called after successful guest check-in)
router.patch("/:token/use", 
  securityValidationMiddleware,
  async (req, res) => {
  try {
    const { token } = req.params;
    const updatedToken = await storage.markGuestTokenAsUsed(token);
    
    if (!updatedToken) {
      return res.status(404).json({ message: "Token not found" });
    }
    
    res.json({ message: "Token marked as used", token: updatedToken });
  } catch (error) {
    console.error("Error marking token as used:", error);
    res.status(500).json({ message: "Failed to mark token as used" });
  }
});

// Complete guest self-checkin
router.post("/checkin/:token", 
  securityValidationMiddleware,
  validateData(guestSelfCheckinSchema, 'body'),
  async (req: any, res) => {
  try {
    const { token } = req.params;
    const validatedData = req.body;
    
    // Get guest token
    const guestToken = await storage.getGuestToken(token);
    
    if (!guestToken) {
      return res.status(404).json({ message: "Token not found" });
    }
    
    if (guestToken.isUsed) {
      return res.status(400).json({ message: "Token has already been used" });
    }
    
    if (guestToken.expiresAt && new Date() > guestToken.expiresAt) {
      return res.status(400).json({ message: "Token has expired" });
    }

    // Check if assigned capsule is still available
    if (guestToken.assignedCapsule) {
      const availableCapsules = await storage.getAvailableCapsules();
      const availableCapsuleNumbers = availableCapsules.map(c => c.number);
      
      if (!availableCapsuleNumbers.includes(guestToken.assignedCapsule)) {
        return res.status(400).json({ 
          message: `Assigned capsule ${guestToken.assignedCapsule} is no longer available` 
        });
      }
    }

    // Calculate age from IC number if provided
    if (validatedData.icNumber && validatedData.icNumber.length === 12) {
      const age = calculateAgeFromIC(validatedData.icNumber);
      if (age !== null) {
        validatedData.age = age.toString();
      }
    }

    // Create guest data for insertion
    const guestData = {
      ...validatedData,
      name: validatedData.nameAsInDocument,
      capsuleNumber: guestToken.assignedCapsule!,
      checkinTime: new Date(),
      expectedCheckoutDate: validatedData.checkOutDate,
      guestType: 'self_checkin' as const,
      paymentAmount: guestToken.ratePerNight,
      paymentStatus: 'unpaid' as const,
      idNumber: validatedData.icNumber || validatedData.passportNumber,
    };

    // Create the guest
    const guest = await storage.createGuest(guestData);
    
    // Mark token as used
    await storage.markGuestTokenAsUsed(token);
    
    // Send push notification for self-checkin
    try {
      const notificationPayload = createNotificationPayload.guestCheckIn(
        guest.name,
        `Capsule ${guest.capsuleNumber}`
      );
      
      await pushNotificationService.sendToAdmins(notificationPayload);
      console.log(`Push notification sent for self-checkin: ${guest.name}`);
    } catch (error) {
      console.error('Failed to send push notification for self-checkin:', error);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json({
      success: true,
      guest,
      capsuleNumber: guest.capsuleNumber,
      message: "Check-in completed successfully"
    });
  } catch (error) {
    console.error("Error completing self-checkin:", error);
    res.status(500).json({ message: "Failed to complete check-in" });
  }
});

// Delete expired tokens (cleanup endpoint)
router.delete("/cleanup", authenticateToken, async (req: any, res) => {
  try {
    await storage.cleanupExpiredTokens();
    res.json({ message: "Expired tokens cleaned up successfully" });
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
    res.status(500).json({ message: "Failed to cleanup expired tokens" });
  }
});

export default router;