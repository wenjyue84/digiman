import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { registerModularRoutes } from "./routes/index";

/**
 * IMPORTANT: KEEP THIS FILE MINIMAL!
 * 
 * All API routes are properly organized in modular files under server/routes/:
 * - /api/auth/* → server/routes/auth.ts
 * - /api/guests/* → server/routes/guests.ts  
 * - /api/settings/* → server/routes/settings.ts
 * - /api/admin/* → server/routes/admin.ts
 * - /api/problems/* → server/routes/problems.ts
 * - etc.
 * 
 * DO NOT add API routes here - they belong in their respective modular files!
 * This file should only contain basic setup and static file serving.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Register modular routes
  registerModularRoutes(app);

  // Setup admin route (placeholder)
  app.post("/setup-admin", async (req, res) => {
    res.json({ message: "Admin setup route - to be implemented" });
  });

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Static file serving for photos specifically
  app.use('/uploads/photos', express.static(path.join(process.cwd(), 'uploads/photos')));

  // Static file serving for objects/uploads (to match existing database URLs)
  app.use('/objects/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Static file serving for autotest reports
  app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

  // NO catch-all here — handled by vite.ts (dev) or serveStatic (prod)

  const httpServer = createServer(app);
  return httpServer;
}