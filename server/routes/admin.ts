import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { updateSettingsSchema, intentDetectionSettings } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { getConfig, getConfigForAPI, validateConfigUpdate } from "../configManager";
import { authenticateToken } from "./middleware/auth";
import { handleDatabaseError, handleFeatureNotImplementedError } from "../lib/errorHandler";
import fs from "fs/promises";
import path from "path";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Get admin configuration
router.get("/config", securityValidationMiddleware, async (req, res) => {
  try {
    const config = await getConfigForAPI();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Failed to get configuration" });
  }
});

// Update admin configuration
router.put("/config", securityValidationMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const validation = await validateConfigUpdate(updates);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        message: "Invalid configuration", 
        errors: validation.errors 
      });
    }

    const config = getConfig();
    await config.updateMultiple(updates, req.user?.email || 'admin');
    
    res.json({ message: "Configuration updated successfully" });
  } catch (error) {
    console.error("Config update error:", error);
    res.status(500).json({ message: "Failed to update configuration" });
  }
});

// Reset admin configuration to defaults
router.post("/config/reset", securityValidationMiddleware, async (req, res) => {
  try {
    const config = getConfig();
    await config.resetAll(req.user?.email || 'admin');
    
    res.json({ message: "Configuration reset to defaults successfully" });
  } catch (error) {
    console.error("Config reset error:", error);
    res.status(500).json({ message: "Failed to reset configuration" });
  }
});

// Get admin notifications
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await storage.getAdminNotifications({ page, limit });
    res.json(notifications);
  } catch (error: any) {
    // Check if this is a table missing error for admin_notifications
    if (error.message?.includes('relation "admin_notifications" does not exist')) {
      return handleFeatureNotImplementedError(
        'Admin Notifications',
        '/api/admin/notifications',
        res
      );
    }
    
    // Handle other database errors with detailed messages
    handleDatabaseError(error, '/api/admin/notifications', res);
  }
});

