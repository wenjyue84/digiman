/**
 * reservation-validation.ts — Reservation/booking schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { DATE_REGEX } from "../validation-patterns";
import { reservations } from "../schema-tables";

// ─── Reservation Schemas ─────────────────────────────────────────

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  confirmationNumber: true,
  createdAt: true,
  updatedAt: true,
  guestId: true,
  cancelledAt: true,
  cancelledBy: true,
  cancelReason: true,
  createdBy: true,
}).extend({
  guestName: z.string()
    .min(1, "Guest name is required")
    .max(200, "Guest name must not exceed 200 characters")
    .transform(val => val.trim()),
  guestPhone: z.string()
    .max(50, "Phone must not exceed 50 characters")
    .optional()
    .nullable(),
  guestEmail: z.string()
    .email("Must be a valid email")
    .optional()
    .nullable(),
  guestNationality: z.string()
    .max(100, "Nationality must not exceed 100 characters")
    .optional()
    .nullable(),
  numberOfGuests: z.coerce.number()
    .int()
    .min(1, "At least 1 guest required")
    .max(20, "Maximum 20 guests"),
  unitNumber: z.string()
    .max(20, "Unit number must not exceed 20 characters")
    .optional()
    .nullable(),
  checkInDate: z.string()
    .regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format"),
  checkOutDate: z.string()
    .regex(DATE_REGEX, "Check-out date must be in YYYY-MM-DD format"),
  numberOfNights: z.coerce.number()
    .int()
    .min(1, "At least 1 night required")
    .max(365, "Maximum 365 nights"),
  totalAmount: z.string()
    .optional()
    .nullable(),
  depositAmount: z.string()
    .optional()
    .nullable(),
  depositMethod: z.enum(["cash", "tng", "bank", "platform", "other"])
    .optional()
    .nullable(),
  depositPaid: z.boolean().default(false),
  refundStatus: z.enum(["pending", "refunded", "forfeited"])
    .optional()
    .nullable(),
  status: z.enum(["confirmed", "pending", "cancelled", "no_show", "checked_in", "expired"])
    .default("confirmed"),
  source: z.enum(["walk_in", "phone", "whatsapp", "booking_com", "airbnb", "agoda", "other"])
    .default("walk_in"),
  specialRequests: z.string()
    .max(1000, "Special requests must not exceed 1000 characters")
    .optional()
    .nullable(),
  internalNotes: z.string()
    .max(1000, "Internal notes must not exceed 1000 characters")
    .optional()
    .nullable(),
}).refine(data => {
  return new Date(data.checkOutDate) > new Date(data.checkInDate);
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

export const updateReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  confirmationNumber: true,
  createdAt: true,
  createdBy: true,
}).partial();

export const cancelReservationSchema = z.object({
  cancelReason: z.string()
    .max(500, "Cancel reason must not exceed 500 characters")
    .optional(),
});

// ─── Schema-derived Types ────────────────────────────────────────

export type InsertReservationInput = z.infer<typeof insertReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
