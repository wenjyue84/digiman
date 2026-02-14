import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { listConversations, getConversation, deleteConversation, getResponseTimeStats, getContactDetails, updateContactDetails, togglePin, toggleFavourite, markConversationAsRead, updateConversationMode } from '../../assistant/conversation-logger.js';
import { whatsappManager } from '../../lib/baileys-client.js';
import { translateText } from '../../assistant/ai-client.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

// ─── Response time aggregate (must be before /:phone to avoid matching "stats") ───
router.get('/conversations/stats/response-time', async (_req: Request, res: Response) => {
  try {
    const stats = await getResponseTimeStats();
    ok(res, { avgResponseTimeMs: stats.avgMs, count: stats.count });
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Conversation History (Real Chat) ─────────────────────────────────

router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const conversations = await listConversations();
    res.json(conversations);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Pin & Favourite ─────────────────────────────────────────────────

router.patch('/conversations/:phone/pin', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const pinned = await togglePin(phone);
    ok(res, { pinned });
  } catch (err: any) {
    serverError(res, err);
  }
});

router.patch('/conversations/:phone/favourite', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const favourite = await toggleFavourite(phone);
    ok(res, { favourite });
  } catch (err: any) {
    serverError(res, err);
  }
});

router.patch('/conversations/:phone/read', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    await markConversationAsRead(phone);
    ok(res);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Contact Details ─────────────────────────────────────────────────

router.get('/conversations/:phone/contact', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const details = await getContactDetails(phone);
    res.json(details);
  } catch (err: any) {
    serverError(res, err);
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
    serverError(res, err);
  }
});

router.get('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const log = await getConversation(phone);
    if (!log) {
      notFound(res, 'Conversation');
      return;
    }
    res.json(log);
  } catch (err: any) {
    serverError(res, err);
  }
});

router.delete('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const deleted = await deleteConversation(phone);
    res.json({ ok: deleted });
  } catch (err: any) {
    serverError(res, err);
  }
});

// Send manual message to guest
router.post('/conversations/:phone/send', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message, instanceId } = req.body;

    if (!message || typeof message !== 'string') {
      badRequest(res, 'message (string) required');
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
    ok(res, { message: 'Message sent successfully', usedInstance: targetInstanceId });
  } catch (err: any) {
    console.error('[Admin] Failed to send manual message:', err);
    serverError(res, err);
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
      badRequest(res, 'file required (multipart/form-data)');
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
    ok(res, { mediaType, fileName: file.originalname, size: file.size });
  } catch (err: any) {
    console.error('[Admin] Failed to send media:', err);
    serverError(res, err);
  }
});

// Translate text to target language
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || typeof text !== 'string') {
      badRequest(res, 'text (string) required');
      return;
    }

    if (!targetLang || typeof targetLang !== 'string') {
      badRequest(res, 'targetLang (string) required');
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
      serverError(res, 'Translation failed');
      return;
    }

    console.log(`[Admin] Translated text to ${targetLangName}: ${text.substring(0, 50)}... -> ${translated.substring(0, 50)}...`);
    res.json({ translated, targetLang });
  } catch (err: any) {
    console.error('[Admin] Translation error:', err);
    serverError(res, err);
  }
});

// ─── RESPONSE MODES (Autopilot/Copilot/Manual) ─────────────────────────

// Get pending approvals for a conversation
router.get('/conversations/:phone/approvals', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { getApprovalsByPhone } = await import('../../assistant/approval-queue.js');
    const approvals = getApprovalsByPhone(phone);
    res.json({ approvals });
  } catch (err: any) {
    serverError(res, err);
  }
});

// Approve and send a queued response
router.post('/conversations/:phone/approvals/:id/approve', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { id } = req.params;
    const { editedResponse } = req.body;

    const { approveAndSend, getApproval } = await import('../../assistant/approval-queue.js');
    const approval = getApproval(id);

    if (!approval) {
      notFound(res, 'Approval');
      return;
    }

    const finalResponse = editedResponse || approval.suggestedResponse;

    // Send to guest
    const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
    const log = await getConversation(phone);
    const instanceId = log?.instanceId;
    await sendWhatsAppMessage(phone, finalResponse, instanceId);

    // Log as sent
    const { logMessage } = await import('../../assistant/conversation-logger.js');
    await logMessage(phone, approval.pushName, 'assistant', finalResponse, {
      manual: false,
      approved_from_queue: true,
      approval_id: id,
      was_edited: !!editedResponse,
      instanceId
    });

    // Remove from queue
    approveAndSend(id, editedResponse);

    console.log(`[Copilot] Approved and sent response for ${phone} (approval: ${id})`);
    ok(res, { sent: finalResponse });
  } catch (err: any) {
    console.error('[Copilot] Approval failed:', err);
    serverError(res, err);
  }
});

