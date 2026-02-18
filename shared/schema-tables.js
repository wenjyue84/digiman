/**
 * schema-tables.ts — Drizzle ORM table definitions (Single Responsibility: DB schema)
 *
 * Contains ALL pgTable definitions and table-derived types.
 * Validation schemas live in schema-validation.ts.
 */
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, date, index, integer, real, serial } from "drizzle-orm/pg-core";
// ─── User & Auth ─────────────────────────────────────────────────────
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
export const sessions = pgTable("sessions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_token").on(table.token),
    index("idx_sessions_expires_at").on(table.expiresAt),
]));
// ─── Guests ──────────────────────────────────────────────────────────
export const guests = pgTable("guests", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
    status: text("status"),
    alertSettings: text("alert_settings"), // JSON string for checkout alert configuration
}, (table) => ([
    index("idx_guests_capsule_number").on(table.capsuleNumber),
    index("idx_guests_is_checked_in").on(table.isCheckedIn),
    index("idx_guests_checkin_time").on(table.checkinTime),
    index("idx_guests_checkout_time").on(table.checkoutTime),
    index("idx_guests_self_checkin_token").on(table.selfCheckinToken),
    index("idx_guests_expected_checkout_date").on(table.expectedCheckoutDate),
]));
// ─── Capsules ────────────────────────────────────────────────────────
export const capsules = pgTable("capsules", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    number: text("number").notNull().unique(),
    section: text("section").notNull(), // 'back', 'middle', 'front'
    isAvailable: boolean("is_available").notNull().default(true),
    cleaningStatus: text("cleaning_status").notNull().default("cleaned"), // 'cleaned', 'to_be_cleaned'
    toRent: boolean("to_rent").notNull().default(true), // true = suitable for rent, false = not suitable for rent due to major issues
    lastCleanedAt: timestamp("last_cleaned_at"),
    lastCleanedBy: text("last_cleaned_by"),
    color: text("color"), // Color of the capsule
    purchaseDate: date("purchase_date"), // When the capsule was purchased
    position: text("position"), // 'top' or 'bottom' for stacked capsules
    remark: text("remark"), // Additional notes about the capsule
    branch: text("branch"), // Branch location identifier
}, (table) => ([
    index("idx_capsules_is_available").on(table.isAvailable),
    index("idx_capsules_section").on(table.section),
    index("idx_capsules_cleaning_status").on(table.cleaningStatus),
    index("idx_capsules_position").on(table.position),
    index("idx_capsules_to_rent").on(table.toRent),
]));
export const capsuleProblems = pgTable("capsule_problems", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
// ─── Guest Tokens ────────────────────────────────────────────────────
export const guestTokens = pgTable("guest_tokens", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
// ─── Notifications ───────────────────────────────────────────────────
export const adminNotifications = pgTable("admin_notifications", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
    // Composite: hot query for "unread notifications, newest first"
    index("idx_admin_notifications_read_created").on(table.isRead, table.createdAt),
]));
export const pushSubscriptions = pgTable("push_subscriptions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    endpoint: text("endpoint").notNull().unique(),
    p256dhKey: text("p256dh_key").notNull(),
    authKey: text("auth_key").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsed: timestamp("last_used"),
}, (table) => ([
    index("idx_push_subscriptions_user_id").on(table.userId),
    index("idx_push_subscriptions_endpoint").on(table.endpoint),
]));
// ─── Settings ────────────────────────────────────────────────────────
export const appSettings = pgTable("app_settings", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    updatedBy: varchar("updated_by"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ([
    index("idx_app_settings_key").on(table.key),
]));
// ─── Expenses ────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    description: text("description").notNull(),
    amount: text("amount").notNull(), // Store as decimal string for precision
    category: text("category").notNull(), // repair, consumables, utilities, marketing, maintenance, other
    subcategory: text("subcategory"),
    date: date("date").notNull(),
    notes: text("notes"),
    receiptPhotoUrl: text("receipt_photo_url"),
    itemPhotoUrl: text("item_photo_url"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ([
    index("idx_expenses_category").on(table.category),
    index("idx_expenses_date").on(table.date),
    index("idx_expenses_created_by").on(table.createdBy),
    index("idx_expenses_created_at").on(table.createdAt),
]));
// ─── Rainbow AI ──────────────────────────────────────────────────────
export const intentDetectionSettings = pgTable("intent_detection_settings", {
    id: serial("id").primaryKey(),
    tier1Enabled: boolean("tier1_enabled").default(true).notNull(),
    tier1ContextMessages: integer("tier1_context_messages").default(0).notNull(),
    tier2Enabled: boolean("tier2_enabled").default(true).notNull(),
    tier2ContextMessages: integer("tier2_context_messages").default(3).notNull(),
    tier2Threshold: real("tier2_threshold").default(0.80).notNull(),
    tier3Enabled: boolean("tier3_enabled").default(true).notNull(),
    tier3ContextMessages: integer("tier3_context_messages").default(5).notNull(),
    tier3Threshold: real("tier3_threshold").default(0.70).notNull(),
    tier4Enabled: boolean("tier4_enabled").default(true).notNull(),
    tier4ContextMessages: integer("tier4_context_messages").default(5).notNull(),
    trackLastIntent: boolean("track_last_intent").default(true).notNull(),
    trackSlots: boolean("track_slots").default(true).notNull(),
    maxHistoryMessages: integer("max_history_messages").default(20).notNull(),
    contextTTL: integer("context_ttl_minutes").default(30).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const rainbowFeedback = pgTable("rainbow_feedback", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    conversationId: text("conversation_id").notNull(),
    messageId: text("message_id"),
    phoneNumber: text("phone_number").notNull(),
    intent: text("intent"),
    confidence: real("confidence"),
    rating: integer("rating").notNull(), // 1 = thumbs up, -1 = thumbs down
    feedbackText: text("feedback_text"),
    responseModel: text("response_model"),
    responseTime: integer("response_time_ms"),
    tier: text("tier"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
    index("idx_rainbow_feedback_conversation_id").on(table.conversationId),
    index("idx_rainbow_feedback_phone_number").on(table.phoneNumber),
    index("idx_rainbow_feedback_intent").on(table.intent),
    index("idx_rainbow_feedback_rating").on(table.rating),
    index("idx_rainbow_feedback_created_at").on(table.createdAt),
    // Composite: hot query for feedback analytics by time range + intent
    index("idx_rainbow_feedback_created_intent").on(table.createdAt, table.intent),
]));
export const intentPredictions = pgTable("intent_predictions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    conversationId: text("conversation_id").notNull(),
    phoneNumber: text("phone_number").notNull(),
    messageText: text("message_text").notNull(),
    predictedIntent: text("predicted_intent").notNull(),
    confidence: real("confidence").notNull(),
    tier: text("tier").notNull(),
    model: text("model"),
    actualIntent: text("actual_intent"),
    wasCorrect: boolean("was_correct"),
    correctionSource: text("correction_source"),
    correctedAt: timestamp("corrected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ([
    index("idx_intent_predictions_conversation_id").on(table.conversationId),
    index("idx_intent_predictions_phone_number").on(table.phoneNumber),
    index("idx_intent_predictions_predicted_intent").on(table.predictedIntent),
    index("idx_intent_predictions_tier").on(table.tier),
    index("idx_intent_predictions_was_correct").on(table.wasCorrect),
    index("idx_intent_predictions_created_at").on(table.createdAt),
    // Composite: hot query for accuracy analytics (correct/incorrect over time)
    index("idx_intent_predictions_correct_created").on(table.wasCorrect, table.createdAt),
]));
export const rainbowConversationState = pgTable("rainbow_conversation_state", {
    phone: varchar("phone", { length: 32 }).primaryKey(),
    pushName: text("push_name").notNull(),
    language: varchar("language", { length: 2 }).notNull().default('en'),
    bookingStateJson: text("booking_state_json"),
    workflowStateJson: text("workflow_state_json"),
    unknownCount: integer("unknown_count").notNull().default(0),
    lastIntent: text("last_intent"),
    lastIntentConfidence: real("last_intent_confidence"),
    lastIntentTimestamp: timestamp("last_intent_timestamp"),
    slotsJson: text("slots_json"),
    repeatCount: integer("repeat_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
// ─── Rainbow Conversations (Hybrid Storage: replaces JSON files) ─────
export const rainbowConversations = pgTable("rainbow_conversations", {
    phone: varchar("phone", { length: 64 }).primaryKey(), // Canonical phone key (digits only)
    pushName: text("push_name").notNull().default(''),
    instanceId: text("instance_id"), // Which WhatsApp instance
    pinned: boolean("pinned").notNull().default(false),
    favourite: boolean("favourite").notNull().default(false),
    lastReadAt: timestamp("last_read_at"), // For unread badge
    responseMode: text("response_mode"), // autopilot/copilot/manual override
    contactDetailsJson: text("contact_details_json"), // JSON: name, email, country, etc.
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const rainbowMessages = pgTable("rainbow_messages", {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 64 }).notNull(), // FK to rainbow_conversations.phone
    role: varchar("role", { length: 10 }).notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    // Intent metadata
    intent: text("intent"),
    confidence: real("confidence"),
    action: text("action"),
    manual: boolean("manual"), // True if manually sent by admin
    // Developer mode metadata
    source: text("source"), // Detection method: regex | fuzzy | semantic | llm
    model: text("model"), // AI model used
    responseTime: integer("response_time_ms"), // Response time in ms
    kbFilesJson: text("kb_files_json"), // JSON array of KB files used
    messageType: text("message_type"), // info | problem | complaint
    routedAction: text("routed_action"), // static_reply | llm_reply | workflow | etc
    workflowId: text("workflow_id"),
    stepId: text("step_id"),
    usageJson: text("usage_json"), // JSON: {prompt_tokens, completion_tokens, total_tokens}
}, (table) => ([
    index("idx_rainbow_messages_phone").on(table.phone),
    index("idx_rainbow_messages_phone_timestamp").on(table.phone, table.timestamp),
    index("idx_rainbow_messages_role").on(table.role),
    index("idx_rainbow_messages_timestamp").on(table.timestamp),
    // Composite: hot query for fetching conversation messages filtered by role
    index("idx_rainbow_messages_phone_role_ts").on(table.phone, table.role, table.timestamp),
]));
