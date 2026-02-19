/**
 * SQLite Storage Implementation for Mobile (Expo)
 *
 * Provides a persistent storage layer for offline-first synchronization
 * using expo-sqlite and Drizzle ORM.
 *
 * Features:
 * - Sync queue management for offline operations
 * - Conflict resolution tracking
 * - Generic record operations (CRUD)
 * - Sync metadata tracking
 * - Full schema initialization
 */

import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import {
  users,
  listings,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  eventRegistrations,
  trainingModules,
  userTrainingProgress,
  mealPlans,
  recipes,
  shoppingLists,
  chatMessages,
  coupons,
  vendors,
  vendorReferrals,
  reviews,
  jobPosts,
  jobApplications,
  creditTransactions,
  subscriptionPlans,
  payments,
  notifications,
  videoCalls,
  videoCallParticipants,
  memberProfiles,
  syncQueue,
  deviceRegistry,
  conflictLog,
  auditLogs,
} from '@eat/shared/schema';

import type {
  StorageInterface,
  SyncOperation,
  ConflictEntry,
} from '@eat/shared/sync/SyncManager';

/**
 * SQLiteStorage - Mobile-optimized storage implementation
 *
 * Manages local SQLite database for offline-first sync on mobile devices.
 * Implements StorageInterface for seamless integration with SyncManager.
 */
export class SQLiteStorage implements StorageInterface {
  private db: SQLite.SQLiteDatabase | null = null;
  private schema: ReturnType<typeof drizzle> | null = null;
  private readonly DB_NAME = 'eat.db';
  private isInitialized = false;

  /**
   * Initialize database and create schema if needed
   */
  async init(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Open database
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);

      if (!this.db) {
        throw new Error('Failed to open database');
      }

      // Initialize Drizzle with expo-sqlite
      this.schema = drizzle(this.db);

      // Enable foreign keys
      await this.db.execAsync('PRAGMA foreign_keys = ON');

      // Create tables if they don't exist
      await this.createTables();

      this.isInitialized = true;

