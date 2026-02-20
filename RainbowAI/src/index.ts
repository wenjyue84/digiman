// Catch silent crashes from Baileys / unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled rejection:', reason);
});

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createServer as createHttpServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createMCPHandler } from './server.js';
import { apiClient, getApiBaseUrl } from './lib/http-client.js';
import { getWhatsAppStatus } from './lib/baileys-client.js';
import { startBaileysWithSupervision } from './lib/baileys-supervisor.js';
import adminRoutes from './routes/admin/index.js';
import { initFeedbackSettings } from './lib/init-feedback-settings.js';
import { initAdminNotificationSettings } from './lib/admin-notification-settings.js';
import { configStore } from './assistant/config-store.js';
import { initKnowledgeBase, initKBFromDB } from './assistant/knowledge-base.js';
import { initCapsuleCache } from './lib/capsule-cache.js';
import { initScheduler } from './lib/message-scheduler.js';
import { ensureConfigTables } from './lib/config-db.js';
import { reloadLLMSettingsFromDB } from './assistant/llm-settings-loader.js';
import { loadIntentTiersFromDB } from './assistant/intent-config.js';
import { initPricingFromDB } from './assistant/pricing.js';

const __filename_main = fileURLToPath(import.meta.url);
const __dirname_main = dirname(__filename_main);

// Single source for AI keys (OPENROUTER_API_KEY, etc.): RainbowAI/.env. Then cwd so repo root .env can add vars without overriding.
dotenv.config({ path: join(__dirname_main, '..', '.env') });
dotenv.config();

// Startup env validation — warn about missing keys that will cause silent failures
{
  const warnings: string[] = [];
  if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    warnings.push('  No AI provider API key set (GROQ_API_KEY or OPENROUTER_API_KEY) — AI replies will be unavailable');
  }
  if (warnings.length > 0) {
    console.warn('[Startup] Environment warnings:');
    warnings.forEach(w => console.warn(w));
  }
}

// Ensure DB config tables exist (no-op when DATABASE_URL not set)
try {
  await ensureConfigTables();
} catch (err: any) {
  console.warn('[Startup] Config tables setup failed (will use JSON files):', err.message);
}

// Initialize Knowledge Base (Memory & Files) — local first, then overlay from DB
try {
  initKnowledgeBase();
  await initKBFromDB();
  console.log('[Startup] KnowledgeBase initialized');
} catch (err: any) {
  console.error('[Startup] Failed to initialize KnowledgeBase:', err.message);
}

// Initialize Capsule Cache (US-010) — fetches from dashboard API in background
initCapsuleCache();

// CRITICAL: Initialize configStore BEFORE mounting admin routes
// This prevents "Cannot read properties of undefined" errors when API endpoints are called before WhatsApp init completes
// Now async: tries DB first, falls back to local JSON files
try {
  await configStore.init();
  console.log('[Startup] ConfigStore initialized successfully');
} catch (err: any) {
  console.error('[Startup] Failed to initialize ConfigStore:', err.message);
  console.error('[Startup] Admin API may not function correctly until config files are fixed');
}

// Load standalone configs from DB (fire-and-forget, file fallbacks already loaded)
try {
  await Promise.all([
    reloadLLMSettingsFromDB(),
    loadIntentTiersFromDB(),
    initPricingFromDB(),
  ]);
  console.log('[Startup] Standalone configs loaded from DB');
} catch (err: any) {
  console.warn('[Startup] Some DB config loads failed (using file fallbacks):', err.message);
}

const app = express();
const PORT = parseInt(process.env.MCP_SERVER_PORT || '3002', 10);

// Disable ETags to prevent stale cache on normal refresh
app.set('etag', false);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Admin dashboard uses inline scripts
  crossOriginEmbedderPolicy: false,
}));

// Middleware
app.use(compression({
  filter: (req, res) => {
    // Never compress SSE streams — compression buffers the response,
    // preventing EventSource clients from receiving events in real time.
    if (req.headers.accept === 'text/event-stream' || req.url.endsWith('/activity/stream')) return false;
    return compression.filter(req, res);
  }
}));
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Allow up to 2MB for long messages/conversations

// Error handler for payload too large
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Message payload too large. Maximum size is 2MB.' });
    return;
  }
  next(err);
});

// Rate limiters
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many MCP requests, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many API requests, please try again later' }
});

// Create HTTP server so Vite HMR WebSocket can attach before listening starts
const server = createHttpServer(app);

// --- Static assets + Vite HMR ---
let viteDevServer: any = null;

// Serve dashboard static files (CSS, JS, images) with no-cache headers.
// In dev, this MUST come before Vite middleware so that <link> and <script> tags
// get raw files (correct Content-Type), not Vite's JS-module transforms.
app.use(
  '/public',
  express.static(join(__dirname_main, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);

if (process.env.NODE_ENV !== 'production') {
  // Vite: provides HMR client + WebSocket for file-change notifications.
  // Static files are served by Express above; Vite only handles /@vite/* paths.
  const { createServer: createViteServer } = await import('vite');
  viteDevServer = await createViteServer({
    configFile: join(__dirname_main, '..', 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server } },
    appType: 'custom',
  });
  app.use(viteDevServer.middlewares);
}

// Health check endpoint (liveness — is the process alive?)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pelangi-mcp-server',
    version: '1.0.0',
    whatsapp: getWhatsAppStatus().state,
    timestamp: new Date().toISOString()
  });
});

