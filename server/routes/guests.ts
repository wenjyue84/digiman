import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { 
  insertGuestSchema, 
  checkoutGuestSchema, 
  guestSelfCheckinSchema,
  createTokenSchema,
  updateGuestSchema
} from "@shared/schema";
import { calculateAgeFromIC } from "@shared/utils";
import { validateData, securityValidationMiddleware, sanitizers, validators } from "../validation";
import { getConfig, AppConfig } from "../configManager";
import { authenticateToken } from "./middleware/auth";
import sgMail from "@sendgrid/mail";
// REFACTORING: Import new utility functions to eliminate duplication
import { handleRouteError, asyncRouteHandler, sendSuccessResponse } from "../lib/errorHandler";
import { getTodayBoundary, isOverdue } from "../lib/dateUtils";
import { pushNotificationService, createNotificationPayload } from "../lib/pushNotifications.js";
import { notifyOperatorMaintenanceUnit } from "../lib/maintenanceNotify";

// Validation schema for guest history query parameters
const guestHistoryQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['name', 'unitNumber', 'checkinTime', 'checkoutTime']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string()
    .max(100, "Search query must not exceed 100 characters")
    .transform(val => sanitizers.sanitizeString(val))
    .transform(val => val.trim() || undefined)
    .optional(),
  nationality: z.string()
    .max(60, "Nationality must not exceed 60 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Nationality can only contain letters, spaces, hyphens, and apostrophes")
    .transform(val => val.trim() || undefined)
    .optional(),
  unit: z.string()
    .max(10, "Unit number must not exceed 10 characters")
    .transform(val => val.trim() || undefined)
    .optional(),
});

const router = Router();

// Bulk checkout overdue guests
router.post("/checkout-overdue", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  // REFACTORED: Use centralized date utility instead of duplicated logic
  const today = getTodayBoundary();

  // Get all currently checked-in guests (high limit to cover dev data)
  const checkedInResponse = await storage.getCheckedInGuests({ page: 1, limit: 10000 });
  const checkedIn = checkedInResponse.data || [];

  // Filter overdue using centralized date utility
  const overdue = checkedIn.filter(g => {
    if (!g.expectedCheckoutDate) return false;
    try {
      const checkoutDate = new Date(g.expectedCheckoutDate + 'T00:00:00');
      return checkoutDate.getTime() < today.getTime();
    } catch {
      return false;
    }
  });

  const checkedOutIds: string[] = [];
  for (const guest of overdue) {
    const updated = await storage.checkoutGuest(guest.id);
    if (updated) checkedOutIds.push(updated.id);
  }

  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, { count: checkedOutIds.length, checkedOutIds }, "Overdue guests checked out successfully");
}));

// Bulk checkout guests expected to check out today
router.post("/checkout-today", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  // REFACTORED: Use centralized date utility instead of duplicated logic
  const today = getTodayBoundary();

  // Get all currently checked-in guests (high limit to cover dev data)
  const checkedInResponse = await storage.getCheckedInGuests({ page: 1, limit: 10000 });
  const checkedIn = checkedInResponse.data || [];

  // Filter guests expected to check out today using centralized date utility
  const todayCheckouts = checkedIn.filter(g => {
    if (!g.expectedCheckoutDate) return false;
    try {
      const d = new Date(g.expectedCheckoutDate + 'T00:00:00');
      return d.getTime() === today.getTime();
    } catch {
      return false;
    }
  });

  if (todayCheckouts.length === 0) {
    // REFACTORED: Use centralized success response helper
    return sendSuccessResponse(res, { count: 0, checkedOutIds: [] }, "No guests expected to check out today");
  }

  const checkedOutIds: string[] = [];
  for (const guest of todayCheckouts) {
    const updated = await storage.checkoutGuest(guest.id);
    if (updated) checkedOutIds.push(updated.id);
  }

  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, { count: checkedOutIds.length, checkedOutIds }, `Successfully checked out ${checkedOutIds.length} guests expected to check out today`);
}));

// Bulk checkout all currently checked-in guests
router.post("/checkout-all", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  // Get all currently checked-in guests
  const checkedInResponse = await storage.getCheckedInGuests({ page: 1, limit: 10000 });
  const checkedIn = checkedInResponse.data || [];

  if (checkedIn.length === 0) {
    // REFACTORED: Use centralized success response helper
    return sendSuccessResponse(res, { count: 0, checkedOutIds: [] }, "No guests currently checked in");
  }

  const checkedOutIds: string[] = [];
  for (const guest of checkedIn) {
    const updated = await storage.checkoutGuest(guest.id);
    if (updated) checkedOutIds.push(updated.id);
  }

  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, { count: checkedOutIds.length, checkedOutIds }, `Successfully checked out all ${checkedOutIds.length} guests`);
}));

