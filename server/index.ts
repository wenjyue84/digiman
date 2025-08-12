import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeConfig, AppConfig, getConfig, getConfigUtils } from "./configManager";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize configuration system
  await initializeConfig(storage);
  AppConfig.initialize(getConfig(), getConfigUtils());
  
  // Seed default staff users on each start (idempotent by username)
  try {
    const existing = await storage.getAllUsers();
    const ensureUser = async (username: string, password: string) => {
      const found = existing.find(u => u.username === username);
      if (!found) {
        await storage.createUser({
          email: `${username.toLowerCase()}@pelangi.local`,
          username,
          password,
          role: "staff",
        } as any);
      }
    };
    await ensureUser("Jay", "Jay123");
    await ensureUser("Le", "Le123");
    await ensureUser("Alston", "Alston123");
  } catch (e) {
    console.warn("Warning: could not seed default users:", e);
  }

  // Initialize capsules if none exist
  try {
    const capsules = await storage.getAllCapsules();
    if (capsules.length === 0) {
      console.log("Initializing capsules...");
      
      // Back section: C1-C6
      for (let i = 1; i <= 6; i++) {
        await storage.createCapsule({
          number: `C${i}`,
          section: 'back',
          isAvailable: true,
          cleaningStatus: 'cleaned',
        } as any);
      }
      
      // Middle section: C25, C26
      for (const num of [25, 26]) {
        await storage.createCapsule({
          number: `C${num}`,
          section: 'middle',
          isAvailable: true,
          cleaningStatus: 'cleaned',
        } as any);
      }
      
      // Front section: C11-C24
      for (let i = 11; i <= 24; i++) {
        await storage.createCapsule({
          number: `C${i}`,
          section: 'front',
          isAvailable: true,
          cleaningStatus: 'cleaned',
        } as any);
      }
      
      console.log("✅ Initialized 22 capsules");
    }
  } catch (e) {
    console.warn("Warning: could not initialize capsules:", e);
  }

  // Seed a few active capsule problems if none exist
  try {
    const activeProblems = await storage.getActiveProblems({ page: 1, limit: 1 });
    if ((activeProblems.pagination.total || 0) === 0) {
      const candidates = await storage.getAllCapsules();
      const sampleCaps = candidates.slice(0, 3).map(c => c.number);
      const descriptions = [
        "Light not working properly",
        "Keycard sensor intermittent",
        "Air ventilation is weak",
      ];
      for (let i = 0; i < sampleCaps.length; i++) {
        await storage.createCapsuleProblem({
          capsuleNumber: sampleCaps[i],
          description: descriptions[i] || "Minor maintenance required",
          reportedBy: "System",
        } as any);
      }
    }
  } catch (e) {
    console.warn("Warning: could not seed sample problems:", e);
  }

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    // Log the error with context, but DO NOT rethrow (rethrowing crashes the server)
    console.error("Unhandled server error:", {
      status,
      message,
      method: req.method,
      url: req.originalUrl,
      stack: err?.stack,
    });

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
