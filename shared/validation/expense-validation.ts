/**
 * expense-validation.ts — Expense tracking schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  EXPENSE_AMOUNT_REGEX,
  DATE_REGEX,
} from "../validation-patterns";
import { expenses } from "../schema-tables";

// ─── Expense Schemas ─────────────────────────────────────────────────

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  description: z.string()
    .min(1, "Description is required")
    .max(200, "Description must not exceed 200 characters")
    .transform(val => val.trim()),
  amount: z.coerce.string()
    .regex(EXPENSE_AMOUNT_REGEX, "Amount must be a valid number with up to 2 decimal places")
    .refine(val => {
      const num = parseFloat(val);
      return num > 0 && num <= 99999.99;
    }, "Amount must be a positive number between 0.01 and 99,999.99"),
  category: z.enum(["salary", "utilities", "consumables", "maintenance", "equipment", "marketing", "operations", "other"], {
    required_error: "Category is required"
  }),
  subcategory: z.string()
    .max(100, "Subcategory must not exceed 100 characters")
    .optional(),
  date: z.string()
    .regex(DATE_REGEX, "Date must be in YYYY-MM-DD format")
    .refine(val => {
      const date = new Date(val);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return date >= oneYearAgo && date <= today;
    }, "Date must be within the last year"),
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional(),
  receiptPhotoUrl: z.string()
    .url("Receipt photo must be a valid URL")
    .optional(),
  itemPhotoUrl: z.string()
    .url("Item photo must be a valid URL")
    .optional(),
});

export const updateExpenseSchema = insertExpenseSchema.partial().extend({
  id: z.string().min(1, "Expense ID is required"),
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
