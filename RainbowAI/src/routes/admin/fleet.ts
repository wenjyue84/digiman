import { Router } from 'express';
import type { Request, Response } from 'express';
import { spawn } from 'child_process';

const router = Router();

/**
 * POST /api/rainbow/fleet/restart
 *
 * Restart a PM2 process on this Lightsail instance.
 * Each instance only allows restarting its own processes, controlled by
 * the FLEET_ALLOWED_PROCESSES env var (comma-separated PM2 process names).
 *
 * Called by Fleet Manager dashboard (localhost:9999) via X-Admin-Key auth.
 *
 * Env on digiman Lightsail: FLEET_ALLOWED_PROCESSES=rainbow-ai,digiman-api,pelangi-api
 * Env on Southern Lightsail: FLEET_ALLOWED_PROCESSES=southern-rainbow,southern-api
 */
router.post('/fleet/restart', (req: Request, res: Response) => {
  const { process: procName } = req.body as { process?: string };

  if (!procName || typeof procName !== 'string') {
    res.status(400).json({ error: 'Missing required field: process' });
    return;
  }

  const allowedEnv = process.env.FLEET_ALLOWED_PROCESSES || 'rainbow-ai,digiman-api,pelangi-api';
  const allowed = allowedEnv.split(',').map(p => p.trim()).filter(Boolean);

  if (!allowed.includes(procName)) {
    res.status(403).json({
      error: `Process '${procName}' not allowed on this instance`,
      allowed,
    });
    return;
  }

  const child = spawn('pm2', ['restart', procName], { stdio: 'ignore', shell: false });

  child.on('close', (code) => {
    if (code === 0) {
      res.json({ ok: true, process: procName, timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ ok: false, process: procName, exitCode: code });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, process: procName, error: err.message });
  });
});

export default router;
