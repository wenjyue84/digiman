/**
 * schema-validation.ts — Zod validation schemas (Single Responsibility: input validation)
 *
 * Contains ALL Zod validation schemas, reusable validators, and validation utilities.
 * Table definitions live in schema-tables.ts.
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, guests, capsules, adminNotifications, pushSubscriptions, expenses, rainbowFeedback, intentPredictions, } from "./schema-tables.js";
// ─── User Schemas ────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    email: z.string()
        .email("Please enter a valid email address (e.g., john@example.com)")
        .min(5, "Email is too short. Please enter at least 5 characters including @ and domain")
        .max(254, "Email is too long. Please use a shorter email address (maximum 254 characters)")
        .toLowerCase()
        .transform(val => val.trim()),
    username: z.string()
        .min(3, "Username too short. Please enter at least 3 characters")
        .max(30, "Username too long. Please use 30 characters or fewer")
        .regex(/^[a-zA-Z0-9_-]+$/, "Username can only use letters, numbers, dashes (-), and underscores (_). No spaces or special characters allowed")
        .transform(val => val.trim())
        .optional(),
    password: z.string()
        .min(8, "Password too short. Please create a password with at least 8 characters")
        .max(128, "Password too long. Please use 128 characters or fewer")
        .regex(/^(?=.*[a-z])/, "Password missing lowercase letter. Please add at least one lowercase letter (a-z)")
        .regex(/^(?=.*[A-Z])/, "Password missing uppercase letter. Please add at least one uppercase letter (A-Z)")
        .regex(/^(?=.*\d)/, "Password missing number. Please add at least one number (0-9)")
        .optional(),
    googleId: z.string().optional(),
    firstName: z.string()
        .min(1, "First name is required")
        .max(50, "First name must not exceed 50 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, apostrophes, and hyphens")
        .transform(val => val.trim())
        .optional(),
    lastName: z.string()
        .min(1, "Last name is required")
        .max(50, "Last name must not exceed 50 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, apostrophes, and hyphens")
        .transform(val => val.trim())
        .optional(),
    profileImage: z.string().url("Profile image must be a valid URL").optional(),
    role: z.enum(["admin", "staff"], {
        required_error: "Role must be either 'admin' or 'staff'",
    }).default("staff"),
});
export const updateUserSchema = insertUserSchema.partial().extend({
    id: z.string().min(1, "User ID is required"),
});
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
        .regex(/^[a-zA-Z0-9\s.'-]+$/, "Guest name can only contain letters, numbers, spaces, periods (.), apostrophes ('), and hyphens (-). Special symbols are not allowed")
        .transform(val => val.trim()),
    capsuleNumber: z.string()
        .min(1, "Please select a capsule for the guest")
        .regex(/^C\d+$/, "Invalid capsule format. Please use format like C1, C2, or C24 (C followed by numbers)"),
    paymentAmount: z.string()
        .regex(/^\d*\.?\d{0,2}$/, "Invalid amount format. Please enter numbers only (e.g., 50.00 or 150)")
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
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected checkout date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
        const date = new Date(val);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + 1);
        return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
        .optional(),
    checkInDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
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
        .refine(val => !val || (val.length >= 2 && val.length <= 50 && /^[a-zA-Z\s-]+$/.test(val)), "Nationality must be 2-50 characters and contain only letters, spaces, and hyphens")
        .optional(),
    phoneNumber: z.string()
        .transform(val => val?.replace(/\s/g, ""))
        .refine(val => !val || /^[+]?[\d\s\-\(\)]{7,50}$/.test(val), "Please enter a valid phone number (7-50 digits, may include +, spaces, dashes, parentheses)")
        .optional(),
    email: z.union([
        z.string().email("Invalid email format. Please enter a valid email address like john@example.com").transform(val => val.toLowerCase().trim()),
        z.literal("")
    ]).optional(),
    idNumber: z.string()
        .transform(val => val?.toUpperCase())
        .refine(val => !val || (val.length >= 6 && val.length <= 20 && /^[A-Z0-9\-]+$/i.test(val)), "ID/Passport number must be 6-20 characters with letters, numbers, and hyphens only")
        .optional(),
    emergencyContact: z.string()
        .transform(val => val?.trim())
        .refine(val => !val || (val.length >= 2 && val.length <= 100 && /^[a-zA-Z\s.'-]+$/.test(val)), "Emergency contact name must be 2-100 characters with letters, spaces, periods, apostrophes, and hyphens only")
        .optional(),
    emergencyPhone: z.string()
        .transform(val => val?.replace(/\s/g, ""))
        .refine(val => !val || /^[+]?[\d\s\-\(\)]{7,20}$/.test(val), "Please enter a valid emergency phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
        .optional(),
    age: z.string().optional(),
    profilePhotoUrl: z.any().optional(),
});
export const updateGuestSchema = z.object({
    name: z.string()
        .min(2, "Please enter the guest's full name (at least 2 characters)")
        .max(100, "Guest name too long. Please use 100 characters or fewer")
        .regex(/^[a-zA-Z0-9\s.'-]+$/, "Guest name can only contain letters, numbers, spaces, periods (.), apostrophes ('), and hyphens (-). Special symbols are not allowed")
        .transform(val => val.trim())
        .optional(),
    capsuleNumber: z.string()
        .min(1, "Please select a capsule for the guest")
        .regex(/^C\d+$/, "Invalid capsule format. Please use format like C1, C2, or C24 (C followed by numbers)")
        .optional(),
    paymentAmount: z.string()
        .regex(/^\d*\.?\d{0,2}$/, "Invalid amount format. Please enter numbers only (e.g., 50.00 or 150)")
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
        if (val === "" || val === null)
            return null;
        return val;
    })
        .optional()
        .refine(val => val === null || val === undefined || ["vip", "blacklisted"].includes(val), {
        message: "Status must be either 'vip' or 'blacklisted'"
    }),
    expectedCheckoutDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected checkout date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
        const date = new Date(val);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + 1);
        return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
        .optional(),
    checkInDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
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
        .refine(val => !val || (val.length >= 2 && val.length <= 50 && /^[a-zA-Z\s-]+$/.test(val)), "Nationality must be 2-50 characters and contain only letters, spaces, and hyphens")
        .optional(),
    phoneNumber: z.string()
        .transform(val => val?.replace(/\s/g, ""))
        .refine(val => !val || /^[+]?[\d\s\-\(\)]{7,20}$/.test(val), "Please enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
        .optional(),
    email: z.union([
        z.string().email("Invalid email format. Please enter a valid email address like john@example.com").transform(val => val.toLowerCase().trim()),
        z.literal("")
    ]).optional(),
    idNumber: z.string()
        .transform(val => val?.toUpperCase())
        .refine(val => !val || (val.length >= 6 && val.length <= 20 && /^[A-Z0-9\-]+$/i.test(val)), "ID/Passport number must be 6-20 characters with letters, numbers, and hyphens only")
        .optional(),
    emergencyContact: z.string()
        .transform(val => val?.trim())
        .refine(val => !val || (val.length >= 2 && val.length <= 100 && /^[a-zA-Z\s.'-]+$/.test(val)), "Emergency contact name must be 2-100 characters with letters, spaces, periods, apostrophes, and hyphens only")
        .optional(),
    emergencyPhone: z.string()
        .transform(val => val?.replace(/\s/g, ""))
        .refine(val => !val || /^[+]?[\d\s\-\(\)]{7,20}$/.test(val), "Please enter a valid emergency phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
        .optional(),
    age: z.string().optional(),
    profilePhotoUrl: z.any().optional(),
    alertSettings: z.string()
        .transform(val => {
        if (!val)
            return undefined;
        try {
            const parsed = JSON.parse(val);
            const validated = guestAlertSettingsSchema.parse(parsed);
            return JSON.stringify(validated);
        }
        catch {
            return undefined;
        }
    })
        .optional(),
});
export const checkoutGuestSchema = z.object({
    id: z.string().min(1, "Guest ID is required"),
});
export const bulkGuestImportSchema = z.array(insertGuestSchema.extend({
    checkinTime: z.string().optional(),
}));
// ─── Capsule Schemas ─────────────────────────────────────────────────
export const insertCapsuleSchema = createInsertSchema(capsules).omit({
    id: true,
}).extend({
    number: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C2, C24")
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
});
export const updateCapsuleSchema = z.object({
    number: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C2, C24")
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
});
export const markCapsuleCleanedSchema = z.object({
    capsuleNumber: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C11, C25"),
    cleanedBy: z.string()
        .min(1, "Cleaner name is required")
        .max(50, "Cleaner name must not exceed 50 characters")
        .transform(val => val.trim()),
});
// ─── Auth Schemas ────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z.string()
        .min(1, "Username or email is required")
        .max(254, "Username or email must not exceed 254 characters")
        .transform(val => val.trim().toLowerCase()),
    password: z.string()
        .min(1, "Password is required")
        .max(128, "Password must not exceed 128 characters"),
});
export const googleAuthSchema = z.object({
    token: z.string().min(1, "Google token is required"),
});
// ─── Problem Schemas ─────────────────────────────────────────────────
export const createCapsuleProblemSchema = z.object({
    capsuleNumber: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C2, C24")
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
// ─── Guest Self Check-in ─────────────────────────────────────────────
export const guestSelfCheckinSchema = z.object({
    nameAsInDocument: z.string()
        .min(2, "Full name must be at least 2 characters long")
        .max(100, "Full name must not exceed 100 characters")
        .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, periods, apostrophes, and hyphens")
        .transform(val => val.trim()),
    phoneNumber: z.string()
        .min(7, "Phone number must be at least 7 digits long")
        .max(50, "Phone number must not exceed 50 characters")
        .regex(/^[+]?[\d\s\-\(\)]+$/, "Please enter a valid phone number (may include +, spaces, dashes, parentheses)")
        .transform(val => val.replace(/\s/g, "")),
    gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
        required_error: "Please select your gender"
    }),
    nationality: z.string()
        .min(2, "Nationality must be at least 2 characters long")
        .max(50, "Nationality must not exceed 50 characters")
        .regex(/^[a-zA-Z\s-]+$/, "Nationality can only contain letters, spaces, and hyphens")
        .transform(val => val.trim()),
    checkInDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
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
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return false;
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
        if (val === undefined)
            return true;
        return /^\d{12}$/.test(val);
    }, "IC number must be 12 digits (e.g., 840816015291)")
        .refine(val => {
        if (!val)
            return true;
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
        if (val === undefined)
            return true;
        return val.length >= 6;
    }, "Passport number must be at least 6 characters long")
        .refine((val) => {
        if (val === undefined)
            return true;
        return val.length <= 15;
    }, "Passport number must not exceed 15 characters")
        .refine((val) => {
        if (val === undefined)
            return true;
        return /^[A-Za-z0-9]+$/.test(val);
    }, "Passport number can only contain letters and numbers")
        .transform(val => val?.toUpperCase()),
    icDocumentUrl: z.string()
        .optional()
        .transform(val => val === "" ? undefined : val)
        .refine((val) => {
        if (val === undefined)
            return true;
        try {
            new URL(val);
            return true;
        }
        catch {
            return false;
        }
    }, "IC document must be a valid URL"),
    passportDocumentUrl: z.string()
        .optional()
        .transform(val => val === "" ? undefined : val)
        .refine((val) => {
        if (val === undefined)
            return true;
        try {
            new URL(val);
            return true;
        }
        catch {
            return false;
        }
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
        .regex(/^[+]?[\d\s\-\(\)]*$/, "Please enter a valid phone number")
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
// ─── Token Schemas ───────────────────────────────────────────────────
export const createTokenSchema = z.object({
    capsuleNumber: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C11, C25")
        .transform(val => val.toUpperCase())
        .optional(),
    autoAssign: z.boolean().optional(),
    guestName: z.string()
        .min(2, "Guest name must be at least 2 characters long")
        .max(100, "Guest name must not exceed 100 characters")
        .regex(/^[a-zA-Z\s.'-]+$/, "Guest name can only contain letters, spaces, periods, apostrophes, and hyphens")
        .transform(val => val?.trim())
        .optional(),
    phoneNumber: z.string()
        .regex(/^[+]?[\d\s\-\(\)]{7,50}$/, "Please enter a valid phone number (7-50 digits, may include +, spaces, dashes, parentheses)")
        .transform(val => val?.replace(/\s/g, ""))
        .optional(),
    email: z.string()
        .email("Please enter a valid email address")
        .transform(val => val?.toLowerCase().trim())
        .optional(),
    expectedCheckoutDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected checkout date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
        const date = new Date(val);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + 1);
        return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
        .optional(),
    checkInDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format")
        .refine(val => {
        if (!val)
            return true;
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
    const hasCapsuleNumber = data.capsuleNumber && data.capsuleNumber.length > 0;
    const hasAutoAssign = data.autoAssign === true;
    return (hasCapsuleNumber && !hasAutoAssign) || (!hasCapsuleNumber && hasAutoAssign);
}, {
    message: "Either specify a capsule number or choose auto assign (but not both)",
    path: ["capsuleNumber"],
});
export const updateGuestTokenCapsuleSchema = z.object({
    capsuleNumber: z.string()
        .min(1, "Capsule number is required")
        .regex(/^C\d+$/, "Capsule number must be in format like C1, C11, C25")
        .transform(val => val.toUpperCase())
        .optional(),
    autoAssign: z.boolean().optional(),
}).refine((data) => {
    const hasCapsuleNumber = data.capsuleNumber && data.capsuleNumber.length > 0;
    const hasAutoAssign = data.autoAssign === true;
    return (hasCapsuleNumber && !hasAutoAssign) || (!hasCapsuleNumber && hasAutoAssign);
}, {
    message: "Either specify a capsule number or choose auto assign (but not both)",
    path: ["capsuleNumber"],
});
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
        .refine((val) => { if (val === undefined)
        return true; try {
        new URL(val);
        return true;
    }
    catch {
        return false;
    } }, "Hostel photos URL must be a valid URL"),
    guideGoogleMapsUrl: z.string().optional()
        .transform((v) => { const t = (v ?? '').trim(); return t === '' ? undefined : t; })
        .refine((val) => { if (val === undefined)
        return true; try {
        new URL(val);
        return true;
    }
    catch {
        return false;
    } }, "Google Maps URL must be a valid URL"),
    guideCheckinVideoUrl: z.string().optional()
        .transform((v) => { const t = (v ?? '').trim(); return t === '' ? undefined : t; })
        .refine((val) => { if (val === undefined)
        return true; try {
        new URL(val);
        return true;
    }
    catch {
        return false;
    } }, "Check-in video URL must be a valid URL"),
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
    guideShowCapsuleIssues: z.boolean().default(true),
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
    totalCapsules: z.number()
        .min(1, "Total capsules must be at least 1")
        .max(100, "Total capsules cannot exceed 100")
        .int("Total capsules must be a whole number")
        .default(24),
    capsuleSections: z.array(z.string())
        .min(1, "At least one capsule section is required")
        .default(["front", "middle", "back"]),
    capsuleNumberFormat: z.string()
        .regex(/^[A-Z]\d+$/, "Capsule format must be like A01, B02, etc.")
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
    showAllCapsules: z.boolean()
        .default(false)
        .describe("Show all capsules (including empty ones) in the dashboard by default"),
    defaultAdminEmail: z.string()
        .email("Default admin email must be a valid email address")
        .default("admin@pelangicapsule.com"),
    supportEmail: z.string()
        .email("Support email must be a valid email address")
        .default("support@pelangicapsule.com"),
    supportPhone: z.string()
        .regex(/^[+]?[\d\s\-\(\)]{7,20}$/, "Support phone must be a valid phone number")
        .default("+60123456789"),
    hostelName: z.string()
        .min(1, "Hostel name is required")
        .max(100, "Hostel name cannot exceed 100 characters")
        .default("Pelangi Capsule Hostel"),
    timezone: z.string()
        .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, "Timezone must be in format like Asia/Kuala_Lumpur")
        .default("Asia/Kuala_Lumpur"),
});
// ─── Reusable Field Validators ───────────────────────────────────────
export const phoneNumberSchema = z.string()
    .regex(/^[+]?[\d\s\-\(\)]{7,20}$/, "Please enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
    .transform(val => val.replace(/\s/g, ""));
export const emailSchema = z.string()
    .email("Please enter a valid email address")
    .min(5, "Email must be at least 5 characters long")
    .max(254, "Email must not exceed 254 characters")
    .toLowerCase()
    .transform(val => val.trim());
export const capsuleNumberSchema = z.string()
    .min(1, "Capsule number is required")
    .regex(/^C\d+$/, "Capsule number must be in format like C1, C2, C24")
    .transform(val => val.toUpperCase());
export const nameSchema = z.string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must not exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, periods, apostrophes, and hyphens")
    .transform(val => val.trim());
export const passwordStrengthSchema = z.string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password must not exceed 128 characters")
    .regex(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/^(?=.*\d)/, "Password must contain at least one number")
    .regex(/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, "Password must contain at least one special character");
export const malaysianICSchema = z.string()
    .regex(/^\d{6}-\d{2}-\d{4}$/, "IC number must be in format XXXXXX-XX-XXXX")
    .refine(val => {
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
}, "Please enter a valid IC number with a valid birth date");
export const passportNumberSchema = z.string()
    .min(6, "Passport number must be at least 6 characters long")
    .max(15, "Passport number must not exceed 15 characters")
    .regex(/^[A-Z0-9]+$/, "Passport number can only contain uppercase letters and numbers")
    .transform(val => val.toUpperCase());
export const ageSchema = z.string()
    .regex(/^\d{1,3}$/, "Age must be a number")
    .refine(val => {
    const age = parseInt(val);
    return age >= 0 && age <= 120;
}, "Age must be between 0 and 120");
export const checkoutDateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine(val => {
    const date = new Date(val);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1);
    return date >= today && date <= maxDate;
}, "Date must be between today and 1 year from now");
export const paymentAmountSchema = z.string()
    .regex(/^\d*\.?\d{0,2}$/, "Payment amount must be a valid monetary value")
    .refine(val => {
    const num = parseFloat(val || "0");
    return !isNaN(num) && num >= 0 && num <= 9999.99;
}, "Payment amount must be between 0 and 9999.99");
// ─── Bulk & Search Schemas ───────────────────────────────────────────
export const bulkActionSchema = z.object({
    ids: z.array(z.string().min(1, "ID cannot be empty")).min(1, "At least one item must be selected"),
    action: z.enum(["delete", "archive", "activate", "deactivate"], {
        required_error: "Action is required"
    }),
});
export const searchQuerySchema = z.object({
    query: z.string().max(100, "Search query must not exceed 100 characters").optional(),
    status: z.enum(["active", "inactive", "all"]).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    capsuleNumber: capsuleNumberSchema.optional(),
}).refine((data) => {
    if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
}, {
    message: "From date must be before or equal to To date",
    path: ["dateFrom"]
});
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
        .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number with up to 2 decimal places")
        .refine(val => {
        const num = parseFloat(val);
        return num >= 0 && num <= 99999.99;
    }, "Amount must be between 0 and 99,999.99"),
    category: z.enum(["salary", "utilities", "consumables", "maintenance", "equipment", "marketing", "operations", "other"], {
        required_error: "Category is required"
    }),
    subcategory: z.string()
        .max(100, "Subcategory must not exceed 100 characters")
        .optional(),
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
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
// ─── Rainbow AI Schemas ──────────────────────────────────────────────
export const insertRainbowFeedbackSchema = createInsertSchema(rainbowFeedback).omit({
    id: true,
    createdAt: true,
}).extend({
    conversationId: z.string().min(1, "Conversation ID is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    rating: z.number().refine(val => val === 1 || val === -1, "Rating must be 1 (thumbs up) or -1 (thumbs down)"),
    feedbackText: z.string().max(500, "Feedback text must not exceed 500 characters").optional(),
});
export const updateFeedbackSettingsSchema = z.object({
    enabled: z.boolean().default(true),
    frequency_minutes: z.number()
        .int("Frequency must be a whole number")
        .min(1, "Frequency must be at least 1 minute")
        .max(1440, "Frequency cannot exceed 24 hours (1440 minutes)")
        .default(30),
    timeout_minutes: z.number()
        .int("Timeout must be a whole number")
        .min(1, "Timeout must be at least 1 minute")
        .max(10, "Timeout cannot exceed 10 minutes")
        .default(2),
    skip_intents: z.array(z.string().min(1))
        .min(0, "Skip intents array is required")
        .max(50, "Too many skip intents")
        .default(["greeting", "thanks", "acknowledgment", "escalate", "contact_staff", "unknown", "general"]),
    prompts: z.object({
        en: z.string().min(5).max(100).default("Was this helpful? 👍 👎"),
        ms: z.string().min(5).max(100).default("Adakah ini membantu? 👍 👎"),
        zh: z.string().min(5).max(100).default("这个回答有帮助吗？👍 👎")
    })
});
export const insertIntentPredictionSchema = createInsertSchema(intentPredictions).omit({
    id: true,
    createdAt: true,
}).extend({
    conversationId: z.string().min(1),
    phoneNumber: z.string().min(1),
    messageText: z.string().min(1),
    predictedIntent: z.string().min(1),
    confidence: z.number().min(0).max(1),
    tier: z.string().min(1),
});
// ─── Validation Utilities ────────────────────────────────────────────
export const validationUtils = {
    isValidEmail: (email) => {
        try {
            emailSchema.parse(email);
            return true;
        }
        catch {
            return false;
        }
    },
    isValidPhone: (phone) => {
        try {
            phoneNumberSchema.parse(phone);
            return true;
        }
        catch {
            return false;
        }
    },
    isValidCapsuleNumber: (capsuleNumber) => {
        try {
            capsuleNumberSchema.parse(capsuleNumber);
            return true;
        }
        catch {
            return false;
        }
    },
    isValidMalaysianIC: (ic) => {
        try {
            malaysianICSchema.parse(ic);
            return true;
        }
        catch {
            return false;
        }
    },
    isValidPassportNumber: (passport) => {
        try {
            passportNumberSchema.parse(passport);
            return true;
        }
        catch {
            return false;
        }
    },
    formatPhoneNumber: (phone) => {
        return phone.replace(/\s/g, "");
    },
    formatName: (name) => {
        return name.trim().replace(/\s+/g, " ");
    },
    sanitizeString: (str) => {
        return str.trim().replace(/[<>"'&]/g, "");
    }
};
