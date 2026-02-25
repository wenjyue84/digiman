import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from 'vite-plugin-pwa';
import { devControlPlugin } from './vite-plugin-dev-control';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configurable ports — defaults preserve existing behaviour
const VITE_PORT = parseInt(process.env.VITE_PORT || '3000', 10);
const BACKEND_PORT = process.env.BACKEND_PORT || '5000';

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    devControlPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Import push handlers into the service worker
        importScripts: ['/sw-push-handlers.js'],
        runtimeCaching: [
          // Cache API responses with network-first strategy
          {
            urlPattern: /\/api\/(occupancy|storage\/info|capsules\/available)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-short',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache settings and configuration with longer TTL
          {
            urlPattern: /\/api\/(admin\/config|settings)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-long',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache guest data with shorter TTL
          {
            urlPattern: /\/api\/guests\/(checked-in|history)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-guests',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 2, // 2 minutes
              },
              networkTimeoutSeconds: 2,
            },
          },
          // Cache uploaded images with cache-first strategy
          {
            urlPattern: /\/objects\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploaded-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          // Cache static assets with cache-first strategy
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: process.env.BUSINESS_NAME || 'digiman',
        short_name: process.env.BUSINESS_SHORT_NAME || 'digiman',
        description: process.env.BUSINESS_TAGLINE || 'Digital manpower and operations management system',
        theme_color: process.env.BUSINESS_PRIMARY_COLOR || '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'Check In Guest',
            short_name: 'Check In',
            description: 'Quick guest check-in',
            url: '/check-in',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Check Out Guest',
            short_name: 'Check Out',
            description: 'Quick guest check-out',
            url: '/check-out',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View occupancy dashboard',
            url: '/dashboard',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      devOptions: {
        enabled: process.env.NODE_ENV === 'development',
        type: 'module'
      },
             // Only enable PWA in production or when explicitly requested
       disable: true // Temporarily disabled to fix service worker conflicts
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: VITE_PORT,
    hmr: {
      overlay: false // Disable runtime error overlay
    },
    proxy: {
      '/api/rainbow-kb': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/api/rainbow': {
        target: `http://localhost:${process.env.MCP_SERVER_PORT || '3002'}`,
        changeOrigin: true
      },
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/objects': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
