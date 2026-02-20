import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import {
  guestSelfCheckinSchema,
  createTokenSchema,
  updateGuestTokenUnitSchema
} from "@shared/schema";
import { calculateAgeFromIC } from "@shared/utils";
import { validateData, securityValidationMiddleware, sanitizers, validators } from "../validation";
import { getConfig, AppConfig } from "../configManager";
import { authenticateToken } from "./middleware/auth";
import sgMail from "@sendgrid/mail";
import { pushNotificationService, createNotificationPayload } from "../lib/pushNotifications.js";
import { handleDatabaseError, handleFeatureNotImplementedError } from "../lib/errorHandler";
import { notifyOperatorMaintenanceUnit } from "../lib/maintenanceNotify";

const router = Router();

// Debug middleware - log all requests to guest-tokens router
router.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.originalUrl} - Guest tokens router`);
  next();
});

// Test endpoint to verify router is working
router.get("/test", (req, res) => {
  console.log("🧪 GET /api/guest-tokens/test - Router is working");
  res.json({ message: "Guest tokens router is working", timestamp: new Date().toISOString() });
});

// Database health check endpoint
router.get("/health", async (req, res) => {
  try {
    console.log("🏥 GET /api/guest-tokens/health - Checking database health");
    
    // Test database connection by trying to access storage
    const testResult = await storage.getActiveGuestTokens();
    console.log("✅ Database connection successful, guest tokens accessible");
    
    res.json({ 
      status: "healthy",
      message: "Database connection is working",
      timestamp: new Date().toISOString(),
      databaseType: storage.constructor.name,
      guestTokensCount: Array.isArray(testResult) ? testResult.length : 'unknown'
    });
  } catch (error: any) {
    console.error("❌ Database health check failed:", error);
    
    let errorType = "UNKNOWN_ERROR";
    let errorDetails = error.message || "Unknown database error";
    
    if (error.code === 'ECONNREFUSED') {
      errorType = "CONNECTION_REFUSED";
      errorDetails = "Database server is not accessible";
    } else if (error.code === 'ENOTFOUND') {
      errorType = "HOST_NOT_FOUND";
      errorDetails = "Database host cannot be resolved";
    } else if (error.code === 'ETIMEDOUT') {
      errorType = "CONNECTION_TIMEOUT";
      errorDetails = "Database connection timed out";
    } else if (error.code === '28P01') {
      errorType = "AUTHENTICATION_FAILED";
      errorDetails = "Database authentication failed - check credentials";
    } else if (error.code === '3D000') {
      errorType = "DATABASE_NOT_FOUND";
      errorDetails = "Database does not exist";
    }
    
    res.status(500).json({
      status: "unhealthy",
      message: "Database connection failed",
      error: errorType,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      databaseType: storage.constructor.name
    });
  }
});

// Internal guest token creation (for Rainbow AI — no auth, localhost only)
router.post("/internal",
  async (req: any, res) => {
    // Restrict to localhost only
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!isLocal) {
      return res.status(403).json({ message: 'Internal endpoint — localhost only' });
    }

    try {
      const { guestName, phoneNumber, expectedCheckoutDate } = req.body;

      // Auto-assign a unit using rules from settings
      const availableUnits = await storage.getAvailableUnits();

      if (availableUnits.length === 0) {
        return res.status(200).json({
          success: false,
          message: 'No units available',
          availableCount: 0
        });
      }

      // Fetch unit assignment rules from settings
      let rules: any = null;
      try {
        const rulesSetting = await storage.getSetting('unitAssignmentRules');
        if (rulesSetting) rules = JSON.parse(rulesSetting.value);
      } catch { /* use defaults below */ }

      const excludedList: string[] = rules?.excludedUnits || [];
      const deckPriority: boolean = rules?.deckPriority !== false; // default true
      const maintenanceDeprioritize: boolean = rules?.maintenanceDeprioritize !== false;
      const deprioritizedList: string[] = rules?.deprioritizedUnits || [];

      // Filter out excluded units
      let candidates = availableUnits.filter(c => !excludedList.includes(c.number));
      if (candidates.length === 0) candidates = availableUnits; // fallback if all excluded

      // Sort by priority: back (1-6) > middle (25-26) > front (11-24), prefer even (bottom bunk)
      const sorted = candidates.sort((a, b) => {
        const aNum = parseInt(a.number.replace(/[A-Z]/g, ''));
        const bNum = parseInt(b.number.replace(/[A-Z]/g, ''));
        // Deprioritize maintenance units
        if (maintenanceDeprioritize) {
          const aDepri = deprioritizedList.includes(a.number) ? 1 : 0;
          const bDepri = deprioritizedList.includes(b.number) ? 1 : 0;
          if (aDepri !== bDepri) return aDepri - bDepri;
        }
        const section = (n: number) => n >= 1 && n <= 6 ? 1 : n >= 25 && n <= 26 ? 2 : 3;
        if (section(aNum) !== section(bNum)) return section(aNum) - section(bNum);
        // Deck priority: even (lower/bottom) first
        if (deckPriority) {
          if (aNum % 2 === 0 && bNum % 2 !== 0) return -1;
          if (aNum % 2 !== 0 && bNum % 2 === 0) return 1;
        }
        return aNum - bNum;
      });

      const assignedUnit = sorted[0].number;
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Use first admin user as createdBy (FK constraint requires valid user ID)
      const users = await storage.getAllUsers();
      const adminUser = users[0];
      if (!adminUser) {
        return res.status(500).json({ success: false, message: 'No admin user found in system' });
      }

      const createdToken = await storage.createGuestToken({
        token,
        createdBy: adminUser.id,
        expiresAt,
        unitNumber: assignedUnit,
        autoAssign: true,
        guestName: guestName || null,
        phoneNumber: phoneNumber || null,
        email: null,
        expectedCheckoutDate: expectedCheckoutDate || null,
        createdAt: new Date(),
      });

      // Build check-in link — PUBLIC_URL for production, fallback to request host for local dev
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      const link = `${baseUrl}/guest-checkin?token=${token}`;

      console.log(`[Internal Token] Created for ${guestName || 'Guest'} → ${assignedUnit} | ${link}`);

      // US-144: Notify operator if maintenance unit assigned with no alternatives
      try {
        const activeProblems = await storage.getActiveProblems({ page: 1, limit: 1000 });
        const unitProblems = activeProblems.data.filter(
          p => p.unitNumber === assignedUnit && !p.isResolved
        );
        if (unitProblems.length > 0) {
          const maintenanceUnitNumbers = new Set(activeProblems.data.map(p => p.unitNumber));
          const hasCleanAlternative = candidates.some(
            c => c.number !== assignedUnit && !maintenanceUnitNumbers.has(c.number)
          );
          if (!hasCleanAlternative) {
            notifyOperatorMaintenanceUnit({
              unitNumber: assignedUnit,
              guestName: guestName || 'Guest',
              guestPhone: phoneNumber,
              problems: unitProblems.map(p => p.description),
            });
          }
        }
      } catch (notifyErr: any) {
        console.error('[Internal Token] Maintenance notification error (non-blocking):', notifyErr.message);
      }

      res.json({
        success: true,
        token: createdToken.token,
        link,
        unitNumber: assignedUnit,
        guestName: guestName || 'Guest',
        availableCount: availableUnits.length,
        expiresAt: createdToken.expiresAt,
      });
    } catch (error: any) {
      console.error('[Internal Token] Error:', error.message);
      res.status(500).json({ success: false, message: error.message || 'Failed to create token' });
    }
  }
);

// Create guest token (for Instant Create and Create Link functionality)
router.post("/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(createTokenSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;
    
    // Enhanced logging for Create Link debugging
    console.log('🎯 [Guest Token Creation] Request received from client');
    console.log('🎯 [Guest Token Creation] User:', req.user?.email || 'Unknown');
    console.log('🎯 [Guest Token Creation] Request data:', {
      autoAssign: validatedData.autoAssign,
      unitNumber: validatedData.unitNumber,
      guestName: validatedData.guestName ? `"${validatedData.guestName}"` : 'Not provided',
      hasPhoneNumber: !!validatedData.phoneNumber,
      hasEmail: !!validatedData.email,
      expectedCheckoutDate: validatedData.expectedCheckoutDate,
      timestamp: new Date().toISOString()
    });

    if (validatedData.autoAssign) {
      console.log('🤖 [Guest Token Creation] Auto-assign mode requested');
    } else {
      console.log('🎯 [Guest Token Creation] Specific unit requested:', validatedData.unitNumber);
    }

    // Determine unit assignment
    let assignedUnit: string | null = null;
    let autoAssignCandidates: any[] = []; // track candidates for maintenance notification

    if (validatedData.autoAssign) {
      // Auto-assign logic: get available units and pick the best one
      const availableUnits = await storage.getAvailableUnits();

      if (availableUnits.length === 0) {
        return res.status(400).json({ message: "No units available for assignment" });
      }

      // Apply unit assignment rules from settings
      let rules: any = null;
      try {
        const rulesSetting = await storage.getSetting('unitAssignmentRules');
        if (rulesSetting) rules = JSON.parse(rulesSetting.value);
      } catch { /* use defaults */ }

      const excludedList: string[] = rules?.excludedUnits || [];
      const deckPriority: boolean = rules?.deckPriority !== false;
      const maintenanceDeprioritize: boolean = rules?.maintenanceDeprioritize !== false;
      const deprioritizedList: string[] = rules?.deprioritizedUnits || [];

      let candidates = availableUnits.filter(c => !excludedList.includes(c.number));
      if (candidates.length === 0) candidates = availableUnits;
      autoAssignCandidates = candidates;

      const sortedUnits = candidates.sort((a, b) => {
        const aNum = parseInt(a.number.replace(/[A-Z]/g, ''));
        const bNum = parseInt(b.number.replace(/[A-Z]/g, ''));
        if (maintenanceDeprioritize) {
          const aDepri = deprioritizedList.includes(a.number) ? 1 : 0;
          const bDepri = deprioritizedList.includes(b.number) ? 1 : 0;
          if (aDepri !== bDepri) return aDepri - bDepri;
        }
        const section = (n: number) => n >= 1 && n <= 6 ? 1 : n >= 25 && n <= 26 ? 2 : 3;
        if (section(aNum) !== section(bNum)) return section(aNum) - section(bNum);
        if (deckPriority) {
          if (aNum % 2 === 0 && bNum % 2 !== 0) return -1;
          if (aNum % 2 !== 0 && bNum % 2 === 0) return 1;
        }
        return aNum - bNum;
      });

      assignedUnit = sortedUnits[0].number;
    } else if (validatedData.unitNumber) {
      // Verify specific unit is available
      const unit = await storage.getUnit(validatedData.unitNumber);
      if (!unit) {
        return res.status(400).json({ message: "Specified unit not found" });
      }
      if (!unit.isAvailable) {
        return res.status(400).json({ message: "Specified unit is not available" });
      }
      assignedUnit = validatedData.unitNumber;
    }
    
    // Create guest token
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (validatedData.expiresInHours || 24));
    
    const guestToken = {
      id: randomUUID(),
      token,
      unitNumber: assignedUnit,
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
    
    const createdToken = await storage.createGuestToken({
      token: guestToken.token,
      createdBy: req.user.id,  // ✅ FIXED: Use authenticated user ID
      expiresAt: guestToken.expiresAt,
      unitNumber: guestToken.unitNumber,
      autoAssign: validatedData.autoAssign || false,
      guestName: guestToken.guestName,
      phoneNumber: guestToken.phoneNumber,
      email: guestToken.email,
      expectedCheckoutDate: guestToken.expectedCheckoutDate,
      createdAt: guestToken.createdAt,
    });
    
    // Generate the check-in link — PUBLIC_URL for production, fallback to request host for local dev
    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/guest-checkin?token=${token}`;
    
    // Success logging for Create Link debugging
    console.log('✅ [Guest Token Creation] Token created successfully');
    console.log('✅ [Guest Token Creation] Response data:', {
      tokenId: createdToken.token.substring(0, 8) + '...',
      link: link,
      unitNumber: assignedUnit,
      guestName: createdToken.guestName || 'None',
      expiresAt: createdToken.expiresAt,
      timestamp: new Date().toISOString()
    });
    console.log('🚀 [Guest Token Creation] Sending response to client...');

    // US-144: Notify operator if maintenance unit assigned with no alternatives
    if (assignedUnit && validatedData.autoAssign && autoAssignCandidates.length > 0) {
      try {
        const activeProblems = await storage.getActiveProblems({ page: 1, limit: 1000 });
        const unitProblems = activeProblems.data.filter(
          (p: any) => p.unitNumber === assignedUnit && !p.isResolved
        );
        if (unitProblems.length > 0) {
          const maintenanceUnitNumbers = new Set(activeProblems.data.map((p: any) => p.unitNumber));
          const hasCleanAlternative = autoAssignCandidates.some(
            (c: any) => c.number !== assignedUnit && !maintenanceUnitNumbers.has(c.number)
          );
          if (!hasCleanAlternative) {
            notifyOperatorMaintenanceUnit({
              unitNumber: assignedUnit,
              guestName: validatedData.guestName || 'Guest',
              guestPhone: validatedData.phoneNumber,
              problems: unitProblems.map((p: any) => p.description),
            });
          }
        }
      } catch (notifyErr: any) {
        console.error('[Guest Token Creation] Maintenance notification error (non-blocking):', notifyErr.message);
      }
    }

    res.json({
      token: createdToken.token,
      link,
      unitNumber: assignedUnit,
      guestName: validatedData.guestName || "Guest",
      expiresAt: createdToken.expiresAt,
    });

  } catch (error: any) {
    // Enhanced error logging for Create Link debugging
    console.error("❌ [Guest Token Creation] Error occurred during token creation");
    console.error("❌ [Guest Token Creation] Error details:", {
      message: error.message,
      stack: error.stack?.split('\n')[0], // Just first line of stack
      code: error.code,
      timestamp: new Date().toISOString(),
      requestData: {
        autoAssign: req.body?.autoAssign,
        unitNumber: req.body?.unitNumber,
        hasGuestName: !!req.body?.guestName
      }
    });
    console.error("❌ [Guest Token Creation] Full error object:", error);
    
    res.status(400).json({ 
      message: error.message || "Failed to create guest token",
      details: "Check server logs for more information",
      timestamp: new Date().toISOString()
    });
  }
});

