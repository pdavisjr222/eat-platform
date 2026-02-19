// E.A.T. Platform Service Worker
// Enables offline functionality, caching strategies, and push notifications

const CACHE_NAME = 'eat-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png.svg',
  '/icon-512x512.png.svg',
  '/favicon.png'
];

// Install event: Cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache:', CACHE_NAME);
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('Cache addAll failed:', error);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first with cache fallback strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response for caching
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request).then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone and cache successful responses
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, clonedResponse);
        });

        return response;
      }).catch(() => {
        // Return offline page if available, otherwise a generic fallback
        return new Response('Offline - please check your connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) {
    console.log('Push notification without data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from E.A.T.',
    icon: '/icon-192x192.png.svg',
    badge: '/icon-96x96.png.svg',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'E.A.T.', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.tag);
});

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-listings') {
    event.waitUntil(
      fetch('/api/v1/sync/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Background sync failed:', error);
        throw error; // Retry
      })
    );
  }
});

console.log('E.A.T. Service Worker loaded and registered');
