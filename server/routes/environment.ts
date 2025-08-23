import { Router } from "express";
import { getEnvironmentConfig } from "../../shared/utils.js";

const router = Router();

// Get current environment configuration
router.get("/api/environment/config", (req, res) => {
  try {
    const config = getEnvironmentConfig();
    
    // Add server-side environment variables for status checking
    const envVars = {
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