// Get active guest tokens (reserved units)
router.get("/active", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const activeTokens = await storage.getActiveGuestTokens({ page, limit });
    res.json(activeTokens);
  } catch (error: any) {
    // Check if this is a table missing error for guest_tokens
    if (error.message?.includes('relation "guest_tokens" does not exist')) {
      return handleFeatureNotImplementedError(
        'Guest Token Management',
        '/api/guest-tokens/active',
        res
      );
    }
    
    // Handle other database errors with detailed messages
    handleDatabaseError(error, '/api/guest-tokens/active', res);
  }
});

// Get guest token by token (for guest check-in page)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { successPage } = req.query;
    const guestToken = await storage.getGuestToken(token);
    
    if (!guestToken) {
      return res.status(404).json({ message: "Token not found" });
    }
    
    // Handle used tokens
    if (guestToken.isUsed) {
      // For used tokens, check if there's a completed check-in (guest record)
      try {
        const guests = await storage.getAllGuests({ page: 1, limit: 1000 });
        const guestRecord = guests.data.find(guest =>
          guest.name === guestToken.guestName ||
          guest.phoneNumber === guestToken.phoneNumber ||
          guest.unitNumber === guestToken.unitNumber
        );
        
        if (guestRecord && successPage) {
          // Return success page data with guest information
          return res.json({
            ...guestToken,
            isSuccessPageAccess: true,
            guestData: {
              id: guestRecord.id,
              name: guestRecord.name,
              unitNumber: guestRecord.unitNumber,
              phoneNumber: guestRecord.phoneNumber,
              email: guestRecord.email,
              checkinTime: guestRecord.checkinTime,
              expectedCheckoutDate: guestRecord.expectedCheckoutDate,
              paymentAmount: guestRecord.paymentAmount,
              paymentMethod: guestRecord.paymentMethod,
              notes: guestRecord.notes,
              isPaid: guestRecord.paymentStatus === 'paid'
            }
          });
        } else if (guestRecord) {
          // Token used and has guest record - allow basic access (for any duplicate requests)
          return res.json(guestToken);
        } else {
          // Token used but no guest record found
          return res.status(400).json({ message: "Token has already been used" });
        }
      } catch (guestFetchError) {
        console.error("Error checking guest records:", guestFetchError);
        // If we can't check guest records, fall back to original behavior
        if (successPage) {
          return res.json(guestToken);
        } else {
          return res.status(400).json({ message: "Token has already been used" });
        }
      }
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
    const updatedToken = await storage.markTokenAsUsed(token);
    
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

    // Check if assigned unit is still available
    if (guestToken.unitNumber) {
      const availableUnits = await storage.getAvailableUnits();
      const availableUnitNumbers = availableUnits.map(c => c.number);

      if (!availableUnitNumbers.includes(guestToken.unitNumber)) {
        return res.status(400).json({
          message: `Assigned unit ${guestToken.unitNumber} is no longer available`
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
      unitNumber: guestToken.unitNumber!,
      checkinTime: new Date(),
      expectedCheckoutDate: validatedData.checkOutDate,
      guestType: 'self_checkin' as const,
      paymentAmount: "0", // Default payment amount
      paymentStatus: 'unpaid' as const,
      idNumber: validatedData.icNumber || validatedData.passportNumber,
      // ⚠️  CRITICAL: DO NOT MODIFY - This saves document photo URL for thumbnail display ⚠️
      // This field is used by the Guest Details page to show document thumbnails.
      // Changing this logic will break the thumbnail display system.
      // The upload system generates URLs that are stored here and displayed as thumbnails.
      profilePhotoUrl: validatedData.icDocumentUrl || validatedData.passportDocumentUrl || undefined,
    };

    // Create the guest
    const guest = await storage.createGuest(guestData);
    
    // Mark token as used
    await storage.markTokenAsUsed(token);
    
    // Send push notification for self-checkin
    try {
      const notificationPayload = createNotificationPayload.guestCheckIn(
        guest.name,
        `Unit ${guest.unitNumber}`
      );

      await pushNotificationService.sendToAdmins(notificationPayload);
      console.log(`Push notification sent for self-checkin: ${guest.name}`);
    } catch (error) {
      console.error('Failed to send push notification for self-checkin:', error);
      // Don't fail the request if notification fails
    }

    // Notify Rainbow AI to send WhatsApp message to admin
    try {
      const rainbowPort = process.env.RAINBOW_PORT || 3002;
      await fetch(`http://localhost:${rainbowPort}/api/rainbow/notify-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guest.name,
          phoneNumber: guest.phoneNumber || validatedData.phoneNumber,
          unitNumber: guest.unitNumber,
          checkInDate: guest.checkinTime?.toISOString(),
          checkOutDate: guest.expectedCheckoutDate,
          idNumber: guest.idNumber,
          email: guest.email,
          nationality: validatedData.nationality,
          gender: validatedData.gender,
          age: validatedData.age,
        }),
      });
      console.log(`[Self-Checkin] Rainbow AI notified for ${guest.name}`);
    } catch (error) {
      console.error('[Self-Checkin] Failed to notify Rainbow AI:', error);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json({
      success: true,
      guest,
      unitNumber: guest.unitNumber,
      message: "Check-in completed successfully"
    });
  } catch (error) {
    console.error("Error completing self-checkin:", error);
    res.status(500).json({ message: "Failed to complete check-in" });
  }
});

// Delete expired tokens (cleanup endpoint) - MUST come before /:id route
router.delete("/cleanup", authenticateToken, async (req: any, res) => {
  try {
    await storage.cleanExpiredTokens();
    res.json({ message: "Expired tokens cleaned up successfully" });
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
    res.status(500).json({ message: "Failed to cleanup expired tokens" });
  }
});

// Delete guest token
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Delete the token directly by ID
    // The deleteGuestToken method will handle finding the token by ID
    const deleted = await storage.deleteGuestToken(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Guest token not found" });
    }
    
    res.json({ message: "Guest token deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting guest token:", error);
    res.status(500).json({ message: error.message || "Failed to delete guest token" });
  }
});

// Cancel pending guest check-in
router.patch("/:id/cancel", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Get the guest token to check if it exists and is not used
    const guestToken = await storage.getGuestTokenById(id);
    if (!guestToken) {
      return res.status(404).json({ message: "Guest check-in not found" });
    }
    
    if (guestToken.isUsed) {
      return res.status(400).json({ message: "Cannot cancel already used check-in" });
    }
    
    // Mark token as cancelled (we'll use isUsed field for this)
    const updated = await storage.markTokenAsUsed(guestToken.token);
    
    if (!updated) {
      return res.status(400).json({ message: "Failed to cancel check-in" });
    }
    
    res.json({ message: "Check-in cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling guest check-in:", error);
    res.status(400).json({ message: error.message || "Failed to cancel check-in" });
  }
});

// Update guest token unit assignment
router.patch("/:tokenId/unit",
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateGuestTokenUnitSchema, 'body'),
  async (req: any, res) => {
  try {
    const { tokenId } = req.params;
    const validatedData = req.body;

    console.log('[Guest Token Unit Update] Request received');
    console.log('[Guest Token Unit Update] User:', req.user?.email || 'Unknown');
    console.log('[Guest Token Unit Update] Token ID:', tokenId);
    console.log('[Guest Token Unit Update] Request data:', {
      autoAssign: validatedData.autoAssign,
      unitNumber: validatedData.unitNumber,
      timestamp: new Date().toISOString()
    });

    // Get the existing guest token to check if it can be updated
    const existingToken = await storage.getGuestTokenById(tokenId);
    if (!existingToken) {
      return res.status(404).json({ message: "Guest token not found" });
    }

    // Prevent updating already used tokens
    if (existingToken.isUsed) {
      return res.status(400).json({
        message: "Cannot update unit assignment for already used guest token"
      });
    }

    // Check if token is expired
    if (existingToken.expiresAt && new Date() > existingToken.expiresAt) {
      return res.status(400).json({ message: "Cannot update expired guest token" });
    }

    // Store the previous unit for response
    const previousUnit = existingToken.unitNumber;

    // Determine new unit assignment
    let newUnitNumber: string | null = null;

    if (validatedData.autoAssign) {
      // Auto-assign logic: get available units and pick the best one
      const availableUnits = await storage.getAvailableUnits();

      if (availableUnits.length === 0) {
        return res.status(400).json({ message: "No units available for auto-assignment" });
      }

      // Use the same priority logic as token creation
      const sortedUnits = availableUnits.sort((a, b) => {
        const aNum = parseInt(a.number.replace(/[A-Z]/g, ''));
        const bNum = parseInt(b.number.replace(/[A-Z]/g, ''));

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

      newUnitNumber = sortedUnits[0].number;
    } else if (validatedData.unitNumber) {
      // Verify specific unit is available
      const unit = await storage.getUnit(validatedData.unitNumber);
      if (!unit) {
        return res.status(400).json({ message: "Specified unit not found" });
      }
      if (!unit.isAvailable) {
        return res.status(400).json({ message: "Specified unit is not available" });
      }
      newUnitNumber = validatedData.unitNumber;
    }

    // Update the guest token
    const updatedToken = await storage.updateGuestTokenUnit(
      tokenId,
      newUnitNumber,
      validatedData.autoAssign || false
    );

    if (!updatedToken) {
      return res.status(500).json({ message: "Failed to update guest token unit assignment" });
    }

    console.log('[Guest Token Unit Update] Update successful');
    console.log('[Guest Token Unit Update] Response data:', {
      tokenId: updatedToken.id?.substring(0, 8) + '...',
      previousUnit: previousUnit,
      newUnit: newUnitNumber,
      autoAssign: validatedData.autoAssign || false,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      updatedToken: {
        id: updatedToken.id,
        token: updatedToken.token,
        unitNumber: updatedToken.unitNumber,
        autoAssign: updatedToken.autoAssign,
        guestName: updatedToken.guestName,
        expiresAt: updatedToken.expiresAt,
        isUsed: updatedToken.isUsed
      },
      previousUnit: previousUnit,
      message: `Unit assignment updated ${previousUnit ? `from ${previousUnit}` : ''} to ${newUnitNumber || 'auto-assign'}`
    });

  } catch (error: any) {
    console.error("[Guest Token Unit Update] Error occurred during update");
    console.error("[Guest Token Unit Update] Error details:", {
      message: error.message,
      stack: error.stack?.split('\n')[0],
      code: error.code,
      timestamp: new Date().toISOString(),
      tokenId: req.params?.tokenId,
      requestData: {
        autoAssign: req.body?.autoAssign,
        unitNumber: req.body?.unitNumber
      }
    });

    res.status(500).json({
      message: error.message || "Failed to update guest token unit assignment",
      details: "Check server logs for more information",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;