import 'dotenv/config';
import { validateEnv } from './validate-env';
validateEnv();

import express, { type Request, Response, NextFunction } from "express";
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
// Force rebuild: 2026-02-13 - Updated DATABASE_URL in Zeabur
import { registerRoutes } from "./routes";
import { registerObjectRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { initializeConfig, AppConfig, getConfig, getConfigUtils } from "./configManager";
import { storage } from "./storage";

const app = express();
app.use(compression());

// Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disabled — Vite injects inline scripts in dev; nginx handles CSP in production
  crossOriginEmbedderPolicy: false, // Allow loading cross-origin images (guest photos, etc.)
}));

// Increase body size limits to accommodate small images embedded as Base64 in JSON
// Staff check-in may include a profile photo string. Keep reasonable cap.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

// CORS configuration
// In production, nginx proxies both frontend and API on port 80 (same-origin),
// but browsers may still send Origin headers for credentialed requests.
// CORS_ORIGIN env var allows comma-separated additional origins (e.g. "http://18.142.14.142,https://example.com")
const extraOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return callback(null, true);

    // Allow localhost (local dev + Rainbow AI)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'https://pelangi-manager.vercel.app',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.PRODUCTION_URL || '',
      ...extraOrigins,
    ].filter(Boolean);

    if (allowedOrigins.some(allowed => origin.startsWith(allowed) || origin.includes(allowed))) {
      return callback(null, true);
    }

    // Log blocked origins for debugging
    console.warn('CORS blocked origin:', origin);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
};

app.use(cors(corsOptions));

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
  // Passwords are hashed with bcrypt before storage
  try {
    const { hashPassword } = await import('./lib/password.js');
    const existing = await storage.getAllUsers();
    const ensureUser = async (username: string, password: string) => {
      const found = existing.find(u => u.username === username);
      if (!found) {
        const hashed = await hashPassword(password);
        await storage.createUser({
          email: `${username.toLowerCase()}@pelangi.local`,
          username,
          password: hashed,
          role: "staff",
        } as any);
      }
    };
    const ensureAdminUser = async (username: string, password: string) => {
      const found = existing.find(u => u.username === username || u.email === "admin@pelangi.com" || u.email === username);
      if (!found) {
        const hashed = await hashPassword(password);
        await storage.createUser({
          email: "admin@pelangi.com",
          username,
          password: hashed,
          role: "admin",
        } as any);
        console.log(`Created admin user: ${username}`);
      }
    };

    // Use env vars for credentials (fall back to defaults in development only)
    const isDev = process.env.NODE_ENV !== 'production';
    const adminPassword = process.env.ADMIN_PASSWORD || (isDev ? 'admin123' : undefined);
    if (adminPassword) {
      await ensureAdminUser("admin", adminPassword);
    } else {
      console.warn("ADMIN_PASSWORD env var not set — skipping admin user seed in production");
    }

    // Staff users only seeded in development
    if (isDev) {
      await ensureUser("Jay", process.env.STAFF_PASSWORD_JAY || "Jay123");
      await ensureUser("Le", process.env.STAFF_PASSWORD_LE || "Le123");
      await ensureUser("Alston", process.env.STAFF_PASSWORD_ALSTON || "Alston123");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isSchemaOrConnection = /relation ".*" does not exist|connection|ECONNREFUSED|ETIMEDOUT|database/i.test(msg);
    console.warn("Warning: could not seed default users:", e);
    if (process.env.DATABASE_URL && isSchemaOrConnection) {
      console.warn("\n  → Database may be missing schema or unreachable. Run: npm run db:push");
      console.warn("  → Then restart the server.\n");
    }
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

  // Health check endpoint - MUST be registered BEFORE registerRoutes()
  // to avoid being caught by the catch-all route
  app.get("/health", async (req, res) => {
    try {
      const capsules = await storage.getAllCapsules();
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        capsulesCount: capsules.length,
        storageType: process.env.DATABASE_URL ? "database" : "memory"
      });
    } catch (error: any) {
      res.status(500).json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test route to verify browser connection - also before registerRoutes()
  app.get("/BROWSER_TEST", (req, res) => {
    console.log("🚨 BROWSER IS USING OUR CURRENT SERVER! 🚨");
    res.json({ message: "SUCCESS: You are connected to the current server!" });
  });

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
  console.log("🔥 NODE_ENV:", process.env.NODE_ENV);
  console.log("🔥 app.get('env'):", app.get("env"));

  // Special handling for service worker to ensure correct MIME type
  app.get("/sw.js", (req, res) => {
    const path = require("path");
    const fs = require("fs");
    const swPath = path.resolve(__dirname, "..", "client", "public", "sw.js");
    if (fs.existsSync(swPath)) {
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Service-Worker-Allowed", "/");
      res.sendFile(swPath);
    } else {
      res.status(404).send("Service Worker not found");
    }
  });
  
  // Only setup Vite middleware if not running in concurrent mode
  // When SKIP_VITE_MIDDLEWARE is set, the frontend runs its own Vite dev server
  if (app.get("env") === "development" && !process.env.SKIP_VITE_MIDDLEWARE) {
    console.log("🔥 USING VITE MIDDLEWARE");
    await setupVite(app, server);
  } else if (app.get("env") === "development" && process.env.SKIP_VITE_MIDDLEWARE) {
    console.log("🔥 API SERVER MODE (Frontend runs separately on port 3000)");
  } else {
    console.log("🔥 USING STATIC FILES");
    serveStatic(app);
  }
  
  // Register object routes after Vite middleware to prevent conflicts
  registerObjectRoutes(app);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: process.env.NODE_ENV === 'production' ? "0.0.0.0" : "127.0.0.1",
  }, () => {
    log(`serving on port ${port}`);
  });

  // Graceful shutdown handling to prevent port conflicts
  const handleShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    server.close((err) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.log('⚡ Force shutting down...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
})();