// Get all checked-in guests - no caching for real-time updates
router.get("/checked-in", asyncRouteHandler(async (req: any, res: any) => {
  // Disable caching for real-time guest checkout updates
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const hasPagination = req.query.page || req.query.limit;
  const pagination = hasPagination
    ? { page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 20 }
    : undefined;
  const paginatedGuests = await storage.getCheckedInGuests(pagination);
  res.json(paginatedGuests);
}));

// Get guest history
router.get("/history", 
  securityValidationMiddleware, 
  validateData(guestHistoryQuerySchema, 'query'),
  asyncRouteHandler(async (req: any, res: any) => {
    // Query params are now validated and sanitized
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy as string || 'checkoutTime';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    
    // Extract validated filter parameters (undefined values already handled by schema transforms)
    const filters = {
      search: req.query.search,
      nationality: req.query.nationality,
      unit: req.query.unit,
    };

    // Remove undefined values for cleaner passing
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined)
    ) as { search?: string; nationality?: string; unit?: string } | undefined;
    
    const history = await storage.getGuestHistory(
      { page, limit }, 
      sortBy, 
      sortOrder,
      Object.keys(cleanFilters || {}).length > 0 ? cleanFilters : undefined
    );
    res.json(history);
  })
);

// Get guests with checkout today (for daily notifications)
router.get("/checkout-today", asyncRouteHandler(async (_req: any, res: any) => {
  const guests = await storage.getGuestsWithCheckoutToday();
  res.json(guests);
}));

// ── RESTful base CRUD ─────────────────────────────────────────────────────────
// NOTE: These must be declared BEFORE the wildcard router.patch('/:id') and
// router.patch('/:id/unit') routes to avoid Express path shadowing.

// List all guests (with optional pagination + search)
router.get("/", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const { search, page, limit } = req.query;
  const pagination = {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50,
  };
  const guests = await storage.getAllGuests(pagination);

  // Client-side search filter when ?search= is provided
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    guests.data = guests.data.filter((g: any) =>
      (g.name || '').toLowerCase().includes(q) ||
      (g.idNumber || '').toLowerCase().includes(q) ||
      (g.unitNumber || '').toLowerCase().includes(q)
    );
  }
  res.json(guests);
}));

// Create a new guest (same schema as /checkin but at the root endpoint)
router.post("/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertGuestSchema, 'body'),
  asyncRouteHandler(async (req: any, res: any) => {
    const validatedData = req.body;
    const guest = await storage.createGuest(validatedData);
    res.status(201).json(guest);
  })
);

// Delete a guest record permanently
router.delete("/:id", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const deleted = await storage.deleteGuest(id);
  if (!deleted) {
    return res.status(404).json({ message: "Guest not found" });
  }
  res.status(200).json({ message: "Guest deleted successfully" });
}));

// Get a single guest by ID
router.get("/:id", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const guest = await storage.getGuest(id);
  if (!guest) {
    return res.status(404).json({ message: "Guest not found" });
  }
  res.json(guest);
}));

// Checkout a guest by ID (RESTful: POST /guests/:id/checkout)
router.post("/:id/checkout", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const guest = await storage.checkoutGuest(id);
  if (!guest) {
    return res.status(404).json({ message: "Guest not found or already checked out" });
  }
  res.json(guest);
}));

// Update guest information
router.patch("/:id",
  (req, res, next) => {
    console.log('Guest update route - request received:', { method: req.method, url: req.url, body: req.body });
    next();
  },
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateGuestSchema, 'body'),
  asyncRouteHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Guest update request:', { id, updates });
    
    // Validate updates
    if (updates.email && updates.email !== "") {
      console.log('Validating email:', updates.email);
      const isValidDomain = await validators.isValidEmailDomain(updates.email);
      console.log('Email domain validation result:', isValidDomain);
      if (!isValidDomain) {
        return res.status(400).json({ message: "Invalid email domain" });
      }
    }
    
    if (updates.phoneNumber) {
      console.log('Validating phone number:', updates.phoneNumber);
      const isValidPhone = validators.isValidInternationalPhone(updates.phoneNumber);
      console.log('Phone validation result:', isValidPhone);
      if (!isValidPhone) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }
    
    console.log('All validations passed, updating guest...');
    const guest = await storage.updateGuest(id, updates);
    if (!guest) {
      console.log('Guest not found for ID:', id);
      return res.status(404).json({ message: "Guest not found" });
    }

    console.log('Guest updated successfully:', guest.id);
    res.json(guest);
  }));