// Get unread admin notifications
router.get("/notifications/unread", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await storage.getUnreadAdminNotifications({ page, limit });
    res.json(notifications);
  } catch (error: any) {
    // Check if this is a table missing error for admin_notifications
    if (error.message?.includes('relation "admin_notifications" does not exist')) {
      return handleFeatureNotImplementedError(
        'Admin Notifications',
        '/api/admin/notifications/unread',
        res
      );
    }
    
    // Handle other database errors with detailed messages
    handleDatabaseError(error, '/api/admin/notifications/unread', res);
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await storage.markNotificationAsRead(id);
    
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    const count = await storage.markAllNotificationsAsRead();
    res.json({ message: `${count} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

// ─── Rainbow Intents Management ────────────────────────────────────────────

// Get intents configuration
router.get("/rainbow/intents", securityValidationMiddleware, async (req, res) => {
  try {
    const intentsPath = path.join(process.cwd(), "mcp-server", "src", "assistant", "data", "intents.json");
    const intentsData = await fs.readFile(intentsPath, "utf-8");
    const intents = JSON.parse(intentsData);
    res.json(intents);
  } catch (error) {
    console.error("Failed to read intents configuration:", error);
    res.status(500).json({ message: "Failed to read intents configuration" });
  }
});

// Toggle intent enabled status
router.post("/rainbow/intents/toggle", securityValidationMiddleware, async (req, res) => {
  try {
    const { category, enabled } = req.body;

    if (!category || typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const intentsPath = path.join(process.cwd(), "mcp-server", "src", "assistant", "data", "intents.json");
    const intentsData = await fs.readFile(intentsPath, "utf-8");
    const intents = JSON.parse(intentsData);

    // Find and update the category
    const categoryIndex = intents.categories.findIndex(
      (cat: any) => cat.category === category
    );

    if (categoryIndex === -1) {
      return res.status(404).json({ message: "Intent category not found" });
    }

    intents.categories[categoryIndex].enabled = enabled;

    // Write back to file
    await fs.writeFile(intentsPath, JSON.stringify(intents, null, 2), "utf-8");

    res.json({
      message: "Intent status updated successfully",
      category,
      enabled
    });
  } catch (error) {
    console.error("Failed to toggle intent:", error);
    res.status(500).json({ message: "Failed to toggle intent status" });
  }
});

// Test intent and get sample reply
router.post("/rainbow/intents/test", securityValidationMiddleware, async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const intentsPath = path.join(process.cwd(), "mcp-server", "src", "assistant", "data", "intents.json");
    const intentsData = await fs.readFile(intentsPath, "utf-8");
    const intents = JSON.parse(intentsData);

    // Find the category
    const intentCategory = intents.categories.find(
      (cat: any) => cat.category === category
    );

    if (!intentCategory) {
      return res.status(404).json({ message: "Intent category not found" });
    }

    // Generate sample replies based on category
    const sampleReplies: Record<string, string> = {
      greeting: "Hello! Welcome to our hostel. How can I help you today? 😊",
      thanks: "You're welcome! If you need anything else, feel free to ask. Have a great stay!",
      wifi: "Our WiFi credentials are:\nNetwork: PelangiHostel_5G\nPassword: Pelangi2024!\n\nThe network works throughout the building. Let me know if you have any connection issues!",
      directions: "We're located at:\n📍 123 Jalan Rainbow, Kuala Lumpur\n\nGoogle Maps: https://goo.gl/maps/example\n\nFrom KL Sentral:\n• Take LRT to Masjid Jamek (15 min)\n• Walk 5 minutes to our location\n\nNeed more help with directions?",
      checkin_info: "Check-in time is from 2:00 PM onwards.\n\nWhat you'll need:\n✓ Valid ID/Passport\n✓ Booking confirmation\n✓ Payment (if not prepaid)\n\nEarly check-in may be available - just ask at reception!",
      checkout_info: "Check-out time is 12:00 PM (noon).\n\nPlease:\n• Return your key card\n• Clear your belongings from the locker\n• Leave the bed area tidy\n\nNeed a late checkout? Let us know - we might be able to extend for a small fee!",
      pricing: "Our rates:\n🛏️ Dorm Bed: RM 35/night\n🛏️ Private Capsule: RM 60/night\n\n💰 Weekly: 10% discount\n💰 Monthly: 20% discount\n\nIncludes:\n✓ WiFi\n✓ Air conditioning\n✓ Shared facilities\n✓ Locker storage\n\nWant to book? I can check availability!",
      availability: "Let me check our availability for you!\n\nFor today:\n🟢 Dorm beds: 8 available\n🟢 Private capsules: 3 available\n\nWhat dates are you looking for? I can give you exact availability and help you book!",
      booking: "Great! I can help you with your booking.\n\nTo proceed, I'll need:\n1. Check-in date\n2. Check-out date\n3. Number of guests\n4. Bed type preference (dorm/private)\n\nYou can:\n📱 Book directly via our website: pelangihostel.com/book\n💬 Tell me your details and I'll help you reserve\n📞 Call us: +60 12-345 6789",
      complaint: "I'm sorry to hear you're experiencing an issue. Your comfort is important to us.\n\nPlease tell me:\n• What's the problem?\n• Your capsule/bed number\n• How urgent is it?\n\nI'll notify our staff immediately and we'll resolve this as quickly as possible. You can also reach staff directly at extension 100.",
      contact_staff: "You can reach our staff:\n\n📞 Reception: +60 12-345 6789\n📞 WhatsApp: +60 12-345 6789\n📧 Email: hello@pelangihostel.com\n🔔 Emergency: Press the red button near reception\n\nOur staff is available 24/7. How can we help you?",
      facilities: "Our facilities:\n\n🚿 Bathrooms: Clean, modern, gender-separated\n🍳 Kitchen: Fully equipped, 24/7 access\n🧺 Laundry: Washer & dryer (RM 5 per use)\n🔒 Lockers: One per guest (bring your own lock)\n🅿️ Parking: Limited street parking nearby\n📚 Common Area: Lounge with TV & board games\n\nNeed more details about any facility?",
      rules: "House Rules:\n\n✅ Quiet hours: 11 PM - 7 AM\n✅ No smoking inside (designated area outside)\n✅ No outside guests in dorm areas\n✅ Keep common areas clean\n✅ Respect other guests\n\n❌ No pets\n❌ No parties\n❌ No illegal substances\n\nBreaking rules may result in immediate checkout without refund. Questions about any rule?",
      payment: "Payment options:\n\n💳 Credit/Debit cards (Visa, Mastercard)\n🏦 Bank transfer:\n   Bank: Maybank\n   Account: 1234-5678-9000\n   Name: Pelangi Hostel Sdn Bhd\n💵 Cash (pay at reception)\n📱 E-wallets (TNG, GrabPay, Boost)\n\nFull payment required at check-in unless prepaid online.\n\nNeed bank transfer details or have payment questions?"
    };

    const sampleReply = sampleReplies[category] || `This is a sample reply for the "${category}" intent. Configure custom responses in your assistant settings.`;

    res.json({
      intent: category,
      sampleReply,
      matchedPattern: intentCategory.patterns[0] // Show first pattern as example
    });
  } catch (error) {
    console.error("Failed to test intent:", error);
    res.status(500).json({ message: "Failed to test intent" });
  }
});

// ─── Intent Detection Configuration ─────────────────────────────────

// Get intent detection config
router.get("/intent-detection-config", authenticateToken, async (req, res) => {
  try {
    // Try to get from database
    const config = await db.query.intentDetectionSettings.findFirst();

    if (!config) {
      // Return defaults if not found
      return res.json({
        tiers: {
          tier1_emergency: { enabled: true, contextMessages: 0 },
          tier2_fuzzy: { enabled: true, contextMessages: 3, threshold: 0.80 },
          tier3_semantic: { enabled: true, contextMessages: 5, threshold: 0.70 },
          tier4_llm: { enabled: true, contextMessages: 5 }
        },
        conversationState: {
          trackLastIntent: true,
          trackSlots: true,
          maxHistoryMessages: 20,
          contextTTL: 30
        }
      });
    }

    // Transform DB format to API format
    res.json({
      tiers: {
        tier1_emergency: {
          enabled: config.tier1Enabled,
          contextMessages: config.tier1ContextMessages
        },
        tier2_fuzzy: {
          enabled: config.tier2Enabled,
          contextMessages: config.tier2ContextMessages,
          threshold: config.tier2Threshold
        },
        tier3_semantic: {
          enabled: config.tier3Enabled,
          contextMessages: config.tier3ContextMessages,
          threshold: config.tier3Threshold
        },
        tier4_llm: {
          enabled: config.tier4Enabled,
          contextMessages: config.tier4ContextMessages
        }
      },
      conversationState: {
        trackLastIntent: config.trackLastIntent,
        trackSlots: config.trackSlots,
        maxHistoryMessages: config.maxHistoryMessages,
        contextTTL: config.contextTTL
      }
    });
  } catch (error) {
    console.error("Failed to get intent detection config:", error);
    res.status(500).json({ message: "Failed to get intent detection configuration" });
  }
});

// Update intent detection config
router.post("/intent-detection-config", authenticateToken, async (req, res) => {
  try {
    const { tiers, conversationState } = req.body;

    // Validate input
    if (!tiers || !conversationState) {
      return res.status(400).json({ message: "Invalid configuration format" });
    }

    // Transform API format to DB format
    const dbConfig = {
      tier1Enabled: tiers.tier1_emergency.enabled,
      tier1ContextMessages: tiers.tier1_emergency.contextMessages,
      tier2Enabled: tiers.tier2_fuzzy.enabled,
      tier2ContextMessages: tiers.tier2_fuzzy.contextMessages,
      tier2Threshold: tiers.tier2_fuzzy.threshold,
      tier3Enabled: tiers.tier3_semantic.enabled,
      tier3ContextMessages: tiers.tier3_semantic.contextMessages,
      tier3Threshold: tiers.tier3_semantic.threshold,
      tier4Enabled: tiers.tier4_llm.enabled,
      tier4ContextMessages: tiers.tier4_llm.contextMessages,
      trackLastIntent: conversationState.trackLastIntent,
      trackSlots: conversationState.trackSlots,
      maxHistoryMessages: conversationState.maxHistoryMessages,
      contextTTL: conversationState.contextTTL
    };

    // Check if config exists
    const existing = await db.query.intentDetectionSettings.findFirst();

    if (existing) {
      // Update existing
      await db.update(intentDetectionSettings)
        .set({ ...dbConfig, updatedAt: new Date() })
        .where(eq(intentDetectionSettings.id, existing.id));
    } else {
      // Insert new
      await db.insert(intentDetectionSettings).values(dbConfig);
    }

    res.json({ success: true, message: "Intent detection configuration updated" });
  } catch (error) {
    console.error("Failed to update intent detection config:", error);
    res.status(500).json({ message: "Failed to update intent detection configuration" });
  }
});

export default router;