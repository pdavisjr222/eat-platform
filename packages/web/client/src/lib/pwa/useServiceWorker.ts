// React hook for Service Worker integration
import { useEffect, useState, useCallback } from 'react';
import { registerServiceWorker, updateServiceWorker, getStorageQuota } from './registerServiceWorker';

interface ServiceWorkerState {
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
  storageUsage: { usage: number; quota: number } | null;
}

interface UseServiceWorkerOptions {
  onSuccess?: () => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

export function useServiceWorker(options?: UseServiceWorkerOptions) {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null,
    storageUsage: null,
  });

  // Register service worker
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Service worker disabled in development');
      return;
    }

    let mounted = true;

    registerServiceWorker({
      onSuccess: () => {
        if (mounted) {
          setState((prev) => ({ ...prev, isRegistered: true }));
          options?.onSuccess?.();
        }
      },
      onUpdate: (registration) => {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isUpdateAvailable: true,
            registration,
          }));
          options?.onUpdate?.(registration);

          // Dispatch custom event for update prompt
          window.dispatchEvent(
            new CustomEvent('sw-update-available', {
              detail: { waiting: registration },
            })
          );
        }
      },
      onOfflineReady: () => {
        if (mounted) {
          options?.onOfflineReady?.();
        }
      },
      onError: (error) => {
        if (mounted) {
          options?.onError?.(error);
        }
      },
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for sync complete events
  useEffect(() => {
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Sync completed:', customEvent.detail);
      // Could trigger UI refresh or notification here
    };

    window.addEventListener('sw-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('sw-sync-complete', handleSyncComplete);
  }, []);

  // Get storage usage
  useEffect(() => {
    let mounted = true;

    getStorageQuota().then((usage) => {
      if (mounted && usage) {
        setState((prev) => ({ ...prev, storageUsage: usage }));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Update service worker
  const update = useCallback(() => {
    updateServiceWorker();
  }, []);

  // Refresh storage usage
  const refreshStorageUsage = useCallback(async () => {
    const usage = await getStorageQuota();
    if (usage) {
      setState((prev) => ({ ...prev, storageUsage: usage }));
    }
  }, []);

  return {
    ...state,
    update,
    refreshStorageUsage,
  };
}

// Simpler hook for just offline detection
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for storage quota management
export function useStorageQuota() {
  const [quota, setQuota] = useState<{ usage: number; quota: number; percentUsed: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const usage = await getStorageQuota();
    if (usage) {
      setQuota({
        ...usage,
        percentUsed: (usage.usage / usage.quota) * 100,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, isLoading, refresh };
}
