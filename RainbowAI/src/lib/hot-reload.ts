import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { Server } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupHotReload(server: Server) {
  // Only enable hot reload in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const wss = new WebSocketServer({
    server,
    path: '/hot-reload'
  });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    console.log('[Hot Reload] Client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('[Hot Reload] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[Hot Reload] WebSocket error:', err);
      clients.delete(ws);
    });
  });

  // Watch for file changes
  const watchPaths = [
    join(__dirname, '..', 'public'),           // HTML/JS files
    join(__dirname, '..', 'assistant'),        // Assistant logic
    join(__dirname, '..', 'routes'),           // API routes
    join(__dirname, '..', 'tools'),            // MCP tools
  ];

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });

  watcher.on('change', (path) => {
    console.log(`[Hot Reload] File changed: ${path}`);

    // Notify all connected clients
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'reload',
          path,
          timestamp: Date.now()
        }));
      }
    });
  });

  watcher.on('error', (error) => {
    console.error('[Hot Reload] Watcher error:', error);
  });

  console.log('[Hot Reload] Enabled - watching for changes...');

  return () => {
    watcher.close();
    wss.close();
  };
}

/**
 * Client-side hot reload script to inject into HTML
 */
export const HOT_RELOAD_SCRIPT = `
<script>
(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return; // Only enable hot reload in local development
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = protocol + '//' + window.location.host + '/hot-reload';

  let ws;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  let expanded = false;
  let currentStatus = 'connecting';
  let currentMessage = 'Connecting...';

  const TOOLTIP = 'Hot Reload: When you edit files (HTML, JS, config in RainbowAI), this page will automatically refresh so you see changes without restarting the server. Click to see connection status.';

  // Create visual indicator — small by default, icon only
  const indicator = document.createElement('div');
  indicator.id = 'hot-reload-indicator';
  indicator.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#f59e0b;color:white;padding:6px 8px;border-radius:20px;font-size:14px;font-weight:600;font-family:system-ui,sans-serif;z-index:999999;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer;transition:all 0.2s ease;min-width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
  indicator.innerHTML = '🔥';
  indicator.title = TOOLTIP;

  function renderIndicator() {
    const colors = {
      connected: '#22c55e',
      connecting: '#f59e0b',
      disconnected: '#ef4444'
    };
    indicator.style.background = colors[currentStatus];
    if (expanded) {
      indicator.style.minWidth = 'auto';
      indicator.style.padding = '6px 10px';
      indicator.style.borderRadius = '8px';
      indicator.innerHTML = '🔥 Hot Reload <span style="font-size:10px;opacity:0.9;">● ' + currentMessage + '</span>';
    } else {
      indicator.style.minWidth = '32px';
      indicator.style.padding = '6px 8px';
      indicator.style.borderRadius = '20px';
      indicator.innerHTML = '🔥';
    }
  }

  indicator.onclick = function(e) {
    e.stopPropagation();
    expanded = !expanded;
    renderIndicator();
  };

  document.addEventListener('click', function() {
    if (expanded) {
      expanded = false;
      renderIndicator();
    }
  });

  // Add hover effect
  indicator.onmouseover = function() {
    this.style.transform = 'scale(1.08)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  };
  indicator.onmouseout = function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  };

  function updateIndicator(status, message) {
    currentStatus = status;
    currentMessage = message;
    renderIndicator();
  }

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
      console.log('[Hot Reload] Connected');
      reconnectAttempts = 0;
      updateIndicator('connected', 'Connected');
    };

    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log('[Hot Reload] Reloading page due to file change:', data.path);
          // Cache-bust so browser fetches fresh HTML/JS (avoids needing hard refresh)
          var origin = window.location.origin;
          var path = window.location.pathname || '/';
          var hash = window.location.hash || '';
          window.location.href = origin + path + '?_=' + Date.now() + hash;
        }
      } catch (err) {
        console.error('[Hot Reload] Error parsing message:', err);
      }
    };

    ws.onclose = function() {
      console.log('[Hot Reload] Disconnected');

      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        reconnectAttempts++;
        updateIndicator('connecting', 'Reconnecting...');
        console.log('[Hot Reload] Reconnecting in ' + (delay/1000) + 's...');
        setTimeout(connect, delay);
      } else {
        updateIndicator('disconnected', 'Disconnected');
      }
    };

    ws.onerror = function(err) {
      console.error('[Hot Reload] WebSocket error:', err);
    };
  }

  // Append indicator to body
  function appendIndicator() {
    if (document.body) {
      document.body.appendChild(indicator);
      connect();
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(indicator);
        connect();
      });
    }
  }

  appendIndicator();
})();
</script>
`;
