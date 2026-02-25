import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
self.clients.claim();

// API calls — NetworkFirst
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'eat-platform-v1-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// Images — CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'eat-platform-v1-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Static assets — StaleWhileRevalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'eat-platform-v1-static',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Background sync for offline mutations
const bgSyncPlugin = new BackgroundSyncPlugin('eat-sync-queue', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkFirst({
    cacheName: 'eat-platform-v1-mutations',
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Push notifications
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const { title = 'E.A.T. Platform', body, icon = '/icon-192.png', badge = '/badge-72.png', data: notificationData } = data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body, icon, badge, data: notificationData,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'close', title: 'Close' },
        ],
      })
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

// Background sync complete → notify app
self.addEventListener('sync', (event) => {
  if (event.tag === 'eat-sync-queue') {
    event.waitUntil(
      clients.matchAll().then((cls) => {
        cls.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE', timestamp: Date.now() }));
      })
    );
  }
});

// Skip waiting on message
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
