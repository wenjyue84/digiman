import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username"),
  password: text("password"), // nullable for OAuth users
  googleId: text("google_id").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImage: text("profile_image"),
  role: text("role").notNull().default("staff"), // 'admin' or 'staff'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ([
  index("idx_users_email").on(table.email),
  index("idx_users_username").on(table.username),
  index("idx_users_role").on(table.role),
]));

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_token").on(table.token),
  index("idx_sessions_expires_at").on(table.expiresAt),
]));

export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  capsuleNumber: text("capsule_number").notNull(),
  checkinTime: timestamp("checkin_time").notNull().defaultNow(),
  checkoutTime: timestamp("checkout_time"),
  expectedCheckoutDate: date("expected_checkout_date"),
  isCheckedIn: boolean("is_checked_in").notNull().default(true),
  paymentAmount: text("payment_amount"),
  paymentMethod: text("payment_method").default("cash"),
  paymentCollector: text("payment_collector"),
  isPaid: boolean("is_paid").notNull().default(false),
  notes: text("notes"),
  gender: text("gender"),
  nationality: text("nationality"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  idNumber: text("id_number"), // Passport/IC number
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  age: text("age"),
  profilePhotoUrl: text("profile_photo_url"),
  selfCheckinToken: text("self_checkin_token"), // Link back to the token used for self check-in
}, (table) => ([
  index("idx_guests_capsule_number").on(table.capsuleNumber),
  index("idx_guests_is_checked_in").on(table.isCheckedIn),
  index("idx_guests_checkin_time").on(table.checkinTime),
  index("idx_guests_checkout_time").on(table.checkoutTime),
  index("idx_guests_self_checkin_token").on(table.selfCheckinToken),
]));

export const capsules = pgTable("capsules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull().unique(),
  section: text("section").notNull(), // 'back', 'middle', 'front'
  isAvailable: boolean("is_available").notNull().default(true),
  cleaningStatus: text("cleaning_status").notNull().default("cleaned"), // 'cleaned', 'to_be_cleaned'
  lastCleanedAt: timestamp("last_cleaned_at"),
  lastCleanedBy: text("last_cleaned_by"),
  color: text("color"), // Color of the capsule
  purchaseDate: date("purchase_date"), // When the capsule was purchased
  position: text("position"), // 'top' or 'bottom' for stacked capsules
  remark: text("remark"), // Additional notes about the capsule
}, (table) => ([
  index("idx_capsules_is_available").on(table.isAvailable),
  index("idx_capsules_section").on(table.section),
  index("idx_capsules_cleaning_status").on(table.cleaningStatus),
  index("idx_capsules_position").on(table.position),
]));

// Separate table for tracking all capsule problems
export const capsuleProblems = pgTable("capsule_problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  capsuleNumber: text("capsule_number").notNull(),
  description: text("description").notNull(),
  reportedBy: text("reported_by").notNull(), // Username of staff who reported
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: text("resolved_by"), // Username of staff who resolved
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"), // Resolution notes
}, (table) => ([
  index("idx_capsule_problems_capsule_number").on(table.capsuleNumber),
  index("idx_capsule_problems_is_resolved").on(table.isResolved),
  index("idx_capsule_problems_reported_at").on(table.reportedAt),
]));

// Guest check-in tokens for self-service check-in
export const guestTokens = pgTable("guest_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  capsuleNumber: text("capsule_number"), // Optional - null when auto-assign is used
  autoAssign: boolean("auto_assign").default(false), // True when capsule should be auto-assigned
  guestName: text("guest_name"), // Optional - guest fills it themselves
  phoneNumber: text("phone_number"), // Optional - guest fills it themselves
  email: text("email"),
  expectedCheckoutDate: text("expected_checkout_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
  index("idx_guest_tokens_token").on(table.token),
  index("idx_guest_tokens_is_used").on(table.isUsed),
  index("idx_guest_tokens_expires_at").on(table.expiresAt),
  index("idx_guest_tokens_capsule_number").on(table.capsuleNumber),
]));

