/**
 * validation-patterns.ts — Shared regex constants for validation
 *
 * Single source of truth for all regex patterns used across client and server.
 * Import these constants instead of defining inline regex patterns.
 *
 * When two modules had slightly different patterns, the STRICTER version was chosen.
 */

// ─── Email ──────────────────────────────────────────────────────────
/** Simple email format check: non-whitespace @ non-whitespace . non-whitespace */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Phone ──────────────────────────────────────────────────────────
/** Phone: optional +, digits/spaces/dashes/parens, 7-20 chars (strict) */
export const PHONE_REGEX = /^[+]?[\d\s\-\(\)]{7,20}$/;
/** Phone: optional +, digits/spaces/dashes/parens, 7-50 chars (lenient, for international) */
export const PHONE_REGEX_LENIENT = /^[+]?[\d\s\-\(\)]{7,50}$/;

// ─── Names ──────────────────────────────────────────────────────────
/** Name: letters, spaces, periods, apostrophes, hyphens only */
export const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;
/** Guest name: letters, digits, spaces, periods, apostrophes, hyphens */
export const GUEST_NAME_REGEX = /^[a-zA-Z0-9\s.'-]+$/;
/** Username: alphanumeric plus dash and underscore */
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

// ─── Identity Documents ─────────────────────────────────────────────
/** Malaysian IC formatted: XXXXXX-XX-XXXX */
export const IC_FORMATTED_REGEX = /^\d{6}-\d{2}-\d{4}$/;
/** Malaysian IC raw 12 digits (used in self-check-in) */
export const IC_RAW_REGEX = /^\d{12}$/;
/** Passport: uppercase letters and digits only (use after toUpperCase transform) */
export const PASSPORT_REGEX = /^[A-Z0-9]+$/;
/** Passport: letters and digits, case-insensitive (use before toUpperCase transform) */
export const PASSPORT_REGEX_LENIENT = /^[A-Za-z0-9]+$/;
/** ID/Passport general: letters, digits, hyphens (case-insensitive) */
export const ID_NUMBER_REGEX = /^[A-Z0-9\-]+$/i;

// ─── Unit / Accommodation ───────────────────────────────────────────
/** Unit number: alphanumeric with optional hyphens (e.g., C1, C24, Studio-A, 1BR-1) */
export const UNIT_NUMBER_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-]*$/;
/** Unit number format for settings: letter + digits (e.g., A01, B02) */
export const UNIT_FORMAT_REGEX = /^[A-Z][A-Za-z0-9\-]*$/;

/** @deprecated Use UNIT_NUMBER_REGEX */
export const CAPSULE_NUMBER_REGEX = UNIT_NUMBER_REGEX;
/** @deprecated Use UNIT_FORMAT_REGEX */
export const CAPSULE_FORMAT_REGEX = UNIT_FORMAT_REGEX;

// ─── Payment ────────────────────────────────────────────────────────
/** Payment amount: digits with optional decimal up to 2 places */
export const PAYMENT_AMOUNT_REGEX = /^\d*\.?\d{0,2}$/;
/** Expense amount: digits with required decimal up to 2 places */
export const EXPENSE_AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

// ─── Dates ──────────────────────────────────────────────────────────
/** Date in YYYY-MM-DD format */
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Password ───────────────────────────────────────────────────────
/** Password must contain at least one lowercase letter */
export const PASSWORD_LOWERCASE_REGEX = /^(?=.*[a-z])/;
/** Password must contain at least one uppercase letter */
export const PASSWORD_UPPERCASE_REGEX = /^(?=.*[A-Z])/;
/** Password must contain at least one digit */
export const PASSWORD_DIGIT_REGEX = /^(?=.*\d)/;
/** Password special character: at least one of !@#$%^&*()_+-=[]{};':"\|,.<>/? */
export const PASSWORD_SPECIAL_REGEX = /^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
/** Password special character test (non-lookahead version for client-side checking) */
export const SPECIAL_CHAR_TEST_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// ─── Misc ───────────────────────────────────────────────────────────
/** Age: 1-3 digit number */
export const AGE_REGEX = /^\d{1,3}$/;
/** Nationality: letters, spaces, hyphens */
export const NATIONALITY_REGEX = /^[a-zA-Z\s-]+$/;
/** Timezone format: Region/City (e.g., Asia/Kuala_Lumpur) */
export const TIMEZONE_REGEX = /^[A-Za-z_]+\/[A-Za-z_]+$/;
/** Emergency phone: optional +, digits/spaces/dashes/parens (allows empty) */
export const EMERGENCY_PHONE_REGEX = /^[+]?[\d\s\-\(\)]*$/;
