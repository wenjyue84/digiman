const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 9999;
const startedAt = Date.now();

// ─── Localhost-only restriction ────────────────────────────────────────
app.use((req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';
  if (!isLocal) {
    return res.status(403).send('Fleet Manager: localhost access only');
  }
  next();
});

// ─── Health proxy (same-origin so dashboard avoids CORS to localhost) ─
// Root cause: Node resolves "localhost" (OS-dependent; often IPv6 first). Servers bind
// inconsistently: Express on 127.0.0.1 only, Vite on ::1 only, Rainbow on 0.0.0.0.
// Fix: try 127.0.0.1 then ::1 so proxy works regardless of how each server is bound.
function tryProxyRequest(hostname, port, path, timeoutMs, res, onDone) {
  const client = http.request(
    {
      hostname,
      port,
      path,
      method: 'GET',
    },
    (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', (c) => chunks.push(c));
      proxyRes.on('end', () => {
        if (onDone.sent) return;
        onDone.sent = true;
        const body = Buffer.concat(chunks).toString('utf8');
        res.status(proxyRes.statusCode);
        res.set('Content-Type', proxyRes.headers['content-type'] || 'application/json');
        res.send(body);
      });
    }
  );
  client.on('error', (err) => {
    if (onDone.sent) return;
    onDone.err = err;
    client.destroy();
    onDone.next?.();
  });
  client.setTimeout(timeoutMs);
  client.on('timeout', () => {
    client.destroy();
    if (!onDone.sent && !res.headersSent) {
      onDone.sent = true;
      res.status(504).json({ error: 'Proxy timeout', timestamp: new Date().toISOString() });
    }
  });
  client.end();
}

app.get('/api/health-proxy', (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url query' });
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== '::1') {
    return res.status(403).json({ error: 'Only localhost URLs allowed' });
  }
  const port = parseInt(parsed.port || (parsed.protocol === 'https:' ? 443 : 80), 10);
  const path = parsed.pathname + parsed.search;
  const timeoutMs = req.query.timeout ? parseInt(req.query.timeout, 10) : 5000;
  const onDone = { sent: false, err: null };

  onDone.next = () => {
    if (onDone.sent) return;
    // First try used 127.0.0.1 and failed; try ::1
    if (onDone.triedIPv6) {
      onDone.sent = true;
      res.status(502).json({
        error: 'Proxy failed',
        message: onDone.err?.message || 'Connection refused (tried 127.0.0.1 and ::1)',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    onDone.triedIPv6 = true;
    tryProxyRequest('::1', port, path, timeoutMs, res, onDone);
  };

  tryProxyRequest('127.0.0.1', port, path, timeoutMs, res, onDone);
});

// ─── Health (for PM2, load balancers, uptime checks) ─────────────────────
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'fleet-manager',
    pid: process.pid,
    uptime_seconds: Math.floor(process.uptime()),
    uptime_human: formatUptime(process.uptime()),
    started_at: new Date(startedAt).toISOString(),
    memory: {
      rss_mb: roundMb(mem.rss),
      heapUsed_mb: roundMb(mem.heapUsed),
      heapTotal_mb: roundMb(mem.heapTotal),
      external_mb: roundMb(mem.external),
    },
    node: process.version,
    timestamp: new Date().toISOString(),
  });
});

// ─── Metrics (for monitoring scrapers / dashboards) ──────────────────────
app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  res.set('Content-Type', 'application/json');
  res.json({
    service: 'fleet-manager',
    port: PORT,
    pid: process.pid,
    uptime_seconds: uptime,
    uptime_human: formatUptime(uptime),
    started_at: new Date(startedAt).toISOString(),
    memory_rss_bytes: mem.rss,
    memory_heapUsed_bytes: mem.heapUsed,
    memory_heapTotal_bytes: mem.heapTotal,
    memory_external_bytes: mem.external,
    memory_rss_mb: roundMb(mem.rss),
    memory_heapUsed_mb: roundMb(mem.heapUsed),
    node_version: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function roundMb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

// ─── Serve static dashboard ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Start ────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Fleet Manager running at http://localhost:${PORT}`);
  console.log('Access restricted to localhost only.');
  console.log('Health: http://localhost:' + PORT + '/health  Metrics: http://localhost:' + PORT + '/metrics');
});