// Admin notifications for various events
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'self_checkin', 'checkout', 'maintenance', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  guestId: varchar("guest_id"), // Optional reference to guest
  capsuleNumber: text("capsule_number"), // Optional capsule reference
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
  index("idx_admin_notifications_is_read").on(table.isRead),
  index("idx_admin_notifications_type").on(table.type),
  index("idx_admin_notifications_created_at").on(table.createdAt),
]));

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

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  checkinTime: true,
  checkoutTime: true,
  isCheckedIn: true,
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
      // Note: Max amount validation now uses configurable value on the server
      // Client validation uses default that should match server configuration
      return !isNaN(num) && num >= 0 && num <= 9999.99;
    }, "Amount must be within the allowed range. Please check with admin for current limits")
    .optional(),
  paymentMethod: z.enum(["cash", "tng", "bank", "platform"], {
    required_error: "Please select a payment method"
  }).default("cash"), // Default can be overridden by configuration
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
  expectedCheckoutDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected checkout date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true; // Optional field
      const date = new Date(val);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1); // Max 1 year from now
      return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
    .optional(),
  checkInDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-in date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true; // Optional field
      const date = new Date(val);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1); // Max 1 year from now
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
  age: z.string().optional(), // Age is automatically calculated from IC number
  profilePhotoUrl: z.string()
    .url("Profile photo must be a valid URL")
    .optional(),
});

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
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.date().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
  problemDescription: z.string()
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
});

