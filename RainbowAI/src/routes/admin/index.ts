import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

import knowledgeBaseRoutes from './knowledge-base.js';
import memoryRoutes from './memory.js';
import configRoutes from './config.js';
import testingRoutes from './testing.js';
import conversationsRoutes from './conversations.js';
import whatsappRoutes from './whatsapp.js';
import metricsRoutes from './metrics.js';
import intentManagerRoutes from './intent-manager.js';
import feedbackRoutes from './feedback.js';
import feedbackSettingsRoutes from './feedback-settings.js';
import intentAnalyticsRoutes from './intent-analytics.js';
import templatesRoutes from './templates.js';
import activityRoutes from './activity.js';
import adminNotificationsRoutes from './admin-notifications.js';
import checkinNotifyRoutes from './checkin-notify.js';
import prismaBotRoutes from './prisma-bot.js';
import tagsRoutes from './tags.js';
import capsulesRoutes from './capsules.js';
import customMessagesRoutes from './custom-messages.js';
import scheduledMessagesRoutes from './scheduled-messages.js';
import paymentRemindersRoutes from './payment-reminders.js';
import latencyRoutes from '../test/latency.js';

const router = Router();

// ─── Auth Middleware ─────────────────────────────────────────────────
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) {
    next();
    return;
  }
  const adminKey = process.env.RAINBOW_ADMIN_KEY;
  if (!adminKey) {
    next();
    return;
  }
  const provided = req.headers['x-admin-key'];
  if (provided === adminKey) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
}

router.use(adminAuth);

// ─── Selective Cache Headers ─────────────────────────────────────────
// Stable endpoints (config/definitions that rarely change) — 60s cache
const STABLE_PATHS = [
  '/settings', '/templates', '/intents', '/routing',
  '/knowledge-base', '/knowledge', '/workflows', '/workflow',
  '/intent-manager/keywords', '/intent-manager/examples',
  '/intent-manager/tiers', '/intent-manager/llm-settings',
];
// Semi-stable endpoints (aggregated stats, refresh every 30s)
const SEMI_STABLE_PATHS = [
  '/feedback/stats', '/intent/accuracy',
  '/conversations/stats', '/intent-manager/stats',
];

router.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  // Only cache GET requests; all mutations remain uncacheable
  if (req.method === 'GET' && STABLE_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
    res.setHeader('Cache-Control', 'public, max-age=60');
  } else if (req.method === 'GET' && SEMI_STABLE_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
    res.setHeader('Cache-Control', 'public, max-age=30');
  } else {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// ─── Mount Sub-Routers ──────────────────────────────────────────────
router.use(knowledgeBaseRoutes);
router.use(memoryRoutes);
router.use(configRoutes);
router.use(testingRoutes);
router.use(conversationsRoutes);
router.use(whatsappRoutes);
router.use(metricsRoutes);
router.use(intentManagerRoutes);
router.use(feedbackRoutes);
router.use(feedbackSettingsRoutes);
router.use(intentAnalyticsRoutes);
router.use('/templates', templatesRoutes);
router.use(activityRoutes);
router.use('/admin-notifications', adminNotificationsRoutes);
router.use(checkinNotifyRoutes);
router.use(prismaBotRoutes);
router.use(tagsRoutes);
router.use(capsulesRoutes);
router.use(customMessagesRoutes);
router.use(scheduledMessagesRoutes);
router.use(paymentRemindersRoutes);
router.use('/test', latencyRoutes);

// Ensure unmatched /api/rainbow/* returns JSON 404 (never HTML)
router.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: _req.path });
});

// API error handler: always respond with JSON (never HTML)
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  const message = err?.message || String(err);
  res.status(500).json({ error: message });
});

export default router;