// Guest check-in
router.post("/checkin", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertGuestSchema, 'body'),
  asyncRouteHandler(async (req: any, res: any) => {
    try {
      const validatedData = req.body;
      
      // Check if unit is available
      const availableUnits = await storage.getAvailableUnits();
      const availableUnitNumbers = availableUnits.map(c => c.number);

      if (!availableUnitNumbers.includes(validatedData.unitNumber)) {
        return res.status(400).json({ message: `Unit ${validatedData.unitNumber} is not available` });
      }

      // Check if guest already exists and is currently checked in
      if (validatedData.idNumber) {
        // TODO: Implement getGuestByIdNumber method in storage
        // For now, skip this check to avoid blocking check-ins
        // const existingGuest = await storage.getGuestByIdNumber(validatedData.idNumber);
        // if (existingGuest && existingGuest.isCheckedIn) {
        //   return res.status(400).json({ 
        //     message: "Guest with this ID number is already checked in",
        //     existingGuest: {
        //       id: existingGuest.id,
        //       name: existingGuest.name,
        //       unitNumber: existingGuest.unitNumber,
        //       checkinTime: existingGuest.checkinTime
        //     }
        //   });
        // }
      }

      // Calculate age from IC number if provided
      if (validatedData.idNumber && validatedData.idNumber.length === 12) {
        const age = calculateAgeFromIC(validatedData.idNumber);
        if (age !== null) {
          validatedData.age = age.toString();
        }
      }

      const guest = await storage.createGuest(validatedData);
      
      // Send push notification for new guest check-in
      // NOTE: Notifications are only sent if there are active subscribers.
      // Users must subscribe to push notifications in Settings > General first.
      // If no subscriptions exist, no notifications will be sent (expected behavior).
      try {
        const notificationPayload = createNotificationPayload.guestCheckIn(
          guest.name,
          `Unit ${guest.unitNumber}`
        );

        await pushNotificationService.sendToAdmins(notificationPayload);
        console.log(`Push notification sent for guest check-in: ${guest.name}`);
      } catch (error) {
        console.error('Failed to send push notification for guest check-in:', error);
        // Don't fail the request if notification fails
      }

      // US-144: Notify operator if unit has maintenance issues and no clean alternative
      try {
        const activeProblems = await storage.getActiveProblems({ page: 1, limit: 1000 });
        const unitProblems = activeProblems.data.filter(
          (p: any) => p.unitNumber === guest.unitNumber && !p.isResolved
        );
        if (unitProblems.length > 0) {
          const maintenanceUnitNumbers = new Set(activeProblems.data.map((p: any) => p.unitNumber));
          const hasCleanAlternative = availableUnits.some(
            (c: any) => c.number !== guest.unitNumber && !maintenanceUnitNumbers.has(c.number)
          );
          if (!hasCleanAlternative) {
            notifyOperatorMaintenanceUnit({
              unitNumber: guest.unitNumber,
              guestName: guest.name,
              guestPhone: guest.phoneNumber || undefined,
              problems: unitProblems.map((p: any) => p.description),
            });
          }
        }
      } catch (notifyErr: any) {
        console.error('[Checkin] Maintenance notification error (non-blocking):', notifyErr.message);
      }

      res.status(201).json(guest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      // Re-throw to let asyncRouteHandler handle it
      throw error;
    }
  })
);

// Check-out a guest
router.post("/checkout", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  try {
    const validatedData = checkoutGuestSchema.parse(req.body);
    const guest = await storage.checkoutGuest(validatedData.id);
    
    if (!guest) {
      return res.status(404).json({ message: "Guest not found or already checked out" });
    }

    res.json(guest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    // Re-throw to let asyncRouteHandler handle it
    throw error;
  }
}));

// Re-checkin a guest (undo checkout)
router.post("/recheckin", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  try {
    const { id } = checkoutGuestSchema.parse(req.body);
    const existing = await storage.getGuest(id);
    if (!existing) {
      return res.status(404).json({ message: "Guest not found" });
    }

    const updated = await storage.updateGuest(id, { isCheckedIn: true, checkoutTime: null });
    if (!updated) {
      return res.status(400).json({ message: "Failed to re-check in guest" });
    }

    // Mark unit as occupied and cleaned (since it's currently in-use)
    await storage.updateUnit(updated.unitNumber, { isAvailable: false, cleaningStatus: 'cleaned' } as any);

    // REFACTORED: Use centralized success response helper
    sendSuccessResponse(res, { guest: updated }, "Guest re-checked in");
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    // Re-throw to let asyncRouteHandler handle it
    throw error;
  }
}));

