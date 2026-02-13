import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./server/routes";
import { registerObjectRoutes } from "./server/routes/index";
import { serveStatic, log } from "./server/vite";
import { initializeConfig, AppConfig, getConfig, getConfigUtils } from "./server/configManager";
import { storage } from "./server/storage";

const app = express();

// Increase body size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS configuration - allow Vercel deployment
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
    if (!origin) return callback(null, true);

    // Allow localhost (local Rainbow AI)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow production Vercel URL (same origin for frontend)
    const allowedOrigins = [
      'https://pelangi-manager.vercel.app',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.PRODUCTION_URL || ''
    ].filter(Boolean);

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('CORS check:', { origin, allowedOrigins });
    }

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

// Initialize the app
let initialized = false;

async function initializeApp() {
  if (initialized) return;

  try {
    // Initialize configuration system
    await initializeConfig(storage);
    AppConfig.initialize(getConfig(), getConfigUtils());

    // Seed default staff users
    try {
      const existing = await storage.getAllUsers();
      const ensureAdminUser = async (username: string, password: string) => {
        const found = existing.find(u => u.username === username || u.email === "admin@pelangi.com");
        if (!found) {
          await storage.createUser({
            email: "admin@pelangi.com",
            username,
            password,
            role: "admin",
          } as any);
        }
      };

      await ensureAdminUser("admin", "admin123");
    } catch (e) {
      console.warn("Warning: could not seed default users:", e);
    }

    // Health check endpoint
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

    // Register routes
    await registerRoutes(app);

    // Serve static files (built frontend)
    serveStatic(app);

    // Register object routes
    registerObjectRoutes(app);

    // Error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || "Internal Server Error";

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

    initialized = true;
  } catch (error) {
    console.error("Failed to initialize app:", error);
    throw error;
  }
}

// Initialize on first request
app.use(async (req, res, next) => {
  if (!initialized) {
    await initializeApp();
  }
  next();
});

// Export for Vercel serverless function
export default app;
