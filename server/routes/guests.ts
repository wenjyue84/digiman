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

// Get all checked-in guests - with caching
router.get("/checked-in", asyncRouteHandler(async (req: any, res: any) => {
  // Cache guest data for 15 seconds (frequently changing)
  res.set('Cache-Control', 'public, max-age=15');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const paginatedGuests = await storage.getCheckedInGuests({ page, limit });
  res.json(paginatedGuests);
}));

// Get guest history
router.get("/history", asyncRouteHandler(async (req: any, res: any) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const history = await storage.getGuestHistory({ page, limit });
  res.json(history);
}));

// Get guests with checkout today (for daily notifications)
router.get("/checkout-today", asyncRouteHandler(async (_req: any, res: any) => {
  const guests = await storage.getGuestsWithCheckoutToday();
  res.json(guests);
}));

// Update guest information
router.patch("/:id", 
  securityValidationMiddleware,
  authenticateToken,
  asyncRouteHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate updates
    if (updates.email && updates.email !== "" && !validators.isValidEmailDomain) {
      return res.status(400).json({ message: "Invalid email domain" });
    }
    
    if (updates.phoneNumber && !validators.isValidInternationalPhone(updates.phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }
    
    const guest = await storage.updateGuest(id, updates);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

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
      
      // Check if capsule is available
      const availableCapsules = await storage.getAvailableCapsules();
      const availableCapsuleNumbers = availableCapsules.map(c => c.number);
      
      if (!availableCapsuleNumbers.includes(validatedData.capsuleNumber)) {
        return res.status(400).json({ message: `Capsule ${validatedData.capsuleNumber} is not available` });
      }

      // Check if guest already exists and is currently checked in
      if (validatedData.idNumber) {
        const existingGuest = await storage.getGuestByIdNumber(validatedData.idNumber);
        if (existingGuest && existingGuest.isCheckedIn) {
          return res.status(400).json({ 
            message: "Guest with this ID number is already checked in",
            existingGuest: {
              id: existingGuest.id,
              name: existingGuest.name,
              capsuleNumber: existingGuest.capsuleNumber,
              checkinTime: existingGuest.checkinTime
            }
          });
        }
      }

      // Calculate age from IC number if provided
      if (validatedData.idNumber && validatedData.idNumber.length === 12) {
        const age = calculateAgeFromIC(validatedData.idNumber);
        if (age !== null) {
          validatedData.age = age.toString();
        }
      }

      const guest = await storage.createGuest(validatedData);
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

    // Mark capsule as occupied and cleaned (since it's currently in-use)
    await storage.updateCapsule(updated.capsuleNumber, { isAvailable: false, cleaningStatus: 'cleaned' } as any);

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

export default router;