      console.log('[SQLiteStorage] Database initialized successfully');
    } catch (error) {
      console.error('[SQLiteStorage] Initialization failed:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create all required tables
   */
  private async createTables(): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Create sync queue table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          data TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          processed_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create conflict log table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS conflict_log (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          server_version INTEGER NOT NULL,
          client_version INTEGER NOT NULL,
          server_data TEXT NOT NULL,
          client_data TEXT NOT NULL,
          resolution TEXT,
          resolved_by TEXT,
          resolved_at TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create sync metadata table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Create indexes for common queries
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
        CREATE INDEX IF NOT EXISTS idx_conflict_log_user_id ON conflict_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_conflict_log_resolved ON conflict_log(resolved_at);
      `);

      console.log('[SQLiteStorage] Tables created successfully');
    } catch (error) {
      console.error('[SQLiteStorage] Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Get pending operations from sync queue
   */
  async getSyncQueue(userId: string): Promise<SyncOperation[]> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC`,
        [userId]
      );

      return rows.map(this.mapRowToSyncOperation);
    } catch (error) {
      console.error('[SQLiteStorage] getSyncQueue failed:', error);
      throw new Error(`Failed to get sync queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(
    operation: Omit<SyncOperation, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const id = this.generateUUID();
      const createdAt = new Date().toISOString();

      await this.db.runAsync(
        `INSERT INTO sync_queue (
          id, user_id, device_id, table_name, record_id,
          operation, data, status, retry_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          operation.userId,
          operation.deviceId,
          operation.tableName,
          operation.recordId,
          operation.operation,
          JSON.stringify(operation.data),
          operation.status,
          operation.retryCount,
          createdAt,
        ]
      );

      console.log(`[SQLiteStorage] Added operation to sync queue: ${id}`);
      return id;
    } catch (error) {
      console.error('[SQLiteStorage] addToSyncQueue failed:', error);
      throw new Error(`Failed to add to sync queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update sync queue operation status
   */
  async updateSyncQueueStatus(
    id: string,
    status: SyncOperation['status'],
    error?: string
  ): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const processedAt =
        status === 'completed' || status === 'failed' ? new Date().toISOString() : null;

      await this.db.runAsync(
        `UPDATE sync_queue SET status = ?, last_error = ?, processed_at = ? WHERE id = ?`,
        [status, error || null, processedAt, id]
      );

      console.log(`[SQLiteStorage] Updated sync queue status: ${id} -> ${status}`);
    } catch (error) {
      console.error('[SQLiteStorage] updateSyncQueueStatus failed:', error);
      throw new Error(`Failed to update sync queue status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove item from sync queue
   */
  async removeSyncQueueItem(id: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);

      console.log(`[SQLiteStorage] Removed sync queue item: ${id}`);
    } catch (error) {
      console.error('[SQLiteStorage] removeSyncQueueItem failed:', error);
      throw new Error(`Failed to remove sync queue item: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add conflict to conflict log
   */
  async addConflict(
    conflict: Omit<ConflictEntry, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const id = this.generateUUID();
      const createdAt = new Date().toISOString();

      await this.db.runAsync(
        `INSERT INTO conflict_log (
          id, table_name, record_id, user_id, device_id,
          server_version, client_version, server_data, client_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          conflict.tableName,
          conflict.recordId,
          conflict.userId,
          conflict.deviceId,
          conflict.serverVersion,
          conflict.clientVersion,
          JSON.stringify(conflict.serverData),
          JSON.stringify(conflict.clientData),
          createdAt,
        ]
      );

      console.log(`[SQLiteStorage] Added conflict: ${id}`);
      return id;
    } catch (error) {
      console.error('[SQLiteStorage] addConflict failed:', error);
      throw new Error(`Failed to add conflict: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get unresolved conflicts for a user
   */
  async getUnresolvedConflicts(userId: string): Promise<ConflictEntry[]> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM conflict_log WHERE user_id = ? AND resolved_at IS NULL ORDER BY created_at ASC`,
        [userId]
      );

      return rows.map(this.mapRowToConflictEntry);
    } catch (error) {
      console.error('[SQLiteStorage] getUnresolvedConflicts failed:', error);
      throw new Error(`Failed to get unresolved conflicts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update conflict resolution
   */
  async updateConflictResolution(
    id: string,
    resolution: ConflictEntry['resolution'],
    resolvedBy: string
  ): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const resolvedAt = new Date().toISOString();

      await this.db.runAsync(
        `UPDATE conflict_log SET resolution = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`,
        [resolution, resolvedBy, resolvedAt, id]
      );

      console.log(`[SQLiteStorage] Updated conflict resolution: ${id}`);
    } catch (error) {
      console.error('[SQLiteStorage] updateConflictResolution failed:', error);
      throw new Error(`Failed to update conflict resolution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableName: string, recordId: string): Promise<any> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Validate table name to prevent SQL injection
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [recordId]
      );

      return row ? this.mapRowToCamelCase(row) : null;
    } catch (error) {
      console.error('[SQLiteStorage] getRecord failed:', error);
      throw new Error(`Failed to get record: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Insert or update a record
   */
  async upsertRecord(tableName: string, record: any): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Validate table name to prevent SQL injection
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const recordSnakeCase = this.mapRecordToSnakeCase(record);
      const columns = Object.keys(recordSnakeCase);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((col) => {
        const value = recordSnakeCase[col];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value;
      });

      await this.db.runAsync(
        `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      console.log(`[SQLiteStorage] Upserted record: ${tableName}:${record.id}`);
    } catch (error) {
      console.error('[SQLiteStorage] upsertRecord failed:', error);
      throw new Error(`Failed to upsert record: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a record by ID
   */
  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Validate table name to prevent SQL injection
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      await this.db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [recordId]);

      console.log(`[SQLiteStorage] Deleted record: ${tableName}:${recordId}`);
    } catch (error) {
      console.error('[SQLiteStorage] deleteRecord failed:', error);
      throw new Error(`Failed to delete record: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all records from a table with optional filters
   */
  async getRecordsByTable(tableName: string, filters?: any): Promise<any[]> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Validate table name to prevent SQL injection
      if (!this.isValidTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      let query = `SELECT * FROM ${tableName}`;
      const params: any[] = [];

      if (filters && Object.keys(filters).length > 0) {
        const filterSnakeCase = this.mapRecordToSnakeCase(filters);
        const conditions = Object.keys(filterSnakeCase).map((key) => `${key} = ?`);
        query += ` WHERE ${conditions.join(' AND ')}`;
        params.push(...Object.values(filterSnakeCase));
      }

      const rows = await this.db.getAllAsync<any>(query, params);

      return rows.map((row) => this.mapRowToCamelCase(row));
    } catch (error) {
      console.error('[SQLiteStorage] getRecordsByTable failed:', error);
      throw new Error(`Failed to get records: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get last synced timestamp for a user
   */
  async getLastSyncedAt(userId: string, tableName?: string): Promise<Date | null> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;

      const row = await this.db.getFirstAsync<any>(
        `SELECT value FROM sync_metadata WHERE key = ?`,
        [key]
      );

      return row ? new Date(row.value) : null;
    } catch (error) {
      console.error('[SQLiteStorage] getLastSyncedAt failed:', error);
      throw new Error(`Failed to get last synced timestamp: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set last synced timestamp for a user
   */
  async setLastSyncedAt(
    userId: string,
    timestamp: Date,
    tableName?: string
  ): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;

      await this.db.runAsync(
        `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
        [key, timestamp.toISOString()]
      );

      console.log(
        `[SQLiteStorage] Updated last synced timestamp: ${key}`
      );
    } catch (error) {
      console.error('[SQLiteStorage] setLastSyncedAt failed:', error);
      throw new Error(`Failed to set last synced timestamp: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all sync queue items
   */
  async clearSyncQueue(): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.runAsync('DELETE FROM sync_queue');

      console.log('[SQLiteStorage] Cleared sync queue');
    } catch (error) {
      console.error('[SQLiteStorage] clearSyncQueue failed:', error);
      throw new Error(`Failed to clear sync queue: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get sync queue statistics
   */
  async getSyncQueueStats(userId: string): Promise<{ pending: number; failed: number; total: number }> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const stats = await this.db.getFirstAsync<any>(
        `SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          COUNT(*) as total
        FROM sync_queue WHERE user_id = ?`,
        [userId]
      );

      return {
        pending: stats?.pending || 0,
        failed: stats?.failed || 0,
        total: stats?.total || 0,
      };
    } catch (error) {
      console.error('[SQLiteStorage] getSyncQueueStats failed:', error);
      throw new Error(`Failed to get sync queue stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get conflict count for a user
   */
  async getConflictCount(userId: string): Promise<number> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const result = await this.db.getFirstAsync<any>(
        `SELECT COUNT(*) as count FROM conflict_log WHERE user_id = ? AND resolved_at IS NULL`,
        [userId]
      );

      return result?.count || 0;
    } catch (error) {
      console.error('[SQLiteStorage] getConflictCount failed:', error);
      throw new Error(`Failed to get conflict count: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.schema = null;
        this.isInitialized = false;
        console.log('[SQLiteStorage] Database closed');
      }
    } catch (error) {
      console.error('[SQLiteStorage] Failed to close database:', error);
      throw new Error(`Failed to close database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all data (use with caution - for development/testing only)
   */
  async clearAllData(): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.runAsync('DELETE FROM sync_queue');
      await this.db.runAsync('DELETE FROM conflict_log');
      await this.db.runAsync('DELETE FROM sync_metadata');

      console.log('[SQLiteStorage] Cleared all sync-related data');
    } catch (error) {
      console.error('[SQLiteStorage] clearAllData failed:', error);
      throw new Error(`Failed to clear all data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Map SQLite row to SyncOperation
   */
  private mapRowToSyncOperation(row: any): SyncOperation {
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      tableName: row.table_name,
      recordId: row.record_id,
      operation: row.operation as 'create' | 'update' | 'delete',
      data: JSON.parse(row.data),
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      retryCount: row.retry_count,
      lastError: row.last_error || undefined,
      createdAt: new Date(row.created_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }

  /**
   * Map SQLite row to ConflictEntry
   */
  private mapRowToConflictEntry(row: any): ConflictEntry {
    return {
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      userId: row.user_id,
      deviceId: row.device_id,
      serverVersion: row.server_version,
      clientVersion: row.client_version,
      serverData: JSON.parse(row.server_data),
      clientData: JSON.parse(row.client_data),
      resolution: row.resolution as ConflictEntry['resolution'] | undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Convert snake_case column names to camelCase
   */
  private mapRowToCamelCase(row: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }

  /**
   * Convert camelCase keys to snake_case for database
   */
  private mapRecordToSnakeCase(record: any): any {
    const result: any = {};
    for (const [key, value] of Object.entries(record)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }

  /**
   * Validate table name against whitelist
   */
  private isValidTableName(tableName: string): boolean {
    const validTables = [
      'users',
      'listings',
      'foraging_spots',
      'garden_clubs',
      'seed_banks',
      'resource_hubs',
      'events',
      'event_registrations',
      'training_modules',
      'user_training_progress',
      'meal_plans',
      'recipes',
      'shopping_lists',
      'chat_messages',
      'coupons',
      'vendors',
      'vendor_referrals',
      'reviews',
      'job_posts',
      'job_applications',
      'credit_transactions',
      'subscription_plans',
      'payments',
      'notifications',
      'video_calls',
      'video_call_participants',
      'member_profiles',
      'sync_queue',
      'device_registry',
      'conflict_log',
      'audit_logs',
      'sync_metadata',
    ];
    return validTables.includes(tableName);
  }

  /**
   * Generate UUID (simple implementation - in production use uuid library)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export default SQLiteStorage;
