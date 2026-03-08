import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { listConversations, getConversation, deleteConversation, getResponseTimeStats, togglePin, toggleFavourite, markConversationAsRead, updateConversationMode } from '../../assistant/conversation-logger.js';
import { whatsappManager } from '../../lib/baileys-client.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';
import contactsRouter from './conversations-contacts.js';
import sseRouter from './conversations-sse.js';

// ─── Message Metadata Store (pin/star per message) ────────────────────
interface MessageMetadata {
  pinned: Record<string, string[]>;   // phone -> array of message indices (as strings)
  starred: Record<string, string[]>;  // phone -> array of message indices (as strings)
}

const METADATA_PATH = path.join(process.cwd(), 'data', 'message-metadata.json');

function loadMetadata(): MessageMetadata {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Metadata] Failed to load message-metadata.json, using empty:', (err as Error).message);
  }
  return { pinned: {}, starred: {} };
}

function saveMetadata(data: MessageMetadata): void {
  const dir = path.dirname(METADATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = METADATA_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, METADATA_PATH);
}

let metadata: MessageMetadata = loadMetadata();

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

// ─── Mount sub-routers (contacts, SSE/translate) ─────────────────────
router.use(contactsRouter);
router.use(sseRouter);

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

router.post('/conversations/:phone/clear', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { clearConversationMessages } = await import('../../assistant/conversation-logger.js');
    await clearConversationMessages(phone);
    ok(res, { cleared: true });
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Message-Level Pin & Star ─────────────────────────────────────────

// Get pinned/starred message indices for a conversation
router.get('/conversations/:phone/message-metadata', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const pinned = metadata.pinned[phone] || [];
    const starred = metadata.starred[phone] || [];
    res.json({ pinned, starred });
  } catch (err: any) {
    serverError(res, err);
  }
});

// Toggle pin on a specific message
router.post('/conversations/:phone/messages/:msgIdx/pin', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const msgIdx = req.params.msgIdx;

    if (!metadata.pinned[phone]) metadata.pinned[phone] = [];
    const arr = metadata.pinned[phone];
    const idx = arr.indexOf(msgIdx);
    if (idx >= 0) {
      arr.splice(idx, 1);
      saveMetadata(metadata);
      ok(res, { pinned: false, msgIdx });
    } else {
      arr.push(msgIdx);
      saveMetadata(metadata);
      ok(res, { pinned: true, msgIdx });
    }
  } catch (err: any) {
    serverError(res, err);
  }
});

// Toggle star on a specific message
router.post('/conversations/:phone/messages/:msgIdx/star', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const msgIdx = req.params.msgIdx;

    if (!metadata.starred[phone]) metadata.starred[phone] = [];
    const arr = metadata.starred[phone];
    const idx = arr.indexOf(msgIdx);
    if (idx >= 0) {
      arr.splice(idx, 1);
      saveMetadata(metadata);
      ok(res, { starred: false, msgIdx });
    } else {
      arr.push(msgIdx);
      saveMetadata(metadata);
      ok(res, { starred: true, msgIdx });
    }
  } catch (err: any) {
    serverError(res, err);
  }
});

// Send a reaction to a message via WhatsApp
router.post('/conversations/:phone/messages/:msgIdx/react', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { emoji, instanceId } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      badRequest(res, 'emoji (string) required');
      return;
    }

    // Reactions are best-effort via WhatsApp — we log success regardless
    // In a full implementation, we'd look up the actual WhatsApp message key
    // For now, we acknowledge the reaction in the dashboard
    console.log(`[Admin] Reaction ${emoji} on message ${req.params.msgIdx} for ${phone}`);
    ok(res, { emoji, msgIdx: req.params.msgIdx });
  } catch (err: any) {
    serverError(res, err);
  }
});

