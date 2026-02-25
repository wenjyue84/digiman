/**
 * unit-validation.ts — Unit CRUD, cleaning, and problem schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  UNIT_NUMBER_REGEX,
} from "../validation-patterns";
import { units } from "../schema-tables";

// ─── Unit Type Enum ─────────────────────────────────────────────────

export const unitTypeEnum = z.enum(["studio", "1bedroom", "2bedroom", "3bedroom"], {
  required_error: "Unit type must be 'studio', '1bedroom', '2bedroom', or '3bedroom'",
}).optional();

// ─── Unit Schemas ───────────────────────────────────────────────────

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
}).extend({
  number: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, Studio-A, 1BR-1)")
    .transform(val => val.toUpperCase()),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }),
  isAvailable: z.boolean().default(true),
  cleaningStatus: z.enum(["cleaned", "to_be_cleaned"], {
    required_error: "Cleaning status must be 'cleaned' or 'to_be_cleaned'",
  }).default("cleaned"),
  toRent: z.boolean().default(true),
  lastCleanedAt: z.date().optional(),
  lastCleanedBy: z.string().max(50, "Cleaner name must not exceed 50 characters").optional(),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.date().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
  problemDescription: z.string()
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
  unitType: unitTypeEnum,
  maxOccupancy: z.number().int().min(1, "Max occupancy must be at least 1").optional(),
  pricePerNight: z.string().regex(/^\d*\.?\d{0,2}$/, "Price must be a valid decimal number").optional(),
});

export const updateUnitSchema = z.object({
  number: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, Studio-A, 1BR-1)")
    .transform(val => val.toUpperCase())
    .optional(),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }).optional(),
  isAvailable: z.boolean().optional(),
  cleaningStatus: z.enum(["cleaned", "to_be_cleaned"], {
    required_error: "Cleaning status must be 'cleaned' or 'to_be_cleaned'",
  }).optional(),
  toRent: z.boolean().optional(),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.date().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
  problemDescription: z.string()
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
  unitType: unitTypeEnum,
  maxOccupancy: z.number().int().min(1, "Max occupancy must be at least 1").optional(),
  pricePerNight: z.string().regex(/^\d*\.?\d{0,2}$/, "Price must be a valid decimal number").optional(),
});

export const markUnitCleanedSchema = z.object({
  unitNumber: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, C11, Studio-A)"),
  cleanedBy: z.string()
    .min(1, "Cleaner name is required")
    .max(50, "Cleaner name must not exceed 50 characters")
    .transform(val => val.trim()),
});

// ─── Problem Schemas ────────────────────────────────────────────────

export const createUnitProblemSchema = z.object({
  unitNumber: z.string()
    .min(1, "Unit number is required")
    .regex(UNIT_NUMBER_REGEX, "Unit number must be alphanumeric (e.g., C1, Studio-A, 1BR-1)")
    .transform(val => val.toUpperCase()),
  description: z.string()
    .min(10, "Problem description must be at least 10 characters long")
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val.trim()),
  reportedBy: z.string()
    .min(1, "Reporter name is required")
    .max(50, "Reporter name must not exceed 50 characters")
    .transform(val => val.trim()),
});

export const resolveProblemSchema = z.object({
  resolvedBy: z.string()
    .min(1, "Resolver name is required")
    .max(50, "Resolver name must not exceed 50 characters")
    .transform(val => val.trim()),
  notes: z.string()
    .max(500, "Resolution notes must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
});

// ─── Schema-derived Types ───────────────────────────────────────────

export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type CreateUnitProblem = z.infer<typeof createUnitProblemSchema>;
export type ResolveProblem = z.infer<typeof resolveProblemSchema>;
export type MarkUnitCleaned = z.infer<typeof markUnitCleanedSchema>;

// ─── Backward Compatibility (deprecated) ────────────────────────────

/** @deprecated Use insertUnitSchema */
export const insertCapsuleSchema = insertUnitSchema;
/** @deprecated Use updateUnitSchema */
export const updateCapsuleSchema = updateUnitSchema;
/** @deprecated Use markUnitCleanedSchema */
export const markCapsuleCleanedSchema = markUnitCleanedSchema;
/** @deprecated Use createUnitProblemSchema */
export const createCapsuleProblemSchema = createUnitProblemSchema;

/** @deprecated Use InsertUnit */
export type InsertCapsule = InsertUnit;
/** @deprecated Use CreateUnitProblem */
export type CreateCapsuleProblem = CreateUnitProblem;
/** @deprecated Use MarkUnitCleaned */
export type MarkCapsuleCleaned = MarkUnitCleaned;