// Deep health check (readiness — can this server serve requests?)
app.get('/health/ready', async (req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Backend API reachable
  try {
    await apiClient.get('/api/health', { timeout: 5000 });
    checks.backend = { ok: true };
  } catch (err: any) {
    checks.backend = { ok: false, detail: err.code || err.message };
  }

  // 2. WhatsApp connection
  const waStatus = getWhatsAppStatus();
  checks.whatsapp = {
    ok: waStatus.state === 'open',
    detail: waStatus.state
  };

  // 3. AI provider circuit breakers
  const { circuitBreakerRegistry } = await import('./assistant/circuit-breaker.js');
  const cbStatuses = circuitBreakerRegistry.getAllStatuses();
  const registeredCount = Object.keys(cbStatuses).length;
  const openCircuits = Object.entries(cbStatuses)
    .filter(([, s]) => s.state === 'OPEN')
    .map(([id]) => id);
  checks.aiProviders = {
    ok: openCircuits.length === 0,
    detail: openCircuits.length > 0
      ? `${openCircuits.length} provider(s) circuit-open: ${openCircuits.join(', ')}`
      : registeredCount > 0
        ? `${registeredCount} provider(s) healthy`
        : 'not yet tested (no AI requests since restart)'
  };

  // 4. Config store health
  const corrupted = configStore.getCorruptedFiles();
  checks.config = {
    ok: corrupted.length === 0,
    detail: corrupted.length > 0
      ? `Corrupted: ${corrupted.join(', ')}`
      : 'All configs loaded'
  };

  const allHealthy = Object.values(checks).every(c => c.ok);
  // WhatsApp can be disconnected and system still works (manual mode)
  // Backend is critical — without it, MCP tools fail
  const critical = checks.backend.ok && checks.config.ok;

  res.status(critical ? 200 : 503).json({
    status: critical ? (allHealthy ? 'ready' : 'degraded') : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});

// --- Dashboard HTML ---
const DASHBOARD_HTML_PATH = join(__dirname_main, 'public', 'rainbow-admin.html');
let _dashboardHtmlCache: string | null = null;

function loadDashboardHtml(): string {
  return readFileSync(DASHBOARD_HTML_PATH, 'utf-8');
}

// Eagerly load for production (cache persists for the process lifetime)
try {
  _dashboardHtmlCache = loadDashboardHtml();
} catch {
  // File may not exist yet during build; getDashboardHtml() will throw at request time
}

async function getDashboardHtml(_url: string): Promise<string> {
  if (viteDevServer) {
    // Dev: read fresh from disk, inject Vite HMR client manually.
    // We skip transformIndexHtml because it double-prefixes /public/ URLs
    // (HTML already uses absolute /public/... paths, and Vite prepends base again).
    // Vite's middleware still serves files correctly (strips base from requests).
    let html = readFileSync(DASHBOARD_HTML_PATH, 'utf-8');
    const adminKeyDev = process.env.RAINBOW_ADMIN_KEY || '';
    html = html.replace('<head>', `<head>\n  <script>window.__ADMIN_KEY__=${JSON.stringify(adminKeyDev)};</script>\n  <script type="module" src="/public/@vite/client"></script>`);
    return html;
  }
  // Prod: use cached HTML with cache-bust
  let html = _dashboardHtmlCache ?? loadDashboardHtml();
  const v = Date.now();
  html = html.replace(/(src|href)="(\/public\/[^"]+\.(js|css))"/g, `$1="$2?v=${v}"`);
  // Inject admin key + fetch interceptor for remote browser access.
  // tabs.js / template-loader.js use raw fetch() (not api()), so we patch window.fetch globally
  // to auto-add X-Admin-Key on all /api/rainbow/ requests.
  const adminKey = process.env.RAINBOW_ADMIN_KEY || '';
  const interceptorScript = `<script>
window.__ADMIN_KEY__=${JSON.stringify(adminKey)};
(function(){var _f=window.fetch;window.fetch=function(url,opts){opts=opts||{};if(typeof url==='string'&&url.indexOf('/api/rainbow/')>=0&&window.__ADMIN_KEY__){var h=Object.assign({'X-Admin-Key':window.__ADMIN_KEY__},opts.headers||{});opts=Object.assign({},opts,{headers:h});}return _f.call(this,url,opts);};})();
</script>`;
  html = html.replace('<head>', `<head>\n  ${interceptorScript}`);
  return html;
}

// Rainbow Admin Dashboard - Root path only
app.get('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.type('html').send(await getDashboardHtml(req.originalUrl));
  } catch {
    res.status(500).send('Dashboard file not found');
  }
});

