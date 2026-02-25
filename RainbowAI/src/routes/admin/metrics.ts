import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import { getWhatsAppStatus, whatsappManager } from '../../lib/baileys-client.js';
import { isAIAvailable } from '../../assistant/ai-client.js';
import { checkServerHealth } from './utils.js';
import { trackConfigReloaded } from '../../lib/activity-tracker.js';
import { ok } from './http-utils.js';
import { getConfigAuditLog } from '../../lib/config-db.js';

const router = Router();

// ─── System ─────────────────────────────────────────────────────────

router.post('/reload', async (_req: Request, res: Response) => {
  await configStore.forceReload();
  trackConfigReloaded('all');
  ok(res, { message: 'All config reloaded (DB-first, then disk)' });
});

/** POST /restart — exit process so a process manager (e.g. start-all.bat, PM2) can restart the MCP server. */
router.post('/restart', (_req: Request, res: Response) => {
  ok(res, { message: 'Restarting MCP server...' });
  setTimeout(() => process.exit(0), 1500);
});

router.get('/status', async (_req: Request, res: Response) => {
  const wa = getWhatsAppStatus();
  const instances = whatsappManager.getAllStatuses();

  const [backendHealth, frontendHealth] = await Promise.all([
    checkServerHealth('http://localhost:5000/api/health'),
    checkServerHealth('http://localhost:3000')
  ]);

  const lastCheckedAt = new Date().toISOString();
  const settings = configStore.getSettings();
  const configuredProviders = settings.ai.providers || [];
  const aiProviders = configuredProviders.map(p => {
    const hasKey = p.type === 'ollama' || !!(p.api_key || (p.api_key_env && process.env[p.api_key_env]));
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      priority: p.priority,
      enabled: p.enabled,
      available: hasKey,
      status: hasKey ? 'configured' : 'not_configured',
      details: hasKey
        ? (p.api_key_env ? `${p.api_key_env} set` : p.type === 'ollama' ? p.base_url : 'API key stored')
        : (p.api_key_env ? `${p.api_key_env} not set` : 'No API key')
    };
  });

  res.json({
    servers: {
      mcp: {
        name: 'Rainbow AI',
        description: 'WhatsApp AI + Admin Dashboard (MCP tools moved to port 5000)',
        port: parseInt(process.env.MCP_SERVER_PORT || '3002', 10),
        online: true,
        responseTime: 0,
        lastCheckedAt
      },
      backend: {
        name: 'Backend API',
        port: 5000,
        online: backendHealth.online,
        responseTime: backendHealth.responseTime,
        url: 'http://localhost:5000',
        error: backendHealth.error,
        lastCheckedAt
      },
      frontend: {
        name: 'Frontend (Vite)',
        port: 3000,
        online: frontendHealth.online,
        responseTime: frontendHealth.responseTime,
        url: 'http://localhost:3000',
        error: frontendHealth.error,
        lastCheckedAt
      }
    },
    whatsapp: {
      state: wa.state,
      user: wa.user
    },
    whatsappInstances: instances.map(i => ({
      id: i.id,
      label: i.label,
      state: i.state,
      user: i.user,
      unlinkedFromWhatsApp: i.unlinkedFromWhatsApp,
      lastUnlinkedAt: i.lastUnlinkedAt,
      lastConnectedAt: i.lastConnectedAt,
      firstConnectedAt: i.firstConnectedAt ?? null
    })),
    ai: {
      available: isAIAvailable(),
      providers: aiProviders
    },
    config_files: ['knowledge', 'intents', 'templates', 'settings', 'workflow', 'workflows', 'routing'],
    response_modes: settings.response_modes || { default_mode: 'autopilot' },
    isCloud: process.env.RAINBOW_ROLE === 'primary',
    propertyName: process.env.BUSINESS_NAME || ''
  });
});

// ─── Config Audit Log ────────────────────────────────────────────────

router.get('/config-audit', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const rows = await getConfigAuditLog(limit);
  ok(res, rows);
});

export default router;
