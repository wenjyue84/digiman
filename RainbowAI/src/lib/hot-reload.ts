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

  // Create visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'hot-reload-indicator';
  indicator.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#f59e0b;color:white;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;font-family:system-ui,sans-serif;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;transition:all 0.3s;';
  indicator.innerHTML = '🔥 Hot Reload <span style="font-size:10px;opacity:0.8;">● Connecting...</span>';
  indicator.title = 'Hot reload is active - changes will auto-refresh';

  // Add hover effect
  indicator.onmouseover = function() {
    this.style.transform = 'scale(1.05)';
    this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
  };
  indicator.onmouseout = function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };

  function updateIndicator(status, message) {
    const colors = {
      connected: '#22c55e',
      connecting: '#f59e0b',
      disconnected: '#ef4444'
    };
    indicator.style.background = colors[status];
    indicator.innerHTML = '🔥 Hot Reload <span style="font-size:10px;opacity:0.8;">● ' + message + '</span>';
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
          window.location.reload();
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
