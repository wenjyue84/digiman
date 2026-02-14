import { Router } from 'express';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { logoutWhatsApp, whatsappManager } from '../../lib/baileys-client.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';

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

export default router;
