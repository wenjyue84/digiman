/**
 * Push Notification Handlers for Service Worker
 * This file is loaded by the main service worker to handle push notifications
 */

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    
    const options = {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      image: payload.image,
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      vibrate: payload.vibrate,
      timestamp: Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('digiman', {
        body: 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      })
    );
  }
});

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  const url = data.url || '/dashboard';

  event.waitUntil(
    (async function() {
      // Get all clients (open windows/tabs)
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Find existing client with the app
      const existingClient = clients.find(client => {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(url, self.location.origin);
        return clientUrl.origin === targetUrl.origin;
      });

      if (existingClient) {
        // Focus existing client and navigate
        await existingClient.focus();
        
        if ('navigate' in existingClient) {
          await existingClient.navigate(url);
        } else {
          // Fallback: send message to client
          existingClient.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            action: action,
            data: data,
          });
        }
      } else {
        // Open new window
        await self.clients.openWindow(url);
      }

      // Handle specific actions
      if (action) {
        switch (action) {
          case 'checkout':
            console.log('Checkout action triggered for:', data);
            break;
          case 'view':
            console.log('View action triggered for:', data);
            break;
          default:
            console.log('Unknown action:', action);
        }
      }
    })()
  );
});

// Listen for notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
  
  // Track notification dismissal if needed
  // You could send analytics here
});

console.log('Push notification handlers loaded');