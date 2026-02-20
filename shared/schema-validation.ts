/**
 * schema-validation.ts — Thin barrel re-export (backwards compatible)
 *
 * All Zod validation schemas have been split into domain-specific files
 * under shared/validation/. This file re-exports everything so existing
 * imports from 'shared/schema-validation' continue to work unchanged.
 *
 * Domain files:
 *   - validation/common.ts            — Reusable field validators, search/bulk, pagination, utilities
 *   - validation/user-validation.ts   — User registration, login, auth schemas
 *   - validation/guest-validation.ts  — Guest check-in, check-out, self-check-in schemas
 *   - validation/unit-validation.ts    — Unit CRUD, cleaning, problem schemas
 *   - validation/token-validation.ts  — Self-checkin token schemas
 *   - validation/settings-validation.ts — App settings, notification schemas
 *   - validation/expense-validation.ts — Expense tracking schemas
 *   - validation/rainbow-validation.ts — Rainbow AI feedback, intent prediction schemas
 */
export * from './validation/index';
