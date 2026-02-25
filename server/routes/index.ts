import { Express } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import guestRoutes from "./guests";
import guestTokenRoutes from "./guest-tokens";
import capsuleRoutes from "./capsules";
import adminRoutes from "./admin";
import problemRoutes from "./problems";
import settingsRoutes from "./settings";
import expenseRoutes from "./expenses";
import objectRoutes from "./objects";
import dashboardRoutes from "./dashboard";
import testRoutes from "./tests";
import pushRoutes from "./push";
import databaseRoutes from "./database";
import environmentRoutes from "./environment";
import rainbowKBRoutes from "./rainbow-kb";
import intentManagerRoutes from "./intent-manager";
import contactFieldsRoutes from "./contact-fields";
import scheduledMessagesRoutes from "./scheduled-messages";

export function registerModularRoutes(app: Express) {
  // Register auth routes
  app.use("/api/auth", authRoutes);
  
  // Register user routes
  app.use("/api/users", userRoutes);
  
  // Register guest routes
  app.use("/api/guests", guestRoutes);
  
  // Register guest token routes
  app.use("/api/guest-tokens", guestTokenRoutes);
  
  // Register guest self-checkin routes (using guest-tokens route handlers)
  app.use("/api/guest-checkin", guestTokenRoutes);
  
  // Register capsule routes
  app.use("/api/capsules", capsuleRoutes);

  // Register admin routes
  app.use("/api/admin", adminRoutes);

  // Register problem tracking routes
  app.use("/api/problems", problemRoutes);

  // Register settings routes
  app.use("/api/settings", settingsRoutes);

  
  // Register expense routes
  app.use("/api/expenses", expenseRoutes);
  
  // Register dashboard routes (includes /api/dashboard, /api/occupancy, /api/calendar)
  app.use("/api", dashboardRoutes);
  
  // Register push notification routes
  app.use("/api/push", pushRoutes);
  
  // Register database management routes
  app.use("/", databaseRoutes);
  
  // Register environment configuration routes
  app.use("/", environmentRoutes);

  // Register Rainbow KB routes (used by MCP server dashboard)
  app.use("/api/rainbow-kb", rainbowKBRoutes);

  // Register Intent Manager routes (Phase 4 - Keyword Editor UI)
  app.use("/api/intent-manager", intentManagerRoutes);

  // Register Contact Fields routes (Homestay Feature A)
  app.use("/api/contact-fields", contactFieldsRoutes);

  // Register Scheduled Messages routes (Homestay Feature D)
  app.use("/api/scheduled-messages", scheduledMessagesRoutes);

  // Register test routes
  app.use("/api/tests", testRoutes);

  // Top-level API health (for MCP server and load balancers)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "pelangi-manager", timestamp: new Date().toISOString() });
  });
  
  // Error reporting endpoint (for global error boundary)
  app.post("/api/errors/report", async (req, res) => {
    try {
      const errorReport = req.body;
      
      // In development, just log the error
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 Client Error Report:', JSON.stringify(errorReport, null, 2));
      }
      
      // For now, just acknowledge receipt
      res.json({ 
        success: true, 
        message: 'Error report received'
      });
    } catch (error) {
      console.error('Failed to process error report:', error);
      res.status(500).json({ success: false, message: 'Failed to process error report' });
    }
  });
  
  // Return null as this function should not create server
  // Server creation is handled by the main routes.ts file
  return null;
}

export function registerObjectRoutes(app: Express) {
  // Register object storage routes (includes both /api/objects and /objects paths)
  // This is registered after Vite middleware to prevent route conflicts
  app.use("/", objectRoutes);
}