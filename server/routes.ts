import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import { registerRoutes as registerModularRoutes } from "./routes/index";

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

  // Serve static files from dist/public
  app.use(express.static(path.join(process.cwd(), "dist/public")));

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Static file serving for photos specifically
  app.use('/uploads/photos', express.static(path.join(process.cwd(), 'uploads/photos')));
  
  // Static file serving for objects/uploads (to match existing database URLs)
  app.use('/objects/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Catch-all handler for SPA
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    res.sendFile(path.join(process.cwd(), "dist/public/index.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}