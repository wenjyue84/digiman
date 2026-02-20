import { Router } from 'express';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { logoutWhatsApp, whatsappManager } from '../../lib/baileys-client.js';
import { getAvatarFilePath, ensureAvatar } from '../../lib/whatsapp/avatar-cache.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';
import { failoverCoordinator } from '../../lib/failover-coordinator.js';

const router = Router();

// ─── WhatsApp ───────────────────────────────────────────────────────

router.post('/whatsapp/logout', async (_req: Request, res: Response) => {
  try {
    await logoutWhatsApp();
    ok(res, { message: 'WhatsApp session logged out' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// ─── WhatsApp Instance Management ───────────────────────────────────

router.get('/whatsapp/instances', (_req: Request, res: Response) => {
  res.json(whatsappManager.getAllStatuses());
});

router.post('/whatsapp/instances', async (req: Request, res: Response) => {
  const { id, label } = req.body;
  if (!id || typeof id !== 'string') {
    badRequest(res, 'id (phone number or slug) is required');
    return;
  }
  if (!label || typeof label !== 'string') {
    badRequest(res, 'label is required');
    return;
  }
  const trimId = id.trim();
  const trimLabel = label.trim();
  if (trimId.length < 2 || trimId.length > 20) {
    badRequest(res, 'Instance ID must be 2-20 characters');
    return;
  }
  try {
    const status = await whatsappManager.addInstance(trimId, trimLabel);
    ok(res, { instance: status });
  } catch (e: any) {
    badRequest(res, e.message);
  }
});

router.patch('/whatsapp/instances/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  if (label === undefined || typeof label !== 'string') {
    badRequest(res, 'label (string) is required');
    return;
  }
  try {
    const status = whatsappManager.updateInstanceLabel(req.params.id, label.trim());
    ok(res, { instance: status });
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      notFound(res, 'Instance');
    } else {
      badRequest(res, e.message);
    }
  }
});

router.delete('/whatsapp/instances/:id', async (req: Request, res: Response) => {
  try {
    await whatsappManager.removeInstance(req.params.id);
    ok(res, { message: `Instance "${req.params.id}" removed` });
  } catch (e: any) {
    badRequest(res, e.message);
  }
});

router.post('/whatsapp/instances/:id/logout', async (req: Request, res: Response) => {
  try {
    await whatsappManager.logoutInstance(req.params.id);
    ok(res, { message: `Instance "${req.params.id}" logged out` });
  } catch (e: any) {
    badRequest(res, e.message);
  }
});

router.get('/whatsapp/instances/:id/qr', async (req: Request, res: Response) => {
  try {
    const status = whatsappManager.getInstanceStatus(req.params.id);
    if (!status) {
      notFound(res, `Instance "${req.params.id}"`);
      return;
    }
    let qrDataUrl: string | null = null;
    if (status.qr) {
      qrDataUrl = await QRCode.toDataURL(status.qr);
    }
    res.json({
      id: status.id,
      state: status.state,
      qr: status.qr,
      qrDataUrl
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// ─── WhatsApp Avatar ─────────────────────────────────────────────────

router.get('/whatsapp/avatar/:phone', async (req: Request, res: Response) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '');
  if (!phone) { res.status(400).end(); return; }

  // Check cache first (fast path)
  let filePath = getAvatarFilePath(phone);
  if (filePath) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
    return;
  }

  // Await fetch with timeout so avatars appear on first load
  try {
    await Promise.race([
      ensureAvatar(phone),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  } catch { /* ignore */ }

  filePath = getAvatarFilePath(phone);
  if (filePath) {
    res.set('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
  } else {
    res.status(404).end();
  }
});

// ─── Failover coordination endpoints ────────────────────────────────

/**
 * POST /whatsapp/heartbeat
 * Called by the primary server every heartbeatIntervalMs to signal it is alive.
 * The standby server listens on this endpoint.
 */
router.post('/whatsapp/heartbeat', (req: Request, res: Response) => {
  const secret = process.env.RAINBOW_FAILOVER_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== secret) {
      res.status(401).json({ error: 'Unauthorized — invalid heartbeat secret' });
      return;
    }
  }

  failoverCoordinator.receiveHeartbeat();
  const status = failoverCoordinator.getStatus();
  ok(res, {
    received: true,
    standbyRole: status.role,
    isActive: status.isActive,
  });
});

/**
 * GET /whatsapp/failover/status
 * Returns current failover coordinator status (role, isActive, last heartbeat, etc.)
 */
router.get('/whatsapp/failover/status', (_req: Request, res: Response) => {
  ok(res, failoverCoordinator.getStatus());
});

/**
 * POST /whatsapp/failover/promote
 * Manually force this server to become active.
 */
router.post('/whatsapp/failover/promote', (_req: Request, res: Response) => {
  failoverCoordinator.promote();
  ok(res, { ok: true, isActive: true });
});

/**
 * POST /whatsapp/failover/demote
 * Manually force this server to become inactive (suppress replies).
 */
router.post('/whatsapp/failover/demote', (_req: Request, res: Response) => {
  failoverCoordinator.demote();
  ok(res, { ok: true, isActive: false });
});

/**
 * POST /whatsapp/failover/force-standby
 * Toggle force-standby mode: stops heartbeats so Lightsail takes over,
 * even when this local PC has no connectivity issues.
 * Body: { enabled: boolean }
 */
router.post('/whatsapp/failover/force-standby', (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled (boolean) required' });
    return;
  }
  if (enabled) {
    failoverCoordinator.forceStandby();
  } else {
    failoverCoordinator.resumePrimary();
  }
  ok(res, { ok: true, forcedStandby: enabled, isActive: failoverCoordinator.isActive() });
});

export default router;
