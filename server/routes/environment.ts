import { Router } from "express";
import { getEnvironmentConfig } from "../../shared/utils.js";
import { authenticateToken } from "./middleware/auth";

const router = Router();

/** Mask sensitive env var values — show '[SET]' or '[NOT SET]' only */
function maskSensitive(key: string, value: string | undefined): string | undefined {
  const sensitivePatterns = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN'];
  const sensitiveKeys = ['DATABASE_URL', 'PRIVATE_DATABASE_URL'];
  const upperKey = key.toUpperCase();
  if (sensitiveKeys.includes(key) || sensitivePatterns.some(p => upperKey.includes(p))) {
    return value ? '[SET]' : '[NOT SET]';
  }
  return value;
}

// Get current environment configuration
router.get("/api/environment/config", authenticateToken, (req, res) => {
  try {
    const config = getEnvironmentConfig();

    // Add server-side environment variables for status checking
    const rawVars: Record<string, string | undefined> = {
      DATABASE_URL: process.env.DATABASE_URL,
      PRIVATE_DATABASE_URL: process.env.PRIVATE_DATABASE_URL,
      PRIVATE_OBJECT_DIR: process.env.PRIVATE_OBJECT_DIR,
      DEFAULT_OBJECT_STORAGE_BUCKET_ID: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID,
      PUBLIC_OBJECT_SEARCH_PATHS: process.env.PUBLIC_OBJECT_SEARCH_PATHS,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      REPL_ID: process.env.REPL_ID,
      REPL_SLUG: process.env.REPL_SLUG
    };

    const envVars: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      envVars[key] = maskSensitive(key, value);
    }

    res.json({
      ...config,
      envVars,
      serverTime: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error("Failed to get environment config:", error);
    res.status(500).json({
      error: "Failed to get environment configuration",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
