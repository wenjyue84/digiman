/**
 * token-validation.ts — Self-checkin token schemas
 */
import { z } from "zod";
import {
  PHONE_REGEX_LENIENT,
  NAME_REGEX,
  UNIT_NUMBER_REGEX,
  DATE_REGEX,
} from "../validation-patterns";

// ─── Token Schemas ───────────────────────────────────────────────────

export const createTokenSchema = z.object({
  unitNumber: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, C11, Studio-A)")
    .transform(val => val.toUpperCase())
    .optional(),
  autoAssign: z.boolean().optional(),
  guestName: z.string()
    .min(2, "Guest name must be at least 2 characters long")
    .max(100, "Guest name must not exceed 100 characters")
    .regex(NAME_REGEX, "Guest name can only contain letters, spaces, periods, apostrophes, and hyphens")
    .transform(val => val?.trim())
    .optional(),
  phoneNumber: z.string()
    .regex(PHONE_REGEX_LENIENT, "Please enter a valid phone number (7-50 digits, may include +, spaces, dashes, parentheses)")
    .transform(val => val?.replace(/\s/g, ""))
    .optional(),
  email: z.string()
    .email("Please enter a valid email address")
    .transform(val => val?.toLowerCase().trim())
    .optional(),
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
  expiresInHours: z.number()
    .min(1, "Token must expire in at least 1 hour")
    .max(168, "Token cannot expire later than 168 hours (7 days)")
    .default(24),
  guideOverrideEnabled: z.boolean().optional(),
  guideShowIntro: z.boolean().optional(),
  guideShowAddress: z.boolean().optional(),
  guideShowWifi: z.boolean().optional(),
  guideShowCheckin: z.boolean().optional(),
  guideShowOther: z.boolean().optional(),
  guideShowFaq: z.boolean().optional(),
}).refine((data) => {
  const hasUnitNumber = data.unitNumber && data.unitNumber.length > 0;
  const hasAutoAssign = data.autoAssign === true;
  return (hasUnitNumber && !hasAutoAssign) || (!hasUnitNumber && hasAutoAssign);
}, {
  message: "Either specify a unit number or choose auto assign (but not both)",
  path: ["unitNumber"],
});

export const updateGuestTokenUnitSchema = z.object({
  unitNumber: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, C11, Studio-A)")
    .transform(val => val.toUpperCase())
    .optional(),
  autoAssign: z.boolean().optional(),
}).refine((data) => {
  const hasUnitNumber = data.unitNumber && data.unitNumber.length > 0;
  const hasAutoAssign = data.autoAssign === true;
  return (hasUnitNumber && !hasAutoAssign) || (!hasUnitNumber && hasAutoAssign);
}, {
  message: "Either specify a unit number or choose auto assign (but not both)",
  path: ["unitNumber"],
});

// ─── Backward Compatibility (deprecated) ────────────────────────────

/** @deprecated Use updateGuestTokenUnitSchema */
export const updateGuestTokenCapsuleSchema = updateGuestTokenUnitSchema;

// ─── Schema-derived Types ───────────────────────────────────────────

export type CreateToken = z.infer<typeof createTokenSchema>;
export type UpdateGuestTokenUnit = z.infer<typeof updateGuestTokenUnitSchema>;
/** @deprecated Use UpdateGuestTokenUnit */
export type UpdateGuestTokenCapsule = UpdateGuestTokenUnit;
