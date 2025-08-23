import { Router } from "express";
import { getDatabaseConfig, setDatabaseType, DATABASE_CONFIGS, DatabaseType } from "../lib/databaseConfig.js";
import { resetStorage } from "../Storage/StorageFactory.js";

const router = Router();

// Get current database configuration
router.get("/api/database/config", (req, res) => {
  const config = getDatabaseConfig();
  res.json({
    current: config,
    available: Object.values(DATABASE_CONFIGS),
  });
});

// Switch database type (requires restart)
router.post("/api/database/switch", (req, res) => {
  const { type } = req.body;
  
  if (!type || !DATABASE_CONFIGS[type as DatabaseType]) {
    return res.status(400).json({ 
      error: "Invalid database type. Must be one of: memory, docker, replit" 
    });
  }
  
  try {
    setDatabaseType(type as DatabaseType);
    
    // Reset storage to force reinitialization with new database
    resetStorage();
    
    res.json({ 
      success: true, 
      message: `Database switched to ${DATABASE_CONFIGS[type as DatabaseType].label}. Changes take effect immediately.`,
      config: DATABASE_CONFIGS[type as DatabaseType],
      restartRequired: false // No longer needed since we reset storage dynamically
    });
  } catch (error) {
    console.error("Failed to switch database:", error);
    res.status(500).json({ 
      error: "Failed to switch database type" 
    });
  }
});

export default router;