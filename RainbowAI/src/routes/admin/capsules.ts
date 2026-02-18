/**
 * Admin API routes for capsule/unit management (US-010).
 *
 * Merges capsule data from dashboard API (port 5000) with custom user entries.
 * Cache refreshes every 5 minutes; custom entries stored in data/custom-units.json.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { getCapsuleUnits, addCustomUnit, forceRefresh } from '../../lib/capsule-cache.js';

const router = Router();

// GET /capsules — merged list of capsule numbers + custom units
router.get('/capsules', async (_req: Request, res: Response) => {
  try {
    const units = await getCapsuleUnits();
    res.json({ units });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get capsule units' });
  }
});

// POST /capsules/custom — add a custom unit entry
router.post('/capsules/custom', (req: Request, res: Response) => {
  const { unit } = req.body;
  if (!unit || typeof unit !== 'string' || !unit.trim()) {
    res.status(400).json({ error: 'unit (string) required' });
    return;
  }
  const units = addCustomUnit(unit);
  res.json({ units });
});

// POST /capsules/refresh — force refresh cache from dashboard API
router.post('/capsules/refresh', async (_req: Request, res: Response) => {
  try {
    const units = await forceRefresh();
    res.json({ units, refreshed: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Refresh failed' });
  }
});

export default router;
