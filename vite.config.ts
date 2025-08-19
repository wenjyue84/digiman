import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        additionalManifestEntries: [
          { url: '/sw-push-handlers.js', revision: null }
        ],
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
        name: 'Pelangi Capsule Manager',
        short_name: 'PelangiManager',
        description: 'Hostel management system for Pelangi Capsule Hostel',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
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
      disable: process.env.DISABLE_PWA === 'true'
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
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