// Reject a queued response
router.post('/conversations/:phone/approvals/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectApproval } = await import('../../assistant/approval-queue.js');

    if (!rejectApproval(id)) {
      notFound(res, 'Approval');
      return;
    }

    console.log(`[Copilot] Rejected approval: ${id}`);
    ok(res);
  } catch (err: any) {
    serverError(res, err);
  }
});

// Generate AI suggestion without sending (Manual mode)
router.post('/conversations/:phone/suggest', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { context } = req.body; // Optional: staff can provide context

    const log = await getConversation(phone);
    if (!log) {
      notFound(res, 'Conversation');
      return;
    }

    // Get conversation history
    const { getMessages, getOrCreate } = await import('../../assistant/conversation.js');
    const convo = getOrCreate(phone, log.pushName);
    const messages = getMessages(phone);

    // Get last user message
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMsg) {
      badRequest(res, 'No user message to respond to');
      return;
    }

    // Generate AI suggestion (reuse existing KB + AI logic)
    const { buildChatMessages, callAI } = await import('../../assistant/ai-client.js');
    const { getKnowledgeContext } = await import('../../assistant/knowledge-base.js');
    const { configStore } = await import('../../assistant/config-store.js');

    const settings = configStore.getSettings();
    const kbContext = await getKnowledgeContext(lastUserMsg.content, convo.language);

    // Use manual mode AI provider if configured
    const providerHint = settings.response_modes?.manual?.ai_help_provider;

    const chatMessages = buildChatMessages(
      settings.system_prompt,
      kbContext.context,
      messages.slice(-5), // Last 5 messages
      lastUserMsg.content,
      convo.language,
      context // Staff-provided context
    );

    const result = await callAI(chatMessages, 'chat', providerHint);

    console.log(`[Manual Mode] Generated AI suggestion for ${phone}`);
    res.json({
      suggestion: result.response,
      metadata: {
        provider: result.provider,
        model: result.model,
        kbFiles: kbContext.filesUsed
      }
    });
  } catch (err: any) {
    console.error('[Manual Mode] Suggestion failed:', err);
    serverError(res, err);
  }
});

// Set response mode for a conversation
router.post('/conversations/:phone/mode', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { mode, setAsGlobalDefault } = req.body;

    if (!['autopilot', 'copilot', 'manual'].includes(mode)) {
      badRequest(res, 'Invalid mode. Must be: autopilot, copilot, or manual');
      return;
    }

    // If setting as global default, update settings.json
    if (setAsGlobalDefault) {
      const { configStore } = await import('../../assistant/config-store.js');
      const settings = configStore.getSettings();

      // Ensure settings object exists
      if (!settings) {
        serverError(res, 'Settings not loaded');
        return;
      }

      // Initialize response_modes if it doesn't exist
      if (!settings.response_modes) {
        settings.response_modes = {
          default_mode: mode,
          description: 'Global default response mode: autopilot (AI auto-sends), copilot (AI suggests, staff approves), or manual (staff writes, AI helps on request)',
          copilot: {
            auto_approve_confidence: 0.95,
            auto_approve_intents: ['greeting', 'thanks', 'wifi'],
            queue_timeout_minutes: 30,
            description: 'Auto-approve high-confidence responses for simple intents'
          },
          manual: {
            show_ai_suggestions: true,
            ai_help_provider: 'groq-llama',
            description: "Show AI suggestions when 'Help me' clicked"
          }
        };
      } else {
        settings.response_modes.default_mode = mode;
      }

      configStore.setSettings(settings);
      console.log(`[Mode Change] Set global default to ${mode} mode`);
    }

    // Always update per-conversation mode (in-memory + disk)
    const { getOrCreate, updateSlots } = await import('../../assistant/conversation.js');
    const log = await getConversation(phone);
    const convo = getOrCreate(phone, log?.pushName || 'Guest');

    updateSlots(phone, { responseMode: mode });
    // Persist to disk so mode survives navigation and restarts
    await updateConversationMode(phone, mode);

    console.log(`[Mode Change] Set ${phone} to ${mode} mode${setAsGlobalDefault ? ' (and global default)' : ''}`);
    ok(res, { mode, globalDefaultUpdated: !!setAsGlobalDefault });
  } catch (err: any) {
    serverError(res, err);
  }
});

export default router;
