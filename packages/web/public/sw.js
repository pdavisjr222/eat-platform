// E.A.T. Platform PWA Service Worker
// Uses Workbox for advanced caching strategies

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { BackgroundSyncPlugin } = workbox.backgroundSync;
const { precacheAndRoute } = workbox.precaching;

// Cache name
const CACHE_NAME = 'eat-platform-v1';

// Skip waiting and claim clients immediately
self.skipWaiting();
workbox.core.clientsClaim();

// Precache app shell (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || []);

// API calls - NetworkFirst strategy
// Tries network first, falls back to cache if offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-api`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Images - CacheFirst with 30-day expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: `${CACHE_NAME}-images`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Static assets (CSS, JS, fonts) - StaleWhileRevalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: `${CACHE_NAME}-static`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Background sync for offline mutations
const bgSyncPlugin = new BackgroundSyncPlugin('eat-sync-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
});

// Register background sync for POST/PUT/DELETE requests
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    (request.method === 'POST' ||
     request.method === 'PUT' ||
     request.method === 'DELETE'),
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-mutations`,
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && request.method === 'PUT',
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-mutations`,
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') && request.method === 'DELETE',
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-mutations`,
    plugins: [bgSyncPlugin],
  }),
  'DELETE'
);

// Push notification handling
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const { title = 'E.A.T. Platform', body, icon = '/icon-192.png', badge = '/badge-72.png', data: notificationData } = data;

    const options = {
      body,
      icon,
      badge,
      data: notificationData,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window if none exists
      if (clients.openWindow) {
        const targetUrl = event.notification.data?.url || '/';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background sync success
self.addEventListener('sync', (event) => {
  if (event.tag === 'eat-sync-queue') {
    event.waitUntil(
      // Notify app that sync completed
      clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Offline fallback page
const OFFLINE_URL = '/offline.html';

// Cache offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]).catch((err) => {
        console.warn('Offline page not cached:', err);
      });
    })
  );
});

// Serve offline page for navigation requests when offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

console.log('E.A.T. Platform Service Worker loaded');