export const checkoutGuestSchema = z.object({
  id: z.string().min(1, "Guest ID is required"),
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

// Authentication schemas
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

export const bulkGuestImportSchema = z.array(
  insertGuestSchema.extend({
    checkinTime: z.string().optional(), // ISO date string
  })
);

// Guest self-check-in schema with comprehensive validation
export const guestSelfCheckinSchema = z.object({
  nameAsInDocument: z.string()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name must not exceed 100 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, periods, apostrophes, and hyphens")
    .transform(val => val.trim()),
  phoneNumber: z.string()
    .min(7, "Phone number must be at least 7 digits long")
    .max(20, "Phone number must not exceed 20 characters")
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
      if (!val) return true; // Optional field
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1); // Max 1 year from now
      maxDate.setHours(0, 0, 0, 0);
      return date >= today && date <= maxDate;
    }, "Check-in date must be between today and 1 year from now"),
  checkOutDate: z.string()
    .min(1, "Check-out date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Check-out date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return false; // Required field
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1); // Max 1 year from now
      maxDate.setHours(0, 0, 0, 0);
      return date >= today && date <= maxDate;
    }, "Check-out date must be between today and 1 year from now"),
  icNumber: z.string()
    .regex(/^\d{12}$/, "IC number must be 12 digits (e.g., 840816015291)")
    .refine(val => {
      if (!val) return true; // Optional when passport is provided
      // Basic IC validation - check if first 6 digits form a valid date
      const datePart = val.substring(0, 6);
      const year = parseInt(datePart.substring(0, 2));
      const month = parseInt(datePart.substring(2, 4));
      const day = parseInt(datePart.substring(4, 6));
      
      // Convert 2-digit year to 4-digit (assume 1900-2099)
      const fullYear = year < 30 ? 2000 + year : 1900 + year;
      const date = new Date(fullYear, month - 1, day);
      
      return date.getFullYear() === fullYear && 
             date.getMonth() === month - 1 && 
             date.getDate() === day &&
             month >= 1 && month <= 12 &&
             day >= 1 && day <= 31;
    }, "Please enter a valid IC number with a valid birth date")
    .optional(),
  passportNumber: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val) // Convert empty strings to undefined
    .refine((val) => {
      if (val === undefined) return true; // Skip validation if undefined
      return val.length >= 6;
    }, "Passport number must be at least 6 characters long")
    .refine((val) => {
      if (val === undefined) return true; // Skip validation if undefined
      return val.length <= 15;
    }, "Passport number must not exceed 15 characters")
    .refine((val) => {
      if (val === undefined) return true; // Skip validation if undefined
      return /^[A-Za-z0-9]+$/.test(val);
    }, "Passport number can only contain letters and numbers")
    .transform(val => val?.toUpperCase()),
  icDocumentUrl: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val) // Convert empty strings to undefined
    .refine((val) => {
      if (val === undefined) return true; // Skip validation if undefined
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, "IC document must be a valid URL"),
  passportDocumentUrl: z.string()
    .optional()
    .transform(val => val === "" ? undefined : val) // Convert empty strings to undefined
    .refine((val) => {
      if (val === undefined) return true; // Skip validation if undefined
      try {
        new URL(val);
        return true;
      } catch {
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
  // Malaysians must provide IC number and IC photo
  if (data.nationality === 'Malaysian') {
    return !!data.icNumber && !!data.icDocumentUrl;
  }
  // Non-Malaysians must provide passport number and passport photo
  return !!data.passportNumber && !!data.passportDocumentUrl;
}, {
  message: "Please provide the required document number and upload the photo.",
  path: ["icNumber"],
}).refine((data) => {
  // Specific messaging for Malaysians
  if (data.nationality === 'Malaysian') {
    return !!data.icDocumentUrl;
  }
  return !!data.passportDocumentUrl;
}, {
  message: "Please upload the required document photo.",
  path: ["icDocumentUrl"],
}).refine((data) => {
  // If IC number is provided, IC document is required
  if (data.icNumber && !data.icDocumentUrl) {
    return false;
  }
  return true;
}, {
  message: "Please upload a photo of your IC if you provided IC number",
  path: ["icDocumentUrl"],
}).refine((data) => {
  // If passport number is provided, passport document is required
  if (data.passportNumber && !data.passportDocumentUrl) {
    return false;
  }
  return true;
}, {
  message: "Please upload a photo of your passport if you provided passport number",
  path: ["passportDocumentUrl"],
}).refine((data) => {
  // Malaysians should not provide passport details; enforce clearing
  if (data.nationality === 'Malaysian') {
    return !data.passportNumber && !data.passportDocumentUrl;
  }
  return true;
}, {
  message: "Malaysian guests should provide IC only, not passport",
  path: ["passportNumber"],
}).refine((data) => {
  // If cash payment method is selected, description is required
  if (data.paymentMethod === "cash" && !data.guestPaymentDescription?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please describe whom you gave the payment to",
  path: ["guestPaymentDescription"],
}).refine((data) => {
  // Check-out date must be after check-in date
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

// Token creation schema with comprehensive validation
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
    .regex(/^[+]?[\d\s\-\(\)]{7,20}$/, "Please enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
    .transform(val => val?.replace(/\s/g, ""))
    .optional(),
  email: z.string()
    .email("Please enter a valid email address")
    .transform(val => val?.toLowerCase().trim())
    .optional(),
  expectedCheckoutDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected checkout date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true; // Optional field
      const date = new Date(val);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1); // Max 1 year from now
      return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
    .optional(),
  expiresInHours: z.number()
    .min(1, "Token must expire in at least 1 hour")
    .max(168, "Token cannot expire later than 168 hours (7 days)")
    .default(24),
  // Optional per-token overrides for Guest Guide visibility
  guideOverrideEnabled: z.boolean().optional(),
  guideShowIntro: z.boolean().optional(),
  guideShowAddress: z.boolean().optional(),
  guideShowWifi: z.boolean().optional(),
  guideShowCheckin: z.boolean().optional(),
  guideShowOther: z.boolean().optional(),
  guideShowFaq: z.boolean().optional(),
}).refine((data) => {
  // Either capsuleNumber or autoAssign must be provided, but not both
  const hasCapsuleNumber = data.capsuleNumber && data.capsuleNumber.length > 0;
  const hasAutoAssign = data.autoAssign === true;
  
  return (hasCapsuleNumber && !hasAutoAssign) || (!hasCapsuleNumber && hasAutoAssign);
}, {
  message: "Either specify a capsule number or choose auto assign (but not both)",
  path: ["capsuleNumber"],
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type CheckoutGuest = z.infer<typeof checkoutGuestSchema>;
export type Capsule = typeof capsules.$inferSelect;
export type InsertCapsule = z.infer<typeof insertCapsuleSchema>;
export type Session = typeof sessions.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateCapsuleProblem = z.infer<typeof createCapsuleProblemSchema>;
export type ResolveProblem = z.infer<typeof resolveProblemSchema>;
export type CapsuleProblem = typeof capsuleProblems.$inferSelect;
export type InsertCapsuleProblem = typeof capsuleProblems.$inferInsert;
export type BulkGuestImport = z.infer<typeof bulkGuestImportSchema>;
export type UpdateGuest = z.infer<typeof updateGuestSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type BulkAction = z.infer<typeof bulkActionSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type GuestToken = typeof guestTokens.$inferSelect;
export type InsertGuestToken = typeof guestTokens.$inferInsert;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;
export type GuestSelfCheckin = z.infer<typeof guestSelfCheckinSchema>;
export type CreateToken = z.infer<typeof createTokenSchema>;
export type MarkCapsuleCleaned = z.infer<typeof markCapsuleCleanedSchema>;

// Admin notification schema for validation
export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({ 
  id: true, 
  createdAt: true 
});

// App settings table
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ([
  index("idx_app_settings_key").on(table.key),
]));

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

// Settings schemas with validation
export const updateSettingsSchema = z.object({
  // Token and Session Settings
  guestTokenExpirationHours: z.number()
    .min(1, "Token expiration must be at least 1 hour")
    .max(168, "Token expiration cannot exceed 168 hours (7 days)")
    .int("Token expiration must be a whole number of hours")
    .default(24),
  sessionExpirationHours: z.number()
    .min(1, "Session expiration must be at least 1 hour")
    .max(168, "Session expiration cannot exceed 168 hours (7 days)")
    .int("Session expiration must be a whole number of hours")
    .default(24),
  
  // System Settings
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
  
  // Guest Guide Settings (all optional, editable in Settings > Guest Guide)
  guideIntro: z.string()
    .max(5000, "Introduction is too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideAddress: z.string()
    .max(1000, "Address is too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideWifiName: z.string()
    .max(200, "WiFi name too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideWifiPassword: z.string()
    .max(200, "WiFi password too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideCheckin: z.string()
    .max(5000, "Check-in guidance too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideOther: z.string()
    .max(5000, "Other guidance too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideFaq: z.string()
    .max(8000, "FAQ too long")
    .optional()
    .transform((v) => (v ?? '').trim()),
  guideImportantReminders: z.string()
    .max(2000, "Important reminders too long")
    .optional()
    .transform((v) => (v ?? '').trim()),

  // Quick Links Settings (treat empty strings as undefined, validate only when provided)
  guideHostelPhotosUrl: z.string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t === '' ? undefined : t;
    })
    .refine((val) => {
      if (val === undefined) return true;
      try { new URL(val); return true; } catch { return false; }
    }, "Hostel photos URL must be a valid URL"),
  guideGoogleMapsUrl: z.string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t === '' ? undefined : t;
    })
    .refine((val) => {
      if (val === undefined) return true;
      try { new URL(val); return true; } catch { return false; }
    }, "Google Maps URL must be a valid URL"),
  guideCheckinVideoUrl: z.string()
    .optional()
    .transform((v) => {
      const t = (v ?? '').trim();
      return t === '' ? undefined : t;
    })
    .refine((val) => {
      if (val === undefined) return true;
      try { new URL(val); return true; } catch { return false; }
    }, "Check-in video URL must be a valid URL"),

  // Guest Guide Time and Access Settings
  guideCheckinTime: z.string()
    .max(100, "Check-in time description too long")
    .optional()
    .transform((v) => (v ?? 'From 3:00 PM').trim()),
  guideCheckoutTime: z.string()
    .max(100, "Check-out time description too long")
    .optional()
    .transform((v) => (v ?? 'Before 12:00 PM').trim()),
  guideDoorPassword: z.string()
    .max(50, "Door password too long")
    .optional()
    .transform((v) => (v ?? '1270#').trim()),

  // Guest Guide Styling Settings
  guideCustomStyles: z.string()
    .max(10000, "Custom styles too long")
    .optional()
    .transform((v) => (v ?? '').trim()),

  // Guest Guide visibility toggles
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
  
  // Payment Settings
  defaultPaymentMethod: z.enum(["cash", "tng", "bank", "platform"], {
    required_error: "Default payment method is required"
  }).default("cash"),
  maxPaymentAmount: z.number()
    .min(0, "Maximum payment amount must be positive")
    .max(99999.99, "Maximum payment amount cannot exceed RM 99,999.99")
    .default(9999.99),
  
  // Capsule Settings
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
  
  // Notification Settings
  notificationRetentionDays: z.number()
    .min(1, "Notification retention must be at least 1 day")
    .max(365, "Notification retention cannot exceed 365 days")
    .int("Notification retention must be a whole number of days")
    .default(30),
  
  // Cache and Performance Settings
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
  
  // Data Pagination Settings
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
  
  // Business Rules
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
  
  // Contact Information
  defaultAdminEmail: z.string()
    .email("Default admin email must be a valid email address")
    .default("admin@pelangicapsule.com"),
  supportEmail: z.string()
    .email("Support email must be a valid email address")
    .default("support@pelangicapsule.com"),
  supportPhone: z.string()
    .regex(/^[+]?[\d\s\-\(\)]{7,20}$/, "Support phone must be a valid phone number")
    .default("+60123456789"),
  
  // Application Settings
  hostelName: z.string()
    .min(1, "Hostel name is required")
    .max(100, "Hostel name cannot exceed 100 characters")
    .default("Pelangi Capsule Hostel"),
  timezone: z.string()
    .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, "Timezone must be in format like Asia/Kuala_Lumpur")
    .default("Asia/Kuala_Lumpur"),
});

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// Additional validation schemas for specific use cases
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

// Malaysian IC number validation
export const malaysianICSchema = z.string()
  .regex(/^\d{6}-\d{2}-\d{4}$/, "IC number must be in format XXXXXX-XX-XXXX")
  .refine(val => {
    // Basic IC validation - check if first 6 digits form a valid date
    const datePart = val.substring(0, 6);
    const year = parseInt(datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    // Convert 2-digit year to 4-digit (assume 1900-2099)
    const fullYear = year < 30 ? 2000 + year : 1900 + year;
    const date = new Date(fullYear, month - 1, day);
    
    return date.getFullYear() === fullYear && 
           date.getMonth() === month - 1 && 
           date.getDate() === day &&
           month >= 1 && month <= 12 &&
           day >= 1 && day <= 31;
  }, "Please enter a valid IC number with a valid birth date");

// International passport number validation
export const passportNumberSchema = z.string()
  .min(6, "Passport number must be at least 6 characters long")
  .max(15, "Passport number must not exceed 15 characters")
  .regex(/^[A-Z0-9]+$/, "Passport number can only contain uppercase letters and numbers")
  .transform(val => val.toUpperCase());

// Age validation (automatically calculated from IC number)
export const ageSchema = z.string()
  .regex(/^\d{1,3}$/, "Age must be a number")
  .refine(val => {
    const age = parseInt(val);
    return age >= 0 && age <= 120;
  }, "Age must be between 0 and 120");

// Date validation for checkout dates
export const checkoutDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(val => {
    const date = new Date(val);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1); // Max 1 year from now
    return date >= today && date <= maxDate;
  }, "Date must be between today and 1 year from now");

// Payment amount validation
export const paymentAmountSchema = z.string()
  .regex(/^\d*\.?\d{0,2}$/, "Payment amount must be a valid monetary value")
  .refine(val => {
    const num = parseFloat(val || "0");
    return !isNaN(num) && num >= 0 && num <= 9999.99;
  }, "Payment amount must be between 0 and 9999.99");

// Update guest schema for editing
export const updateGuestSchema = insertGuestSchema.partial().extend({
  id: z.string().min(1, "Guest ID is required"),
});

// Update user schema for editing
export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().min(1, "User ID is required"),
});

// Bulk operations validation
export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1, "ID cannot be empty")).min(1, "At least one item must be selected"),
  action: z.enum(["delete", "archive", "activate", "deactivate"], {
    required_error: "Action is required"
  }),
});

// Search and filter validation
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

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Validation utilities
export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidPhone: (phone: string): boolean => {
    try {
      phoneNumberSchema.parse(phone);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidCapsuleNumber: (capsuleNumber: string): boolean => {
    try {
      capsuleNumberSchema.parse(capsuleNumber);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidMalaysianIC: (ic: string): boolean => {
    try {
      malaysianICSchema.parse(ic);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidPassportNumber: (passport: string): boolean => {
    try {
      passportNumberSchema.parse(passport);
      return true;
    } catch {
      return false;
    }
  },
  
  formatPhoneNumber: (phone: string): string => {
    return phone.replace(/\s/g, "");
  },
  
  formatName: (name: string): string => {
    return name.trim().replace(/\s+/g, " ");
  },
  
  sanitizeString: (str: string): string => {
    return str.trim().replace(/[<>"'&]/g, "");
  }
};
