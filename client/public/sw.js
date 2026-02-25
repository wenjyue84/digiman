// digiman Service Worker
// Handles PWA functionality and push notifications

// Version: 2024.11.31.1 - Force update with timestamp
const CACHE_NAME = 'digiman-app-v1-' + Date.now();
const RUNTIME_CACHE = 'digiman-runtime-cache-v1';

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
      .then(() => {
        console.log('SW: Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('SW: Install failed:', error.message);
        // Don't prevent installation, just log the error
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName)
              .catch((error) => {
                console.warn('SW: Failed to delete cache', cacheName, ':', error.message);
                // Continue with other cache deletions
                return false;
              });
          }
          return Promise.resolve(true);
        });
        
        return Promise.all(deletePromises);
      })
      .then((results) => {
        const deletedCount = results.filter(r => r === true || r === undefined).length;
        console.log('SW: Cache cleanup completed, processed', deletedCount, 'caches');
        return self.clients.claim(); // Take control immediately
      })
      .catch((error) => {
        console.error('SW: Activate failed:', error.message);
        // Still try to claim clients even if cleanup failed
        return self.clients.claim();
      })
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
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                return cache.put(request, responseClone);
              })
              .catch((cacheError) => {
                console.warn('SW: Failed to cache API response:', cacheError.message);
                // Continue without caching - not critical
              });
          }
          return response;
        })
        .catch((networkError) => {
          console.log('SW: API network failed, trying cache:', networkError.message);
          // Fallback to cache on network failure
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('SW: Serving API from cache');
                return cachedResponse;
              }
              // No cache available, return error response
              return new Response(
                JSON.stringify({ message: 'Service temporarily unavailable' }), 
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            })
            .catch((cacheError) => {
              console.error('SW: Cache lookup failed:', cacheError.message);
              return new Response(
                JSON.stringify({ message: 'Service temporarily unavailable' }), 
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch((networkError) => {
          console.log('SW: Navigation network failed, trying cache fallback:', networkError.message);
          // Fallback to cached root for navigation
          return caches.match('/')
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('SW: Serving navigation from cache');
                return cachedResponse;
              }
              // No cached fallback available
              return new Response(
                `<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            })
            .catch((cacheError) => {
              console.error('SW: Navigation cache fallback failed:', cacheError.message);
              return new Response(
                `<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving from cache:', request.url);
          return cachedResponse;
        }
        
        console.log('SW: Not in cache, fetching:', request.url);
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  return cache.put(request, responseClone);
                })
                .catch((cacheError) => {
                  console.warn('SW: Failed to cache response for', request.url, ':', cacheError.message);
                  // Continue without caching - not critical
                });
            }
            return response;
          })
          .catch((networkError) => {
            console.error('SW: Network request failed for', request.url, ':', networkError.message);
            // Return a generic offline response for failed requests
            return new Response(
              'Offline - Content not available',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              }
            );
          });
      })
      .catch((cacheError) => {
        console.error('SW: Cache lookup failed for', request.url, ':', cacheError.message);
        // If cache lookup fails, try network directly
        return fetch(request)
          .catch((networkError) => {
            console.error('SW: Both cache and network failed for', request.url, ':', networkError.message);
            return new Response(
              'Service temporarily unavailable',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              }
            );
          });
      })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  let notificationData = {
    title: 'digiman',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'digiman-notification',
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