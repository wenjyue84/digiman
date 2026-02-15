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

// PERMANENT FIX: Prevent browser caching of all admin API responses
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
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
