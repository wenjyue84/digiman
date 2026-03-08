import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertReservationSchema, cancelReservationSchema } from "@shared/schema";
import { authenticateToken } from "./middleware/auth";
import { sendError, sendSuccess } from "../lib/apiResponse";

const router = Router();

/** Generate confirmation number: PLG-YYYYMMDD-NNN */
async function generateConfirmationNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `PLG-${dateStr}`;

  // Count all reservations whose confirmation number starts with today's prefix
  const existing = await storage.getReservations();
  const todayCount = existing.data.filter(r =>
    r.confirmationNumber.startsWith(prefix)
  ).length;

  const seq = String(todayCount + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}

// GET / — List reservations with filters
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const pagination = hasPagination
      ? { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 20 }
      : undefined;

    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
    if (req.query.dateTo) filters.dateTo = req.query.dateTo;
    if (req.query.unitNumber) filters.unitNumber = req.query.unitNumber;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.source) filters.source = req.query.source;

    const hasFilters = Object.keys(filters).length > 0;
    const result = await storage.getReservations(pagination, hasFilters ? filters : undefined);
    res.json(result);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    sendError(res, 500, "Failed to fetch reservations");
  }
});

// GET /arrivals/today — Today's expected arrivals
router.get("/arrivals/today", authenticateToken, async (_req: any, res) => {
  try {
    const arrivals = await storage.getTodayArrivals();
    res.json(arrivals);
  } catch (error) {
    console.error("Error fetching today arrivals:", error);
    sendError(res, 500, "Failed to fetch today's arrivals");
  }
});

// GET /upcoming — Upcoming reservations
router.get("/upcoming", authenticateToken, async (req: any, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const upcoming = await storage.getUpcomingReservations(days);
    res.json(upcoming);
  } catch (error) {
    console.error("Error fetching upcoming reservations:", error);
    sendError(res, 500, "Failed to fetch upcoming reservations");
  }
});

// GET /availability — Check unit availability
router.get("/availability", authenticateToken, async (req: any, res) => {
  try {
    const { unitNumber, checkIn, checkOut } = req.query;
    if (!unitNumber || !checkIn || !checkOut) {
      return sendError(res, 400, "unitNumber, checkIn, and checkOut are required");
    }

    const conflicts = await storage.getReservationsByUnit(
      unitNumber as string,
      new Date(checkIn as string),
      new Date(checkOut as string)
    );

    res.json({
      available: conflicts.length === 0,
      conflicts: conflicts.map(c => ({
        id: c.id,
        confirmationNumber: c.confirmationNumber,
        guestName: c.guestName,
        checkInDate: c.checkInDate,
        checkOutDate: c.checkOutDate,
        status: c.status,
      })),
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    sendError(res, 500, "Failed to check availability");
  }
});

// GET /confirmation/:num — Get by confirmation number
router.get("/confirmation/:num", authenticateToken, async (req: any, res) => {
  try {
    const reservation = await storage.getReservationByConfirmation(req.params.num);
    if (!reservation) {
      return sendError(res, 404, "Reservation not found");
    }
    res.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    sendError(res, 500, "Failed to fetch reservation");
  }
});

// GET /:id — Get single reservation
router.get("/:id", authenticateToken, async (req: any, res) => {
  try {
    const reservation = await storage.getReservation(req.params.id);
    if (!reservation) {
      return sendError(res, 404, "Reservation not found");
    }
    res.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    sendError(res, 500, "Failed to fetch reservation");
  }
});

// POST / — Create reservation
router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const validatedData = insertReservationSchema.parse(req.body);
    const confirmationNumber = await generateConfirmationNumber();

    // Check availability if unit specified
    if (validatedData.unitNumber) {
      const conflicts = await storage.getReservationsByUnit(
        validatedData.unitNumber,
        new Date(validatedData.checkInDate),
        new Date(validatedData.checkOutDate)
      );
      if (conflicts.length > 0) {
        return sendError(res, 409, `Unit ${validatedData.unitNumber} is not available for the selected dates`);
      }
    }

    const reservation = await storage.createReservation({
      ...validatedData,
      createdBy: req.user.id,
      confirmationNumber,
    });

    res.status(201).json(reservation);
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    if (error instanceof z.ZodError) {
      return sendError(res, 400, "Invalid data", error.errors);
    }
    sendError(res, 400, error.message || "Failed to create reservation");
  }
});

