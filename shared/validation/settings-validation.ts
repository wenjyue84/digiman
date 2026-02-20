/**
 * settings-validation.ts — App settings and notification settings schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  PHONE_REGEX,
  UNIT_FORMAT_REGEX,
  TIMEZONE_REGEX,
} from "../validation-patterns";
import { adminNotifications, pushSubscriptions } from "../schema-tables";

// ─── Notification Schemas ────────────────────────────────────────────

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({
  id: true,
  createdAt: true
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

// ─── Settings Schema ─────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  sessionExpirationHours: z.number()
    .min(1, "Session expiration must be at least 1 hour")
    .max(168, "Session expiration cannot exceed 168 hours (7 days)")
    .int("Session expiration must be a whole number of hours")
    .default(24),
  accommodationType: z.enum(["capsule", "room", "house"], {
    required_error: "Accommodation type must be capsule, room, or house",
  }).default("capsule"),
  defaultUserRole: z.enum(["admin", "staff"], {
    required_error: "Default user role must be either 'admin' or 'staff'",
  }).default("staff"),
  maxGuestStayDays: z.number()
    .min(1, "Maximum stay must be at least 1 day")
    .max(365, "Maximum stay cannot exceed 365 days")
    .int("Maximum stay must be a whole number of days")
    .default(30),
  guideIntro: z.string().max(5000, "Introduction is too long").optional().transform((v) => (v ?? '').trim()),
  guideAddress: z.string().max(1000, "Address is too long").optional().transform((v) => (v ?? '').trim()),
  guideWifiName: z.string().max(200, "WiFi name too long").optional().transform((v) => (v ?? '').trim()),
  guideWifiPassword: z.string().max(200, "WiFi password too long").optional().transform((v) => (v ?? '').trim()),
  guideCheckin: z.string().max(5000, "Check-in guidance too long").optional().transform((v) => (v ?? '').trim()),
  guideOther: z.string().max(5000, "Other guidance too long").optional().transform((v) => (v ?? '').trim()),
  guideFaq: z.string().max(8000, "FAQ too long").optional().transform((v) => (v ?? '').trim()),
  guideImportantReminders: z.string().max(2000, "Important reminders too long").optional().transform((v) => (v ?? '').trim()),
  guideHostelPhotosUrl: z.string().optional()
    .transform((v) => { const t = (v ?? '').trim(); return t === '' ? undefined : t; })
    .refine((val) => { if (val === undefined) return true; try { new URL(val); return true; } catch { return false; } }, "Hostel photos URL must be a valid URL"),
  guideGoogleMapsUrl: z.string().optional()
    .transform((v) => { const t = (v ?? '').trim(); return t === '' ? undefined : t; })
    .refine((val) => { if (val === undefined) return true; try { new URL(val); return true; } catch { return false; } }, "Google Maps URL must be a valid URL"),
  guideCheckinVideoUrl: z.string().optional()
    .transform((v) => { const t = (v ?? '').trim(); return t === '' ? undefined : t; })
    .refine((val) => { if (val === undefined) return true; try { new URL(val); return true; } catch { return false; } }, "Check-in video URL must be a valid URL"),
  guideCheckinTime: z.string().max(100, "Check-in time description too long").optional().transform((v) => (v ?? 'From 3:00 PM').trim()),
  guideCheckoutTime: z.string().max(100, "Check-out time description too long").optional().transform((v) => (v ?? 'Before 12:00 PM').trim()),
  guideDoorPassword: z.string().max(50, "Door password too long").optional().transform((v) => (v ?? '1270#').trim()),
  guideCustomStyles: z.string().max(10000, "Custom styles too long").optional().transform((v) => (v ?? '').trim()),
  guideShowIntro: z.boolean().default(true),
  guideShowAddress: z.boolean().default(true),
  guideShowWifi: z.boolean().default(true),
  guideShowCheckin: z.boolean().default(true),
  guideShowOther: z.boolean().default(true),
  guideShowFaq: z.boolean().default(true),
  guideShowUnitIssues: z.boolean().default(true),
  guideShowSelfCheckinMessage: z.boolean().default(true),
  guideShowHostelPhotos: z.boolean().default(true),
  guideShowGoogleMaps: z.boolean().default(true),
  guideShowCheckinVideo: z.boolean().default(true),
  guideShowTimeAccess: z.boolean().default(true),
  defaultPaymentMethod: z.enum(["cash", "tng", "bank", "platform"], {
    required_error: "Default payment method is required"
  }).default("cash"),
  maxPaymentAmount: z.number()
    .min(0, "Maximum payment amount must be positive")
    .max(99999.99, "Maximum payment amount cannot exceed RM 99,999.99")
    .default(9999.99),
  totalUnits: z.number()
    .min(1, "Total units must be at least 1")
    .max(100, "Total units cannot exceed 100")
    .int("Total units must be a whole number")
    .default(24),
  unitSections: z.array(z.string())
    .min(1, "At least one unit section is required")
    .default(["front", "middle", "back"]),
  unitNumberFormat: z.string()
    .regex(UNIT_FORMAT_REGEX, "Unit format must be like A01, B02, Studio-A, etc.")
    .default("A01"),
  notificationRetentionDays: z.number()
    .min(1, "Notification retention must be at least 1 day")
    .max(365, "Notification retention cannot exceed 365 days")
    .int("Notification retention must be a whole number of days")
    .default(30),
  cacheTimeMinutes: z.number()
    .min(1, "Cache time must be at least 1 minute")
    .max(60, "Cache time cannot exceed 60 minutes")
    .int("Cache time must be a whole number of minutes")
    .default(5),
  queryRefreshIntervalSeconds: z.number()
    .min(5, "Refresh interval must be at least 5 seconds")
    .max(300, "Refresh interval cannot exceed 300 seconds (5 minutes)")
    .int("Refresh interval must be a whole number of seconds")
    .default(30),
  defaultPageSize: z.number()
    .min(10, "Page size must be at least 10")
    .max(100, "Page size cannot exceed 100")
    .int("Page size must be a whole number")
    .default(20),
  maxPageSize: z.number()
    .min(50, "Maximum page size must be at least 50")
    .max(500, "Maximum page size cannot exceed 500")
    .int("Maximum page size must be a whole number")
    .default(100),
  minGuestAge: z.number()
    .min(16, "Minimum age must be at least 16")
    .max(21, "Minimum age cannot exceed 21")
    .int("Minimum age must be a whole number")
    .default(16),
  maxGuestAge: z.number()
    .min(60, "Maximum age must be at least 60")
    .max(120, "Maximum age cannot exceed 120")
    .int("Maximum age must be a whole number")
    .default(120),
  showAllUnits: z.boolean()
    .default(false)
    .describe("Show all units (including empty ones) in the dashboard by default"),
  defaultAdminEmail: z.string()
    .email("Default admin email must be a valid email address")
    .default("admin@pelangicapsule.com"),
  supportEmail: z.string()
    .email("Support email must be a valid email address")
    .default("support@pelangicapsule.com"),
  supportPhone: z.string()
    .regex(PHONE_REGEX, "Support phone must be a valid phone number")
    .default("+60123456789"),
  hostelName: z.string()
    .min(1, "Hostel name is required")
    .max(100, "Hostel name cannot exceed 100 characters")
    .default("Pelangi Capsule Hostel"),
  timezone: z.string()
    .regex(TIMEZONE_REGEX, "Timezone must be in format like Asia/Kuala_Lumpur")
    .default("Asia/Kuala_Lumpur"),
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
