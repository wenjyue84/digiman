import { Router } from 'express';
import type { Request, Response } from 'express';
import { whatsappManager } from '../../lib/baileys-client.js';
import { translateText } from '../../assistant/ai-client.js';
import { activityTracker } from '../../lib/activity-tracker.js';
import { serverError, badRequest } from './http-utils.js';
import type { ActivityEvent } from '../../lib/activity-tracker.js';

const router = Router();

// ─── SSE: Real-time conversation update stream (US-159) ──────────────

router.get('/conversations/events', (req: Request, res: Response) => {
  // Set SSE headers (same pattern as activity stream)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })}\n\n`);

  // Keep-alive heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  // Listen for activity events that indicate conversation changes
  const onActivity = (event: ActivityEvent) => {
    const phone = event.metadata?.phone;
    if (!phone) return;

    // Only forward conversation-relevant events
    if (event.type === 'message_received' || event.type === 'response_sent'
        || event.type === 'workflow_started' || event.type === 'booking_started'
        || event.type === 'escalation') {
      res.write(`event: conversation_update\ndata: ${JSON.stringify({
        phone,
        type: event.type,
        timestamp: event.timestamp,
      })}\n\n`);
    }
  };

  activityTracker.on('activity', onActivity);

  // Forward message status (read receipts, US-017) via SSE
  const onMessageStatus = (event: any) => {
    res.write(`event: message_status\ndata: ${JSON.stringify({
      phone: event.phone,
      messageId: event.messageId,
      status: event.status,
    })}\n\n`);
  };
  whatsappManager.on('message_status', onMessageStatus);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    activityTracker.removeListener('activity', onActivity);
    whatsappManager.removeListener('message_status', onMessageStatus);
  });
});

// ─── Translate text to target language ───────────────────────────────

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

export default router;