// Send manual message to guest
router.post('/conversations/:phone/send', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message, instanceId, staffName } = req.body;

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

    const senderName = (typeof staffName === 'string' && staffName.trim()) ? staffName.trim() : 'Staff';
    const { logMessage } = await import('../../assistant/conversation-logger.js');
    await logMessage(phone, pushName, 'assistant', message, { manual: true, instanceId: targetInstanceId, staffName: senderName });

    console.log(`[Admin] Manual message sent by ${senderName} to ${phone} via ${targetInstanceId || 'default'}: ${message.substring(0, 50)}...`);
    ok(res, { message: 'Message sent successfully', usedInstance: targetInstanceId, staffName: senderName });
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

// Trigger a workflow for a specific contact (US-016: // command palette)
router.post('/conversations/:phone/trigger-workflow', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { workflowId, instanceId, staffName } = req.body;

    if (!workflowId || typeof workflowId !== 'string') {
      badRequest(res, 'workflowId (string) required');
      return;
    }

    // Load workflow definition
    const { configStore } = await import('../../assistant/config-store.js');
    const workflows = configStore.getWorkflows();
    const workflow = workflows.workflows.find((w: any) => w.id === workflowId);
    if (!workflow) {
      notFound(res, `Workflow "${workflowId}"`);
      return;
    }

    // Create workflow state and execute first step
    const { createWorkflowState, executeWorkflowStep } = await import('../../assistant/workflow-executor.js');
    const { updateWorkflowState } = await import('../../assistant/conversation-logger.js');

    const log = await getConversation(phone);
    const pushName = log?.pushName || 'Guest';

    // Resolve connected WhatsApp instance
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

    const workflowState = createWorkflowState(workflowId);
    const result = await executeWorkflowStep(workflowState, null, {
      language: 'en',
      phone,
      pushName,
      instanceId: targetInstanceId,
    });

    // Send the first workflow message
    if (result.response) {
      const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
      await sendWhatsAppMessage(phone, result.response, targetInstanceId);

      const senderName = (typeof staffName === 'string' && staffName.trim()) ? staffName.trim() : 'Staff';
      const { logMessage } = await import('../../assistant/conversation-logger.js');
      await logMessage(phone, pushName, 'assistant', result.response, {
        manual: false,
        instanceId: targetInstanceId,
        staffName: senderName,
        workflowId,
      });
    }

    // Store workflow state so subsequent replies continue the workflow
    if (result.newState) {
      updateWorkflowState(phone, result.newState);
    }

    const sn = (typeof staffName === 'string' && staffName.trim()) ? staffName.trim() : 'Staff';
    console.log(`[Admin] Workflow "${workflow.name}" triggered by ${sn} for ${phone}`);
    ok(res, {
      workflowId,
      workflowName: workflow.name,
      firstMessage: result.response,
      hasMoreSteps: !!result.newState,
    });
  } catch (err: any) {
    console.error('[Admin] Failed to trigger workflow:', err);
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

// US-090: Generate AI notes summary from conversation
router.post('/conversations/:phone/generate-notes', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const log = await getConversation(phone);
    if (!log || !log.messages || log.messages.length === 0) {
      badRequest(res, 'No messages to summarize');
      return;
    }

    // Take last 20 messages
    const recentMessages = log.messages.slice(-20);
    const transcript = recentMessages.map((m: any) => {
      const role = m.role === 'user' ? 'Guest' : 'AI';
      return `${role}: ${m.content}`;
    }).join('\n');

    const { chatWithFallback } = await import('../../assistant/ai-provider-manager.js');

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a hotel staff assistant. Summarize the following guest conversation in 2-5 sentences. Focus on: guest preferences, specific requests, issues raised, overall mood, and any important details staff should know. Be concise and practical.'
      },
      {
        role: 'user' as const,
        content: `Summarize this conversation:\n\n${transcript}`
      }
    ];

    const { content } = await chatWithFallback(messages, 600, 0.5);

    if (!content) {
      serverError(res, 'AI generation failed');
      return;
    }

    console.log(`[Admin] Generated AI notes for ${phone}`);
    res.json({ notes: content.trim() });
  } catch (err: any) {
    console.error('[Admin] AI notes generation failed:', err);
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