// Guest profiles (CRM-like functionality)
router.get('/profiles', authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  const all = await storage.getAllGuests();
  const map = new Map<string, any>();
  for (const g of all.data) {
    const idNumber = (g.idNumber || '').trim();
    if (!idNumber) continue;
    const current = map.get(idNumber) || {
      idNumber,
      name: g.name,
      nationality: g.nationality,
      phoneNumber: g.phoneNumber,
      email: g.email,
      totalStays: 0,
      lastSeen: undefined as any,
    };
    current.totalStays += 1;
    const t = g.checkoutTime || g.checkinTime;
    if (!current.lastSeen || new Date(t) > new Date(current.lastSeen)) {
      current.lastSeen = t;
      current.name = g.name || current.name;
      current.nationality = g.nationality || current.nationality;
      current.phoneNumber = g.phoneNumber || current.phoneNumber;
      current.email = g.email || current.email;
    }
    map.set(idNumber, current);
  }
  // attach blacklist flags from settings
  const profiles = await Promise.all(Array.from(map.values()).map(async (p) => {
    const bl = await storage.getSetting(`blacklist:${p.idNumber}`);
    const note = await storage.getSetting(`blacklistNote:${p.idNumber}`);
    return {
      ...p,
      isBlacklisted: bl?.value === 'true',
      blacklistNote: note?.value || ''
    };
  }));
  res.json({ data: profiles });
}));

router.get('/profiles/:idNumber', authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const idNumber = (req.params.idNumber || '').trim();
  const all = await storage.getAllGuests();
  const records = all.data.filter(g => (g.idNumber || '').trim() === idNumber);
  if (records.length === 0) return res.status(404).json({ message: 'Profile not found' });
  const latest = records.sort((a, b) => new Date((b.checkoutTime || b.checkinTime) as any).getTime() - new Date((a.checkoutTime || a.checkinTime) as any).getTime())[0];
  const bl = await storage.getSetting(`blacklist:${idNumber}`);
  const note = await storage.getSetting(`blacklistNote:${idNumber}`);
  res.json({
    idNumber,
    name: latest.name,
    nationality: latest.nationality,
    phoneNumber: latest.phoneNumber,
    email: latest.email,
    totalStays: records.length,
    lastSeen: latest.checkoutTime || latest.checkinTime,
    isBlacklisted: bl?.value === 'true',
    blacklistNote: note?.value || ''
  });
}));

router.patch('/profiles/:idNumber', authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const idNumber = (req.params.idNumber || '').trim();
  const { isBlacklisted, blacklistNote } = req.body || {};
  const updatedBy = req.user?.username || req.user?.email || 'Unknown';
  if (typeof isBlacklisted === 'boolean') {
    await storage.setSetting(`blacklist:${idNumber}`, isBlacklisted.toString(), updatedBy);
  }
  if (typeof blacklistNote === 'string') {
    await storage.setSetting(`blacklistNote:${idNumber}`, blacklistNote, updatedBy);
  }
  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, {}, 'Profile updated successfully');
}));

// Get the most recently checked-out guest for undo confirmation
router.get("/undo-recent-checkout", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  const recentGuest = await storage.getRecentlyCheckedOutGuest();
  
  if (!recentGuest) {
    return res.status(404).json({ message: "No recently checked-out guest found" });
  }
  
  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, { guest: recentGuest }, "Recent checkout found");
}));

// Undo the most recent checkout
router.post("/undo-recent-checkout", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  const recentGuest = await storage.getRecentlyCheckedOutGuest();
  
  if (!recentGuest) {
    return res.status(404).json({ message: "No recently checked-out guest found" });
  }
  
  // Re-check in the most recent guest
  const updated = await storage.updateGuest(recentGuest.id, { isCheckedIn: true, checkoutTime: null });
  if (!updated) {
    return res.status(400).json({ message: "Failed to undo checkout" });
  }
  
  // Mark unit as occupied and cleaned (since it's currently in-use)
  await storage.updateUnit(updated.unitNumber, { isAvailable: false, cleaningStatus: 'cleaned' } as any);
  
  // REFACTORED: Use centralized success response helper
  sendSuccessResponse(res, { guest: updated }, "Checkout undone successfully");
}));

// Simple unit change for guests
router.patch("/:id/unit",
  securityValidationMiddleware,
  authenticateToken,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const { unitNumber, reason } = req.body;

    if (!unitNumber) {
      return res.status(400).json({ message: "Unit number is required" });
    }

    // Get the guest
    const guest = await storage.getGuest(id);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    // Check if new unit is available
    const availableUnits = await storage.getAvailableUnits();
    const isAvailable = availableUnits.some(c => c.number === unitNumber);

    if (!isAvailable && guest.unitNumber !== unitNumber) {
      return res.status(400).json({ message: `Unit ${unitNumber} is not available` });
    }

    // Update guest's unit
    const updatedGuest = await storage.updateGuest(id, {
      unitNumber: unitNumber
    });

    if (!updatedGuest) {
      return res.status(400).json({ message: "Failed to update guest unit" });
    }

    res.json({
      success: true,
      message: `Guest moved to unit ${unitNumber}`,
      guest: updatedGuest
    });

  } catch (error: any) {
    console.error("Error changing guest unit:", error);
    res.status(500).json({
      message: error.message || "Failed to change unit"
    });
  }
});

export default router;