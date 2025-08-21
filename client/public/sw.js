// Pelangi Capsule Hostel Service Worker
// Handles PWA functionality and push notifications

const CACHE_NAME = 'pelangi-hostel-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets to precache
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/check-in',
  '/check-out', 
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for short term
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache on network failure
          return caches.match(request);
        })
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Fallback to cached root for navigation
          return caches.match('/');
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  let notificationData = {
    title: 'Pelangi Capsule Hostel',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'hostel-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (error) {
      console.error('SW: Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'open' action
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync event');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending offline actions
      Promise.resolve()
    );
  }
});

console.log('SW: Service worker loaded successfully');