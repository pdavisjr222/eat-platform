// Service Worker Registration Helper for E.A.T. Platform PWA
import { Workbox } from 'workbox-window';

interface ServiceWorkerCallbacks {
  onSuccess?: () => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

let wb: Workbox | null = null;

/**
 * Register service worker with update handling
 */
export async function registerServiceWorker(callbacks?: ServiceWorkerCallbacks) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    wb = new Workbox('/sw.js', {
      scope: '/',
    });

    // Handle service worker waiting
    wb.addEventListener('waiting', () => {
      console.log('New service worker waiting...');
      if (callbacks?.onUpdate && wb?.waiting) {
        callbacks.onUpdate(wb.waiting as any);
      }
    });

    // Handle successful registration
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker installed for the first time');
        if (callbacks?.onSuccess) {
          callbacks.onSuccess();
        }
      }
    });

    // Handle activation
    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker activated');
        if (callbacks?.onOfflineReady) {
          callbacks.onOfflineReady();
        }
      } else {
        console.log('Service worker updated');
      }
    });

    // Handle controller change (new SW took over)
    wb.addEventListener('controlling', () => {
      console.log('Service worker controlling');
      // Reload page to use new service worker
      window.location.reload();
    });

    // Listen for sync complete messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        console.log('Background sync completed:', event.data.timestamp);
        // Dispatch custom event for app to listen to
        window.dispatchEvent(new CustomEvent('sw-sync-complete', {
          detail: event.data,
        }));
      }
    });

    // Register service worker
    const registration = await wb.register();
    console.log('Service worker registered:', registration);

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    if (callbacks?.onError) {
      callbacks.onError(error as Error);
    }
    return null;
  }
}

/**
 * Unregister all service workers (for development/testing)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('All service workers unregistered');
    return true;
  } catch (error) {
    console.error('Failed to unregister service workers:', error);
    return false;
  }
}

/**
 * Update service worker immediately (skip waiting)
 */
export function updateServiceWorker() {
  if (wb && wb.waiting) {
    wb.messageSkipWaiting();
  }
}

/**
 * Check if service worker is controlling the page
 */
export function isServiceWorkerControlling(): boolean {
  return !!navigator.serviceWorker?.controller;
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Storage persistence: ${isPersisted}`);
      return isPersisted;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }
  return false;
}

/**
 * Check storage persistence status
 */
export async function checkStoragePersistence(): Promise<boolean> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    try {
      return await navigator.storage.persisted();
    } catch (error) {
      console.error('Failed to check storage persistence:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear all caches (for development/testing)
 */
export async function clearAllCaches(): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('All caches cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return false;
  }
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  updateServiceWorker,
  isServiceWorkerControlling,
  getServiceWorkerRegistration,
  requestPersistentStorage,
  checkStoragePersistence,
  getStorageQuota,
  clearAllCaches,
};
