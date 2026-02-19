/**
 * Type definitions for SQLite Storage
 *
 * Exported types for use throughout the mobile app
 */

import type { SQLiteStorage } from './SQLiteStorage';
import type {
  StorageInterface,
  SyncOperation,
  ConflictEntry,
  SyncManagerConfig,
  SyncResult,
} from '@eat/shared/sync/SyncManager';

/**
 * Type alias for SQLiteStorage instance
 */
export type StorageInstance = SQLiteStorage;

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  failed: number;
  total: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  isSyncing: boolean;
  consecutiveFailures: number;
  autoSyncActive: boolean;
}

/**
 * Storage initialization options
 */
export interface StorageInitOptions {
  /**
   * Database filename (default: 'eat.db')
   */
  dbName?: string;

  /**
   * Enable encryption (requires encryption key)
   */
  encrypted?: boolean;

  /**
   * Encryption key for database
   */
  encryptionKey?: string;

  /**
   * Clear all data on init (for testing)
   */
  clearOnInit?: boolean;
}

/**
 * Sync queue item with mapped types
 */
export type SyncQueueItem = SyncOperation;

/**
 * Conflict item with mapped types
 */
export type ConflictItem = ConflictEntry;

/**
 * Record data (generic)
 */
export interface Record {
  id: string;
  [key: string]: any;
}

/**
 * Filter options for getRecordsByTable
 */
export interface FilterOptions {
  [key: string]: any;
}

/**
 * Sync operation statistics
 */
export interface SyncStats {
  totalOperations: number;
  pendingCount: number;
  failedCount: number;
  completedCount: number;
  averageRetries: number;
  oldestOperationTime: Date | null;
}

/**
 * Conflict statistics
 */
export interface ConflictStats {
  totalConflicts: number;
  unresolvedCount: number;
  serverWinsCount: number;
  clientWinsCount: number;
  manualResolutionCount: number;
  mergedCount: number;
}

/**
 * Storage health check result
 */
export interface HealthCheckResult {
  isConnected: boolean;
  tableCount: number;
  syncQueueSize: number;
  conflictLogSize: number;
  lastError?: string;
  timestamp: Date;
}

/**
 * Export types for consumer use
 */
export type {
  StorageInterface,
  SyncOperation,
  ConflictEntry,
  SyncManagerConfig,
  SyncResult,
};