// PUT /:id — Update reservation
router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await storage.getReservation(id);
    if (!existing) {
      return sendError(res, 404, "Reservation not found");
    }

    // If unit or dates changed, check availability
    const unitNumber = req.body.unitNumber ?? existing.unitNumber;
    const checkInDate = req.body.checkInDate ?? existing.checkInDate;
    const checkOutDate = req.body.checkOutDate ?? existing.checkOutDate;

    if (unitNumber && (unitNumber !== existing.unitNumber || checkInDate !== existing.checkInDate || checkOutDate !== existing.checkOutDate)) {
      const conflicts = await storage.getReservationsByUnit(
        unitNumber,
        new Date(checkInDate),
        new Date(checkOutDate)
      );
      const realConflicts = conflicts.filter(c => c.id !== id);
      if (realConflicts.length > 0) {
        return sendError(res, 409, `Unit ${unitNumber} is not available for the selected dates`);
      }
    }

    const reservation = await storage.updateReservation(id, req.body);
    if (!reservation) {
      return sendError(res, 404, "Reservation not found");
    }
    res.json(reservation);
  } catch (error: any) {
    console.error("Error updating reservation:", error);
    sendError(res, 400, error.message || "Failed to update reservation");
  }
});

// POST /:id/cancel — Cancel reservation
router.post("/:id/cancel", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await storage.getReservation(id);
    if (!existing) {
      return sendError(res, 404, "Reservation not found");
    }
    if (existing.status === "cancelled") {
      return sendError(res, 400, "Reservation is already cancelled");
    }
    if (existing.status === "checked_in") {
      return sendError(res, 400, "Cannot cancel a checked-in reservation");
    }

    const { cancelReason } = cancelReservationSchema.parse(req.body);

    const reservation = await storage.updateReservation(id, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
      cancelReason: cancelReason || null,
    });
    res.json(reservation);
  } catch (error: any) {
    console.error("Error cancelling reservation:", error);
    sendError(res, 400, error.message || "Failed to cancel reservation");
  }
});

// POST /:id/convert — Convert reservation to check-in (creates guest)
router.post("/:id/convert", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const reservation = await storage.getReservation(id);
    if (!reservation) {
      return sendError(res, 404, "Reservation not found");
    }
    if (reservation.status !== "confirmed" && reservation.status !== "pending") {
      return sendError(res, 400, `Cannot convert reservation with status "${reservation.status}"`);
    }

    let unitNumber = reservation.unitNumber;

    // Auto-assign unit if not specified
    if (!unitNumber) {
      const availableUnits = await storage.getAvailableUnits();
      if (availableUnits.length === 0) {
        return sendError(res, 409, "No available units for check-in");
      }
      unitNumber = availableUnits[0].number;
    } else {
      // Verify unit is available
      const unit = await storage.getUnit(unitNumber);
      if (!unit) {
        return sendError(res, 404, `Unit ${unitNumber} not found`);
      }
      if (!unit.isAvailable) {
        return sendError(res, 409, `Unit ${unitNumber} is not available`);
      }
    }

    // Create guest from reservation data
    const guest = await storage.createGuest({
      name: reservation.guestName,
      unitNumber,
      checkInDate: new Date().toISOString().split('T')[0],
      expectedCheckoutDate: reservation.checkOutDate,
      paymentAmount: reservation.totalAmount || undefined,
      paymentMethod: (reservation.depositMethod as "cash" | "tng" | "bank" | "platform" | undefined) || "cash",
      paymentCollector: "System",
      isPaid: !!reservation.totalAmount,
      notes: [reservation.specialRequests, reservation.internalNotes].filter(Boolean).join(' | ') || undefined,
      nationality: reservation.guestNationality || undefined,
      phoneNumber: reservation.guestPhone || undefined,
      email: reservation.guestEmail || undefined,
    } as any);

    // Mark unit as occupied
    await storage.updateUnit(unitNumber, { isAvailable: false });

    // Update reservation status
    const updatedReservation = await storage.updateReservation(id, {
      status: "checked_in",
      guestId: guest.id,
      unitNumber,
    });

    res.json({ reservation: updatedReservation, guest });
  } catch (error: any) {
    console.error("Error converting reservation:", error);
    sendError(res, 500, error.message || "Failed to convert reservation to check-in");
  }
});

// DELETE /:id — Delete reservation (admin only)
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const deleted = await storage.deleteReservation(req.params.id);
    if (!deleted) {
      return sendError(res, 404, "Reservation not found");
    }
    sendSuccess(res, undefined, "Reservation deleted successfully");
  } catch (error: any) {
    console.error("Error deleting reservation:", error);
    sendError(res, 400, error.message || "Failed to delete reservation");
  }
});

// POST /expire-no-shows — Bulk expire past-due confirmed reservations
router.post("/expire-no-shows", authenticateToken, async (_req: any, res) => {
  try {
    const count = await storage.expireNoShowReservations();
    sendSuccess(res, { expired: count }, `${count} reservation(s) marked as no-show`);
  } catch (error: any) {
    console.error("Error expiring no-shows:", error);
    sendError(res, 500, "Failed to expire no-show reservations");
  }
});

export default router;
