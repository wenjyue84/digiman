import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { listConversations, getConversation, deleteConversation, getResponseTimeStats, getContactDetails, updateContactDetails, togglePin, toggleFavourite, markConversationAsRead } from '../../assistant/conversation-logger.js';
import { whatsappManager } from '../../lib/baileys-client.js';
import { translateText } from '../../assistant/ai-client.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

// ─── Response time aggregate (must be before /:phone to avoid matching "stats") ───
router.get('/conversations/stats/response-time', async (_req: Request, res: Response) => {
  try {
    const stats = await getResponseTimeStats();
    res.json({ ok: true, avgResponseTimeMs: stats.avgMs, count: stats.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Conversation History (Real Chat) ─────────────────────────────────

router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const conversations = await listConversations();
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pin & Favourite ─────────────────────────────────────────────────

router.patch('/conversations/:phone/pin', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const pinned = await togglePin(phone);
    res.json({ ok: true, pinned });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/conversations/:phone/favourite', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const favourite = await toggleFavourite(phone);
    res.json({ ok: true, favourite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/conversations/:phone/read', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    await markConversationAsRead(phone);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Contact Details ─────────────────────────────────────────────────

router.get('/conversations/:phone/contact', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const details = await getContactDetails(phone);
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/conversations/:phone/contact', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const allowed = ['name', 'email', 'country', 'language', 'checkIn', 'checkOut', 'unit', 'notes', 'contactStatus', 'paymentStatus', 'tags'];
    const partial: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        partial[key] = req.body[key];
      }
    }
    const updated = await updateContactDetails(phone, partial);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const log = await getConversation(phone);
    if (!log) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const deleted = await deleteConversation(phone);
    res.json({ ok: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send manual message to guest
router.post('/conversations/:phone/send', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message, instanceId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message (string) required' });
      return;
    }

    const log = await getConversation(phone);
    const pushName = log?.pushName || 'Guest';

    let targetInstanceId = instanceId;
    if (instanceId) {
      const status = whatsappManager.getInstanceStatus(instanceId);
      if (!status || status.state !== 'open') {
        console.warn(`[Admin] Instance "${instanceId}" not connected, finding fallback...`);
        const instances = whatsappManager.getAllStatuses();
        const connectedInstance = instances.find(i => i.state === 'open');
        if (connectedInstance) {
          targetInstanceId = connectedInstance.id;
          console.log(`[Admin] Using fallback instance: ${targetInstanceId}`);
        } else {
          res.status(503).json({ error: 'No WhatsApp instances connected. Please check WhatsApp connection.' });
          return;
        }
      }
    }

    const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, message, targetInstanceId);

    const { logMessage } = await import('../../assistant/conversation-logger.js');
    await logMessage(phone, pushName, 'assistant', message, { manual: true, instanceId: targetInstanceId });

    console.log(`[Admin] Manual message sent to ${phone} via ${targetInstanceId || 'default'}: ${message.substring(0, 50)}...`);
    res.json({ ok: true, message: 'Message sent successfully', usedInstance: targetInstanceId });
  } catch (err: any) {
    console.error('[Admin] Failed to send manual message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send media (image/video/document) to guest
router.post('/conversations/:phone/send-media', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const file = req.file;
    const caption = req.body.caption || '';
    const instanceId = req.body.instanceId;

    if (!file) {
      res.status(400).json({ error: 'file required (multipart/form-data)' });
      return;
    }

    const log = await getConversation(phone);
    const pushName = log?.pushName || 'Guest';

    // Find connected instance (same logic as send text)
    let targetInstanceId = instanceId;
    if (instanceId) {
      const status = whatsappManager.getInstanceStatus(instanceId);
      if (!status || status.state !== 'open') {
        const instances = whatsappManager.getAllStatuses();
        const connectedInstance = instances.find(i => i.state === 'open');
        if (connectedInstance) {
          targetInstanceId = connectedInstance.id;
        } else {
          res.status(503).json({ error: 'No WhatsApp instances connected.' });
          return;
        }
      }
    }

    const { sendWhatsAppMedia } = await import('../../lib/baileys-client.js');
    await sendWhatsAppMedia(phone, file.buffer, file.mimetype, file.originalname, caption || undefined, targetInstanceId);

    // Log a placeholder message so it shows in conversation history
    const mediaType = file.mimetype.startsWith('image/') ? 'photo' : file.mimetype.startsWith('video/') ? 'video' : 'document';
    const logText = caption
      ? `[${mediaType}: ${file.originalname}] ${caption}`
      : `[${mediaType}: ${file.originalname}]`;

    const { logMessage } = await import('../../assistant/conversation-logger.js');
    await logMessage(phone, pushName, 'assistant', logText, { manual: true, instanceId: targetInstanceId });

    console.log(`[Admin] Sent ${mediaType} to ${phone}: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`);
    res.json({ ok: true, mediaType, fileName: file.originalname, size: file.size });
  } catch (err: any) {
    console.error('[Admin] Failed to send media:', err);
    res.status(500).json({ error: err.message });
  }
});

// Translate text to target language
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text (string) required' });
      return;
    }

    if (!targetLang || typeof targetLang !== 'string') {
      res.status(400).json({ error: 'targetLang (string) required' });
      return;
    }

    const langMap: Record<string, string> = {
      'en': 'English',
      'ms': 'Malay',
      'zh': 'Chinese',
      'id': 'Indonesian',
      'th': 'Thai',
      'vi': 'Vietnamese'
    };

    const sourceLang = 'auto';
    const targetLangName = langMap[targetLang] || targetLang;

    const translated = await translateText(text, sourceLang, targetLangName);

    if (!translated) {
      res.status(500).json({ error: 'Translation failed' });
      return;
    }

    console.log(`[Admin] Translated text to ${targetLangName}: ${text.substring(0, 50)}... -> ${translated.substring(0, 50)}...`);
    res.json({ translated, targetLang });
  } catch (err: any) {
    console.error('[Admin] Translation error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
