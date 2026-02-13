import { Router } from 'express';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import { logoutWhatsApp, whatsappManager } from '../../lib/baileys-client.js';

const router = Router();

// ─── WhatsApp ───────────────────────────────────────────────────────

router.post('/whatsapp/logout', async (_req: Request, res: Response) => {
  try {
    await logoutWhatsApp();
    res.json({ ok: true, message: 'WhatsApp session logged out' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WhatsApp Instance Management ───────────────────────────────────

router.get('/whatsapp/instances', (_req: Request, res: Response) => {
  res.json(whatsappManager.getAllStatuses());
});

router.post('/whatsapp/instances', async (req: Request, res: Response) => {
  const { id, label } = req.body;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'id (phone number or slug) is required' });
    return;
  }
  if (!label || typeof label !== 'string') {
    res.status(400).json({ error: 'label is required' });
    return;
  }
  const trimId = id.trim();
  const trimLabel = label.trim();
  if (trimId.length < 2 || trimId.length > 20) {
    res.status(400).json({ error: 'Instance ID must be 2-20 characters' });
    return;
  }
  try {
    const status = await whatsappManager.addInstance(trimId, trimLabel);
    res.json({ ok: true, instance: status });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/whatsapp/instances/:id', (req: Request, res: Response) => {
  const { label } = req.body;
  if (label === undefined || typeof label !== 'string') {
    res.status(400).json({ error: 'label (string) is required' });
    return;
  }
  try {
    const status = whatsappManager.updateInstanceLabel(req.params.id, label.trim());
    res.json({ ok: true, instance: status });
  } catch (e: any) {
    res.status(e.message?.includes('not found') ? 404 : 400).json({ error: e.message });
  }
});

router.delete('/whatsapp/instances/:id', async (req: Request, res: Response) => {
  try {
    await whatsappManager.removeInstance(req.params.id);
    res.json({ ok: true, message: `Instance "${req.params.id}" removed` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/whatsapp/instances/:id/logout', async (req: Request, res: Response) => {
  try {
    await whatsappManager.logoutInstance(req.params.id);
    res.json({ ok: true, message: `Instance "${req.params.id}" logged out` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/whatsapp/instances/:id/qr', async (req: Request, res: Response) => {
  try {
    const status = whatsappManager.getInstanceStatus(req.params.id);
    if (!status) {
      res.status(404).json({ error: `Instance "${req.params.id}" not found` });
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
    res.status(500).json({ error: e.message });
  }
});

export default router;
