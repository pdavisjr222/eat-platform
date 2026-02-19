/**
 * SQLiteStorage Usage Example
 *
 * This file demonstrates how to initialize and use the SQLiteStorage
 * implementation with the SyncManager for offline-first synchronization.
 */

import SQLiteStorage from './SQLiteStorage';
import { SyncManager } from '@eat/shared/sync/SyncManager';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

/**
 * Example: Initialize storage and sync manager in your app
 */
export async function initializeStorage() {
  try {
    // Create storage instance
    const storage = new SQLiteStorage();

    // Initialize database
    await storage.init();

    console.log('Storage initialized successfully');

    return storage;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw error;
  }
}

/**
 * Example: Set up SyncManager with SQLiteStorage
 */
export async function setupSyncManager(
  userId: string,
  deviceId: string,
  authToken: string
) {
  try {
    // Initialize storage
    const storage = await initializeStorage();

    // Create sync manager
    const syncManager = new SyncManager({
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
      storage,
      userId,
      deviceId,
      authToken,
      autoSyncInterval: 30000, // 30 seconds
      maxRetries: 3,

      // Optional callbacks
      onSyncStart: () => {
        console.log('Sync started');
      },

      onSyncComplete: (result) => {
        console.log('Sync completed:', result);
        // Update UI based on sync result
      },

      onSyncError: (error) => {
        console.error('Sync error:', error);
        // Show error notification to user
      },

      onConflict: (conflict) => {
        console.warn('Conflict detected:', conflict);
        // Notify user about conflict resolution
      },
    });

    // Start auto-sync
    syncManager.startSync();

    return { storage, syncManager };
  } catch (error) {
    console.error('Failed to setup sync manager:', error);
    throw error;
  }
}

/**
 * Example: React hook for sync manager
 */
export function useSyncManager(userId: string, deviceId: string) {
  const [syncManager, setSyncManager] = useState<any>(null);
  const [storage, setStorage] = useState<SQLiteStorage | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        // Get auth token from secure storage
        const authToken = await SecureStore.getItemAsync('authToken');

        if (!authToken) {
          throw new Error('Auth token not found');
        }

        // Setup sync manager
        const { storage: store, syncManager: manager } = await setupSyncManager(
          userId,
          deviceId,
          authToken
        );

        if (mounted) {
          setStorage(store);
          setSyncManager(manager);
          setSyncError(null);
        }
      } catch (error) {
        if (mounted) {
          setSyncError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    setup();

    return () => {
      mounted = false;
      // Cleanup on unmount if needed
    };
  }, [userId, deviceId]);

  const forceSyncNow = async () => {
    if (!syncManager) {
      setSyncError('Sync manager not initialized');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      const result = await syncManager.forceSync();
      console.log('Force sync result:', result);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    storage,
    syncManager,
    isSyncing,
    syncError,
    forceSyncNow,
  };
}

/**
 * Example: Queue an offline operation
 */
export async function queueOfflineOperation(
  syncManager: any,
  tableName: string,
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, any>
) {
  try {
    const operationId = await syncManager.queueOperation(
      tableName,
      recordId,
      operation,
      data
    );

    console.log(`Queued ${operation} operation: ${operationId}`);
    return operationId;
  } catch (error) {
    console.error('Failed to queue operation:', error);
    throw error;
  }
}

/**
 * Example: Get sync status
 */
export function getSyncStatus(syncManager: any) {
  if (!syncManager) {
    return null;
  }

  return syncManager.getSyncStatus();
}

/**
 * Example: Clean up storage on logout
 */
export async function cleanupStorage(storage: SQLiteStorage | null) {
  if (!storage) {
    return;
  }

  try {
    // Clear sync queue and conflicts on logout
    await storage.clearAllData();

    // Close database
    await storage.close();

    console.log('Storage cleaned up');
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
    throw error;
  }
}

/**
 * Example usage in a React component
 */
/*
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSyncManager } from './SQLiteStorage.example';

export function SyncStatusScreen({ userId, deviceId }: { userId: string; deviceId: string }) {
  const { syncManager, storage, isSyncing, syncError, forceSyncNow } = useSyncManager(
    userId,
    deviceId
  );

  const handleManualSync = async () => {
    await forceSyncNow();
  };

  const handleGetQueueStats = async () => {
    if (storage) {
      const stats = await storage.getSyncQueueStats(userId);
      console.log('Queue stats:', stats);
    }
  };

  return (
    <View>
      <Text>Sync Status</Text>
      <Text>Syncing: {isSyncing ? 'Yes' : 'No'}</Text>
      {syncError && <Text>Error: {syncError}</Text>}

      <TouchableOpacity onPress={handleManualSync} disabled={isSyncing}>
        <Text>Force Sync Now</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGetQueueStats}>
        <Text>View Queue Stats</Text>
      </TouchableOpacity>
    </View>
  );
}
*/
