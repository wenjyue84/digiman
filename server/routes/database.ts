import { Router } from "express";
import { getDatabaseConfig, DATABASE_CONFIGS } from "../lib/databaseConfig.js";
import { asyncRouteHandler } from "../lib/errorHandler";
import { getStorage } from "../Storage/StorageFactory.js";

const router = Router();

// Get current database configuration (read-only)
router.get("/api/database/config", (req, res) => {
  const config = getDatabaseConfig();
  res.json({
    current: config,
    // Note: No more switching available - just display current mode
  });
});

// Lightweight DB connectivity test (no auth — exposes no data)
router.get("/api/database/health", asyncRouteHandler(async (_req: any, res: any) => {
  const storage = await getStorage();
  res.json({ status: "ok", type: storage.constructor.name });
}));

export default router;