/**
 * Admin API routes for unit management (US-010, US-011).
 *
 * Merges unit data from dashboard API (port 5000) with custom user entries.
 * Cache refreshes every 5 minutes; custom entries stored in data/custom-units.json.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { getUnitList, addCustomUnit, forceRefresh } from '../../lib/unit-cache.js';

const router = Router();

// GET /units -- merged list of unit numbers + custom units
router.get('/units', async (_req: Request, res: Response) => {
  try {
    const units = await getUnitList();
    res.json({ units });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get units' });
  }
});

// POST /units/custom -- add a custom unit entry
router.post('/units/custom', (req: Request, res: Response) => {
  const { unit } = req.body;
  if (!unit || typeof unit !== 'string' || !unit.trim()) {
    res.status(400).json({ error: 'unit (string) required' });
    return;
  }
  const units = addCustomUnit(unit);
  res.json({ units });
});

// POST /units/refresh -- force refresh cache from dashboard API
router.post('/units/refresh', async (_req: Request, res: Response) => {
  try {
    const units = await forceRefresh();
    res.json({ units, refreshed: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Refresh failed' });
  }
});

export default router;