// WhatsApp QR code pairing endpoint (temporary - remove after pairing)
app.get('/admin/whatsapp-qr', async (req, res) => {
  const status = getWhatsAppStatus();
  if (status.state === 'open') {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>WhatsApp Connected</h2>
      <p>Account: ${status.user?.name || 'Unknown'} (${status.user?.phone || '?'})</p>
      <p style="color:green;font-size:24px">Already paired!</p>
    </body></html>`);
    return;
  }
  if (!status.qr) {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>WhatsApp QR Code</h2>
      <p>No QR code available yet. Status: <b>${status.state}</b></p>
      <p>Waiting for Baileys to generate QR code...</p>
      <script>setTimeout(()=>location.reload(),3000)</script>
    </body></html>`);
    return;
  }
  try {
    const QRCode = await import('qrcode');
    const qrImage = await QRCode.default.toDataURL(status.qr);
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>Scan with WhatsApp</h2>
      <img src="${qrImage}" style="width:300px;height:300px" />
      <p>Open WhatsApp > Linked Devices > Link a Device</p>
      <script>setTimeout(()=>location.reload(),5000)</script>
    </body></html>`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rainbow Admin API
app.use('/api/rainbow', apiLimiter, adminRoutes);

// Dashboard tab routes (SPA client-side routing)
const dashboardTabs = [
  // Connect
  'dashboard',
  // Train
  'understanding', 'responses', 'intents',
  // Test
  'chat-simulator', 'testing',
  // Monitor
  'performance', 'settings',
  // Standalone
  'help',
  // Legacy (keep for old bookmarks — they show deprecation notices in the SPA)
  'intent-manager', 'static-replies', 'kb', 'preview', 'real-chat', 'workflow',
  'whatsapp-accounts', // removed from nav but URL still works (shows "Page Removed" notice)
];
app.get(`/:tab(${dashboardTabs.join('|')})`, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.type('html').send(await getDashboardHtml(req.originalUrl));
  } catch {
    res.status(500).send('Dashboard file not found');
  }
});

// MCP protocol endpoint
app.post('/mcp', mcpLimiter, createMCPHandler());

// Start server - listen on 0.0.0.0 for Docker containers
server.listen(PORT, '0.0.0.0', () => {
  const apiUrl = getApiBaseUrl();
  console.log(`Pelangi MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`API URL: ${apiUrl}${process.env.PELANGI_MANAGER_HOST ? ' (internal host)' : ''}`);

  // Startup connectivity check: warn if PelangiManager API is unreachable
  setImmediate(async () => {
    try {
      try {
        await apiClient.get('/api/health');
      } catch {
        await apiClient.get('/api/occupancy');
      }
      console.log('PelangiManager API reachable');
    } catch (err: any) {
      const status = err.response?.status;
      const url = `${apiUrl}/api/health`;
      console.warn('');
      console.warn('PelangiManager API not reachable.');
      console.warn(`   URL: ${url}`);
      if (status) console.warn(`   Response: ${status} ${err.response?.statusText || ''}`);
      console.warn('   Set PELANGI_API_URL in Zeabur to your deployed PelangiManager URL.');
      console.warn('   MCP tools will fail until the API is reachable.');
      console.warn('');
    }

    // Initialize feedback settings defaults
    await initFeedbackSettings();

    // Initialize admin notification settings
    await initAdminNotificationSettings();

    // Initialize WhatsApp (Baileys) with crash isolation supervisor
    await startBaileysWithSupervision();

    // Initialize scheduled message checker (US-019)
    initScheduler();

    // Initialize failover coordinator (primary/standby)
    const { failoverCoordinator } = await import('./lib/failover-coordinator.js');
    const failoverSettings = configStore.getSettings().failover ?? {
      enabled: true, heartbeatIntervalMs: 20000, failoverThresholdMs: 60000,
      handbackMode: 'immediate' as const, handbackGracePeriodMs: 30000,
    };
    failoverCoordinator.init({
      role: (process.env.RAINBOW_ROLE as 'primary' | 'standby') ?? 'primary',
      peerUrl: process.env.RAINBOW_PEER_URL,
      secret: process.env.RAINBOW_FAILOVER_SECRET ?? '',
      settings: failoverSettings,
    });

    // Wire failover WhatsApp notifications
    const { notifyAdminFailoverActivated, notifyAdminFailoverDeactivated } =
      await import('./lib/admin-notifier.js');
    failoverCoordinator.on('activated', () => {
      notifyAdminFailoverActivated().catch(() => {});
    });
    failoverCoordinator.on('deactivated', () => {
      notifyAdminFailoverDeactivated().catch(() => {});
    });

    // Update coordinator when settings are hot-reloaded
    configStore.on('reload', (domain: string) => {
      if (['settings', 'all'].includes(domain)) {
        const updated = configStore.getSettings().failover;
        if (updated) failoverCoordinator.updateSettings(updated);
      }
    });
  });
});

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing server...`);
  if (viteDevServer) viteDevServer.close();
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed.');
    process.exit(0);
  });

  // Force exit if server.close() hangs
  setTimeout(() => {
    console.error('[SHUTDOWN] Force exiting...');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
