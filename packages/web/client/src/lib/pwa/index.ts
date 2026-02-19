// PWA Module - Service Worker Registration and Management

// Core service worker functions
export {
  registerServiceWorker,
  unregisterServiceWorker,
  updateServiceWorker,
  isServiceWorkerControlling,
  getServiceWorkerRegistration,
  requestPersistentStorage,
  checkStoragePersistence,
  getStorageQuota,
  clearAllCaches,
} from './registerServiceWorker';

// React hooks
export {
  useServiceWorker,
  useOnlineStatus,
  useStorageQuota,
} from './useServiceWorker';

export type { default as ServiceWorkerHelpers } from './registerServiceWorker';
