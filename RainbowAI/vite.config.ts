import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Static files (CSS, JS, HTML) are served by Express, not Vite's transform pipeline.
 * This plugin watches for changes and triggers a full page reload via Vite's built-in
 * WebSocket — replacing the old custom WS server + chokidar setup.
 */
function fullReloadPlugin(): Plugin {
  return {
    name: 'rainbow-full-reload',
    configureServer(server) {
      server.watcher.on('change', (file: string) => {
        const rel = path.relative(path.join(__dirname, 'src', 'public'), file);
        if (rel.startsWith('..')) return; // Outside public dir

        // Full reload for any dashboard file change (JS, CSS, HTML)
        if (rel.endsWith('.js') || rel.endsWith('.css') || rel.endsWith('.html')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname, 'src/public'),
  base: '/public/',
  plugins: [fullReloadPlugin()],
  server: {
    hmr: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/public/rainbow-admin.html'),
    },
  },
});
