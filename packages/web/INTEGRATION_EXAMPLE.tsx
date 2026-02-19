// Example: How to integrate PWA features in your main App component
// This file is for reference only - integrate these patterns into your actual App.tsx

import { useEffect } from 'react';
import { useServiceWorker, useOnlineStatus, requestPersistentStorage } from '@/lib/pwa';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';

export function AppWithPWA() {
  const isOnline = useOnlineStatus();
  const {
    isRegistered,
    isUpdateAvailable,
    isOffline,
    storageUsage,
    update,
  } = useServiceWorker({
    onSuccess: () => {
      console.log('✅ PWA is ready for offline use');
    },
    onUpdate: () => {
      console.log('🔄 New version available');
    },
    onOfflineReady: () => {
      console.log('📱 App is offline-ready');
    },
    onError: (error) => {
      console.error('❌ Service worker error:', error);
    },
  });

  // Request persistent storage on mount
  useEffect(() => {
    if (import.meta.env.PROD) {
      requestPersistentStorage().then((isPersisted) => {
        if (isPersisted) {
          console.log('✅ Storage will persist');
        } else {
          console.warn('⚠️ Storage may be cleared');
        }
      });
    }
  }, []);

  // Show offline indicator
  useEffect(() => {
    if (isOffline) {
      console.warn('📴 You are offline');
      // Show offline banner in UI
    }
  }, [isOffline]);

  // Log storage usage
  useEffect(() => {
    if (storageUsage) {
      const percentUsed = (storageUsage.usage / storageUsage.quota) * 100;
      console.log(`💾 Storage: ${percentUsed.toFixed(1)}% used`);

      if (percentUsed > 80) {
        console.warn('⚠️ Storage almost full');
      }
    }
  }, [storageUsage]);

  return (
    <div className="app">
      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
          📴 You are offline. Some features may be limited.
        </div>
      )}

      {/* PWA update prompt */}
      <PWAUpdatePrompt
        onUpdate={() => console.log('Updating app...')}
        onDismiss={() => console.log('Update dismissed')}
      />

      {/* Your app content */}
      <YourAppContent />

      {/* Optional: Storage usage indicator in footer */}
      {storageUsage && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500">
          Storage: {((storageUsage.usage / storageUsage.quota) * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// Alternative: Simple manual registration in main.tsx
// Add this to your main.tsx or App.tsx:

/*
import { registerServiceWorker } from '@/lib/pwa';

if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => console.log('Service worker registered'),
    onUpdate: (registration) => {
      // Show update prompt
      const shouldUpdate = confirm('New version available. Update now?');
      if (shouldUpdate) {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    },
  });
}
*/

// Alternative: Listen for sync events globally
/*
window.addEventListener('sw-sync-complete', (event: CustomEvent) => {
  console.log('Background sync completed:', event.detail);

  // Refresh data in your app
  queryClient.invalidateQueries();

  // Or show notification
  toast.success('Data synced successfully');
});
*/

// Alternative: Check online status with simple hook
/*
function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      You are offline. Changes will sync when you reconnect.
    </div>
  );
}
*/

// Alternative: Monitor storage quota
/*
function StorageWarning() {
  const { quota, isLoading, refresh } = useStorageQuota();

  if (isLoading || !quota) return null;

  if (quota.percentUsed > 80) {
    return (
      <div className="storage-warning">
        ⚠️ Storage is {quota.percentUsed.toFixed(0)}% full.
        Consider clearing cached data.
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  return null;
}
*/

function YourAppContent() {
  return <div>Your app content goes here</div>;
}
