// Catch silent crashes from Baileys / unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled rejection:', reason);
});

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, watchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createMCPHandler } from './server.js';
import { apiClient, getApiBaseUrl } from './lib/http-client.js';
import { getWhatsAppStatus } from './lib/baileys-client.js';
import { startBaileysWithSupervision } from './lib/baileys-supervisor.js';
import adminRoutes from './routes/admin/index.js';
import { initFeedbackSettings } from './lib/init-feedback-settings.js';
import { initAdminNotificationSettings } from './lib/admin-notification-settings.js';
import { setupHotReload, HOT_RELOAD_SCRIPT } from './lib/hot-reload.js';
import { configStore } from './assistant/config-store.js';
import { initKnowledgeBase } from './assistant/knowledge-base.js';

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

// Initialize Knowledge Base (Memory & Files)
try {
  initKnowledgeBase();
  console.log('[Startup] KnowledgeBase initialized');
} catch (err: any) {
  console.error('[Startup] Failed to initialize KnowledgeBase:', err.message);
}

// CRITICAL: Initialize configStore BEFORE mounting admin routes
// This prevents "Cannot read properties of undefined" errors when API endpoints are called before WhatsApp init completes
try {
  configStore.init();
  console.log('[Startup] ConfigStore initialized successfully');
} catch (err: any) {
  console.error('[Startup] Failed to initialize ConfigStore:', err.message);
  console.error('[Startup] Admin API may not function correctly until config files are fixed');
}

const app = express();
const PORT = parseInt(process.env.MCP_SERVER_PORT || '3002', 10);

// Disable ETags to prevent stale cache on normal refresh
app.set('etag', false);

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow up to 10MB for long messages/conversations

// Error handler for payload too large
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Message payload too large. Maximum size is 10MB.' });
    return;
  }
  next(err);
});

// Serve static assets for Rainbow dashboard modules with no-cache headers for development
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
  const openCircuits = Object.entries(cbStatuses)
    .filter(([, s]) => s.state === 'OPEN')
    .map(([id]) => id);
  checks.aiProviders = {
    ok: openCircuits.length === 0,
    detail: openCircuits.length > 0
      ? `${openCircuits.length} provider(s) circuit-open: ${openCircuits.join(', ')}`
      : `${Object.keys(cbStatuses).length} provider(s) healthy`
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

// --- Dashboard HTML cache ---
// Read once at module load to avoid readFileSync on every request.
// In development, fs.watchFile invalidates the cache when the file changes on disk.
const DASHBOARD_HTML_PATH = join(__dirname_main, 'public', 'rainbow-admin.html');
let _dashboardHtmlCache: string | null = null;

function loadDashboardHtml(): string {
  return readFileSync(DASHBOARD_HTML_PATH, 'utf-8');
}

// Eagerly load the HTML into memory
try {
  _dashboardHtmlCache = loadDashboardHtml();
} catch {
  // File may not exist yet during build; getDashboardHtml() will throw at request time
}

// In development, watch for file changes and invalidate the cache
if (process.env.NODE_ENV !== 'production') {
  watchFile(DASHBOARD_HTML_PATH, { interval: 500 }, () => {
    try {
      _dashboardHtmlCache = loadDashboardHtml();
      console.log('[Dashboard] HTML cache refreshed (file changed)');
    } catch {
      _dashboardHtmlCache = null;
    }
  });
}

function getDashboardHtml(): string {
  // Use cached HTML; fall back to a fresh read if cache is somehow null
  let html = _dashboardHtmlCache ?? loadDashboardHtml();
  // Cache-bust all local JS/CSS URLs with a fresh timestamp (mimics Vite's content hashing)
  // This forces the browser to fetch fresh files on every page load, preventing stale cache
  const v = Date.now();
  html = html.replace(/(src|href)="(\/public\/[^"]+\.(js|css))"/g, `$1="$2?v=${v}"`);
  if (process.env.NODE_ENV !== 'production') {
    html = html.replace('</body>', HOT_RELOAD_SCRIPT + '\n</body>');
  }
  return html;
}

// Rainbow Admin Dashboard - Root path only
app.get('/', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.type('html').send(getDashboardHtml());
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
app.use('/api/rainbow', adminRoutes);

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
app.get(`/:tab(${dashboardTabs.join('|')})`, (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.type('html').send(getDashboardHtml());
  } catch {
    res.status(500).send('Dashboard file not found');
  }
});

// MCP protocol endpoint
app.post('/mcp', createMCPHandler());

// Start server - listen on 0.0.0.0 for Docker containers
const server = app.listen(PORT, '0.0.0.0', () => {
  const apiUrl = getApiBaseUrl();
  setupHotReload(server);
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
  });
});

// Graceful shutdown handlers
const shutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing server...`);
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
