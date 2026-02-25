/**
 * guest-validation.ts — Guest check-in, check-out, search, and self-check-in schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  PHONE_REGEX,
  PHONE_REGEX_LENIENT,
  NAME_REGEX,
  GUEST_NAME_REGEX,
  IC_RAW_REGEX,
  PASSPORT_REGEX_LENIENT,
  ID_NUMBER_REGEX,
  UNIT_NUMBER_REGEX,
  PAYMENT_AMOUNT_REGEX,
  DATE_REGEX,
  NATIONALITY_REGEX,
  EMERGENCY_PHONE_REGEX,
} from "../validation-patterns";
import { guests } from "../schema-tables";

// ─── Guest Alert Settings ────────────────────────────────────────────

export const guestAlertSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.array(z.enum(['whatsapp', 'push'])).default(['whatsapp']),
  advanceNotice: z.array(z.number().min(0).max(30)).default([0]),
  lastNotified: z.string().datetime().optional()
});

// ─── Guest Schemas ───────────────────────────────────────────────────

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  checkinTime: true,
  checkoutTime: true,
  isCheckedIn: true,
  profilePhotoUrl: true,
  alertSettings: true,
}).extend({
  name: z.string()
    .min(2, "Please enter the guest's full name (at least 2 characters)")
    .max(100, "Guest name too long. Please use 100 characters or fewer")
    .regex(GUEST_NAME_REGEX, "Guest name can only contain letters, numbers, spaces, periods (.), apostrophes ('), and hyphens (-). Special symbols are not allowed")
    .transform(val => val.trim()),
  unitNumber: z.string()
    .min(1, "Please select a unit for the guest")
    .regex(UNIT_NUMBER_REGEX, "Invalid unit format. Please use alphanumeric format (e.g., C1, Studio-A, 1BR-1)"),
  paymentAmount: z.string()
    .regex(PAYMENT_AMOUNT_REGEX, "Invalid amount format. Please enter numbers only (e.g., 50.00 or 150)")
    .transform(val => val || "0")
    .refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 9999.99;
    }, "Amount must be within the allowed range. Please check with admin for current limits")
    .optional(),
  paymentMethod: z.enum(["cash", "tng", "bank", "platform"], {
    required_error: "Please select a payment method"
  }).default("cash"),
  paymentCollector: z.string()
    .min(1, "Please select who collected the payment")
    .max(50, "Collector name too long. Please use 50 characters or fewer")
    .regex(/^[a-zA-Z\s'-]+$/, "Invalid collector name. Please use letters, spaces, apostrophes ('), and hyphens (-) only")
    .transform(val => val.trim()),
  isPaid: z.boolean().default(false),
  notes: z.string()
    .max(500, "Notes too long. Please use 500 characters or fewer to describe any special requirements")
    .transform(val => val?.trim() || "")
    .optional(),
  status: z.enum(["vip", "blacklisted"]).optional(),
  expectedCheckoutDate: z.string()
    .regex(DATE_REGEX, "Expected checkout date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1);
      return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
    .optional(),
  checkInDate: z.string()
    .regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      return date <= maxDate;
    }, "Check-in date cannot be more than 1 year in the future")
    .optional(),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
    required_error: "Please select a gender"
  }).optional(),
  nationality: z.string()
    .transform(val => val?.trim())
    .refine(val => !val || (val.length >= 2 && val.length <= 50 && NATIONALITY_REGEX.test(val)), "Nationality must be 2-50 characters and contain only letters, spaces, and hyphens")
    .optional(),
  phoneNumber: z.string()
    .transform(val => val?.replace(/\s/g, ""))
    .refine(val => !val || PHONE_REGEX_LENIENT.test(val), "Please enter a valid phone number (7-50 digits, may include +, spaces, dashes, parentheses)")
    .optional(),
  email: z.union([
    z.string().email("Invalid email format. Please enter a valid email address like john@example.com").transform(val => val.toLowerCase().trim()),
    z.literal("")
  ]).optional(),
  idNumber: z.string()
    .transform(val => val?.toUpperCase())
    .refine(val => !val || (val.length >= 6 && val.length <= 20 && ID_NUMBER_REGEX.test(val)), "ID/Passport number must be 6-20 characters with letters, numbers, and hyphens only")
    .optional(),
  emergencyContact: z.string()
    .transform(val => val?.trim())
    .refine(val => !val || (val.length >= 2 && val.length <= 100 && NAME_REGEX.test(val)), "Emergency contact name must be 2-100 characters with letters, spaces, periods, apostrophes, and hyphens only")
    .optional(),
  emergencyPhone: z.string()
    .transform(val => val?.replace(/\s/g, ""))
    .refine(val => !val || PHONE_REGEX.test(val), "Please enter a valid emergency phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
    .optional(),
  age: z.string().optional(),
  profilePhotoUrl: z.any().optional(),
});

export const updateGuestSchema = z.object({
  name: z.string()
    .min(2, "Please enter the guest's full name (at least 2 characters)")
    .max(100, "Guest name too long. Please use 100 characters or fewer")
    .regex(GUEST_NAME_REGEX, "Guest name can only contain letters, numbers, spaces, periods (.), apostrophes ('), and hyphens (-). Special symbols are not allowed")
    .transform(val => val.trim())
    .optional(),
  unitNumber: z.string()
    .min(1, "Please select a unit for the guest")
    .regex(UNIT_NUMBER_REGEX, "Invalid unit format. Please use alphanumeric format (e.g., C1, Studio-A, 1BR-1)")
    .optional(),
  paymentAmount: z.string()
    .regex(PAYMENT_AMOUNT_REGEX, "Invalid amount format. Please enter numbers only (e.g., 50.00 or 150)")
    .transform(val => val || "0")
    .refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 9999.99;
    }, "Amount must be within the allowed range. Please check with admin for current limits")
    .optional(),
  paymentMethod: z.enum(["cash", "tng", "bank", "platform"], {
    required_error: "Please select a payment method"
  }).optional(),
  paymentCollector: z.string()
    .min(1, "Please select who collected the payment")
    .max(50, "Collector name too long. Please use 50 characters or fewer")
    .regex(/^[a-zA-Z\s'-]+$/, "Invalid collector name. Please use letters, spaces, apostrophes ('), and hyphens (-) only")
    .transform(val => val.trim())
    .optional(),
  isPaid: z.boolean().optional(),
  notes: z.string()
    .max(500, "Notes too long. Please use 500 characters or fewer to describe any special requirements")
    .transform(val => val?.trim() || "")
    .optional(),
  status: z.union([z.string(), z.null()])
    .transform(val => {
      if (val === "" || val === null) return null;
      return val;
    })
    .optional()
    .refine(val => val === null || val === undefined || ["vip", "blacklisted"].includes(val), {
      message: "Status must be either 'vip' or 'blacklisted'"
    }),
  expectedCheckoutDate: z.string()
    .regex(DATE_REGEX, "Expected checkout date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1);
      return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
    .optional(),
  checkInDate: z.string()
    .regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      return date <= maxDate;
    }, "Check-in date cannot be more than 1 year in the future")
    .optional(),
  gender: z.string()
    .transform(val => val?.toLowerCase())
    .optional()
    .refine(val => !val || ["male", "female", "other", "prefer-not-to-say"].includes(val), {
      message: "Gender must be 'male', 'female', 'other', or 'prefer-not-to-say'"
    }),
  nationality: z.string()
    .transform(val => val?.trim())
    .refine(val => !val || (val.length >= 2 && val.length <= 50 && NATIONALITY_REGEX.test(val)), "Nationality must be 2-50 characters and contain only letters, spaces, and hyphens")
    .optional(),
  phoneNumber: z.string()
    .transform(val => val?.replace(/\s/g, ""))
    .refine(val => !val || PHONE_REGEX.test(val), "Please enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
    .optional(),
  email: z.union([
    z.string().email("Invalid email format. Please enter a valid email address like john@example.com").transform(val => val.toLowerCase().trim()),
    z.literal("")
  ]).optional(),
  idNumber: z.string()
    .transform(val => val?.toUpperCase())
    .refine(val => !val || (val.length >= 6 && val.length <= 20 && ID_NUMBER_REGEX.test(val)), "ID/Passport number must be 6-20 characters with letters, numbers, and hyphens only")
    .optional(),
  emergencyContact: z.string()
    .transform(val => val?.trim())
    .refine(val => !val || (val.length >= 2 && val.length <= 100 && NAME_REGEX.test(val)), "Emergency contact name must be 2-100 characters with letters, spaces, periods, apostrophes, and hyphens only")
    .optional(),
  emergencyPhone: z.string()
    .transform(val => val?.replace(/\s/g, ""))
    .refine(val => !val || PHONE_REGEX.test(val), "Please enter a valid emergency phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
    .optional(),
  age: z.string().optional(),
  profilePhotoUrl: z.any().optional(),
  alertSettings: z.string()
    .transform(val => {
      if (!val) return undefined;
      try {
        const parsed = JSON.parse(val);
        const validated = guestAlertSettingsSchema.parse(parsed);
        return JSON.stringify(validated);
      } catch {
        return undefined;
      }
    })
    .optional(),
});

export const checkoutGuestSchema = z.object({
  id: z.string().min(1, "Guest ID is required"),
});

export const bulkGuestImportSchema = z.array(
  insertGuestSchema.extend({
    checkinTime: z.string().optional(),
  })
);

// ─── Guest Self Check-in ─────────────────────────────────────────────

export const guestSelfCheckinSchema = z.object({
  nameAsInDocument: z.string()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name must not exceed 100 characters")
    .regex(NAME_REGEX, "Name can only contain letters, spaces, periods, apostrophes, and hyphens")
    .transform(val => val.trim()),
  phoneNumber: z.string()
    .min(7, "Phone number must be at least 7 digits long")
    .max(50, "Phone number must not exceed 50 characters")
    .regex(PHONE_REGEX_LENIENT, "Please enter a valid phone number (may include +, spaces, dashes, parentheses)")
    .transform(val => val.replace(/\s/g, "")),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
    required_error: "Please select your gender"
  }),
  nationality: z.string()
    .min(2, "Nationality must be at least 2 characters long")
    .max(50, "Nationality must not exceed 50 characters")
    .regex(NATIONALITY_REGEX, "Nationality can only contain letters, spaces, and hyphens")
    .transform(val => val.trim()),
  checkInDate: z.string()
    .regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1);
      maxDate.setHours(0, 0, 0, 0);
      return date >= today && date <= maxDate;
    }, "Check-in date must be between today and 1 year from now"),
  checkOutDate: z.string()
    .min(1, "Check-out date is required")
    .regex(DATE_REGEX, "Check-out date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return false;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1);
      maxDate.setHours(0, 0, 0, 0);
      return date >= today && date <= maxDate;
    }, "Check-out date must be between today and 1 year from now"),
  icNumber: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val)
    .refine((val) => {
      if (val === undefined) return true;
      return IC_RAW_REGEX.test(val);
    }, "IC number must be 12 digits (e.g., 840816015291)")
    .refine(val => {
      if (!val) return true;
      const datePart = val.substring(0, 6);
      const year = parseInt(datePart.substring(0, 2));
      const month = parseInt(datePart.substring(2, 4));
      const day = parseInt(datePart.substring(4, 6));
      const fullYear = year < 30 ? 2000 + year : 1900 + year;
      const date = new Date(fullYear, month - 1, day);
      return date.getFullYear() === fullYear &&
        date.getMonth() === month - 1 &&
        date.getDate() === day &&
        month >= 1 && month <= 12 &&
        day >= 1 && day <= 31;
    }, "Please enter a valid IC number with a valid birth date"),
  passportNumber: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val)
    .refine((val) => {
      if (val === undefined) return true;
      return val.length >= 6;
    }, "Passport number must be at least 6 characters long")
    .refine((val) => {
      if (val === undefined) return true;
      return val.length <= 15;
    }, "Passport number must not exceed 15 characters")
    .refine((val) => {
      if (val === undefined) return true;
      return PASSPORT_REGEX_LENIENT.test(val);
    }, "Passport number can only contain letters and numbers")
    .transform(val => val?.toUpperCase()),
  icDocumentUrl: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val)
    .refine((val) => {
      if (val === undefined) return true;
      try { new URL(val); return true; } catch { return false; }
    }, "IC document must be a valid URL"),
  passportDocumentUrl: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val)
    .refine((val) => {
      if (val === undefined) return true;
      try { new URL(val); return true; } catch { return false; }
    }, "Passport document must be a valid URL"),
  paymentMethod: z.enum(["cash", "bank", "online_platform"], {
    required_error: "Please select a payment method"
  }),
  guestPaymentDescription: z.string()
    .max(200, "Payment description must not exceed 200 characters")
    .optional(),
  emergencyContact: z.string()
    .max(100, "Emergency contact name must not exceed 100 characters")
    .optional(),
  emergencyPhone: z.string()
    .max(20, "Emergency phone must not exceed 20 characters")
    .regex(EMERGENCY_PHONE_REGEX, "Please enter a valid phone number")
    .optional(),
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional(),
}).refine((data) => {
  if (data.nationality === 'Malaysian') {
    return !!data.icNumber && !!data.icDocumentUrl;
  }
  return true;
}, {
  message: "Malaysian guests must provide IC number and upload IC photo.",
  path: ["icNumber"],
}).refine((data) => {
  if (data.nationality !== 'Malaysian') {
    return !!data.passportNumber && !!data.passportDocumentUrl;
  }
  return true;
}, {
  message: "Foreign guests must provide passport number and upload passport photo.",
  path: ["passportNumber"],
}).refine((data) => {
  if (data.nationality === 'Malaysian') {
    return !!data.icDocumentUrl;
  }
  return true;
}, {
  message: "Please upload your IC photo.",
  path: ["icDocumentUrl"],
}).refine((data) => {
  if (data.nationality !== 'Malaysian') {
    return !!data.passportDocumentUrl;
  }
  return true;
}, {
  message: "Please upload your passport photo.",
  path: ["passportDocumentUrl"],
}).refine((data) => {
  if (data.icNumber && !data.icDocumentUrl) {
    return false;
  }
  return true;
}, {
  message: "Please upload a photo of your IC if you provided IC number",
  path: ["icDocumentUrl"],
}).refine((data) => {
  if (data.passportNumber && !data.passportDocumentUrl) {
    return false;
  }
  return true;
}, {
  message: "Please upload a photo of your passport if you provided passport number",
  path: ["passportDocumentUrl"],
}).refine((data) => {
  if (data.nationality === 'Malaysian') {
    return !data.passportNumber && !data.passportDocumentUrl;
  }
  return true;
}, {
  message: "Malaysian guests should provide IC only, not passport",
  path: ["passportNumber"],
}).refine((data) => {
  if (data.paymentMethod === "cash" && !data.guestPaymentDescription?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please describe whom you gave the payment to",
  path: ["guestPaymentDescription"],
}).refine((data) => {
  if (data.checkInDate && data.checkOutDate) {
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);
    return checkOutDate > checkInDate;
  }
  return true;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type UpdateGuest = z.infer<typeof updateGuestSchema>;
export type CheckoutGuest = z.infer<typeof checkoutGuestSchema>;
export type BulkGuestImport = z.infer<typeof bulkGuestImportSchema>;
export type GuestSelfCheckin = z.infer<typeof guestSelfCheckinSchema>;
