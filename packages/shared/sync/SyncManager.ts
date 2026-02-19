/**
 * Client-side SyncManager for offline-first data synchronization
 *
 * Features:
 * - Queue offline operations in syncQueue
 * - Push local changes to server
 * - Pull server changes since lastSyncedAt
 * - Conflict resolution (last-write-wins)
 * - Auto-sync every 30 seconds when online
 * - Retry with exponential backoff
 *
 * Platform-agnostic: Works on web and mobile via dependency injection
 */

export interface SyncOperation {
  id: string;
  userId: string;
  deviceId: string;
  tableName: string;
  recordId: string;
  operation: "create" | "update" | "delete";
  data: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface ConflictEntry {
  id: string;
  tableName: string;
  recordId: string;
  userId: string;
  deviceId: string;
  serverVersion: number;
  clientVersion: number;
  serverData: Record<string, any>;
  clientData: Record<string, any>;
  resolution?: "server_wins" | "client_wins" | "manual" | "merged";
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface StorageInterface {
  // Sync queue operations
  getSyncQueue: (userId: string) => Promise<SyncOperation[]>;
  addToSyncQueue: (operation: Omit<SyncOperation, "id" | "createdAt">) => Promise<string>;
  updateSyncQueueStatus: (
    id: string,
    status: SyncOperation["status"],
    error?: string
  ) => Promise<void>;
  removeSyncQueueItem: (id: string) => Promise<void>;

  // Conflict log operations
  addConflict: (conflict: Omit<ConflictEntry, "id" | "createdAt">) => Promise<string>;
  getUnresolvedConflicts: (userId: string) => Promise<ConflictEntry[]>;
  updateConflictResolution: (
    id: string,
    resolution: ConflictEntry["resolution"],
    resolvedBy: string
  ) => Promise<void>;

  // Data operations
  getRecord: (tableName: string, recordId: string) => Promise<any>;
  upsertRecord: (tableName: string, record: any) => Promise<void>;
  deleteRecord: (tableName: string, recordId: string) => Promise<void>;
  getRecordsByTable: (tableName: string, filters?: any) => Promise<any[]>;

  // Sync metadata
  getLastSyncedAt: (userId: string, tableName?: string) => Promise<Date | null>;
  setLastSyncedAt: (userId: string, timestamp: Date, tableName?: string) => Promise<void>;
}

export interface SyncManagerConfig {
  apiUrl: string;
  storage: StorageInterface;
  userId: string;
  deviceId: string;
  authToken: string;
  autoSyncInterval?: number; // milliseconds, default 30000 (30s)
  maxRetries?: number; // default 3
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: ConflictEntry) => void;
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  conflictsCount: number;
  errors: string[];
  timestamp: Date;
}

export class SyncManager {
  private config: Required<SyncManagerConfig> & SyncManagerConfig;
  private syncTimer: any = null;
  private isSyncing = false;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(config: SyncManagerConfig) {
    this.config = {
      ...config,
      autoSyncInterval: config.autoSyncInterval ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      onSyncStart: config.onSyncStart ?? (() => {}),
      onSyncComplete: config.onSyncComplete ?? (() => {}),
      onSyncError: config.onSyncError ?? (() => {}),
      onConflict: config.onConflict ?? (() => {}),
    };
  }

  /**
   * Start auto-sync interval
   */
  public startSync(): void {
    if (this.syncTimer) {
      console.warn("SyncManager: Auto-sync already started");
      return;
    }

    console.log(`SyncManager: Starting auto-sync every ${this.config.autoSyncInterval}ms`);

    // Run initial sync
    this.performSync().catch((error) => {
      console.error("SyncManager: Initial sync failed", error);
    });

    // Set up interval
    this.syncTimer = setInterval(() => {
      if (!this.isSyncing) {
        this.performSync().catch((error) => {
          console.error("SyncManager: Periodic sync failed", error);
        });
      }
    }, this.config.autoSyncInterval);
  }

  /**
   * Stop auto-sync interval
   */
  public stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("SyncManager: Auto-sync stopped");
    }
  }

  /**
   * Perform full sync: push local changes, pull server changes, resolve conflicts
   */
  public async performSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.warn("SyncManager: Sync already in progress, skipping");
      throw new Error("Sync already in progress");
    }

    this.isSyncing = true;
    this.config.onSyncStart();

    const result: SyncResult = {
      success: false,
      pushedCount: 0,
      pulledCount: 0,
      conflictsCount: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Step 1: Push local changes to server
      const pushResult = await this.pushChanges();
      result.pushedCount = pushResult.count;
      result.errors.push(...pushResult.errors);

      // Step 2: Pull server changes
      const pullResult = await this.pullChanges();
      result.pulledCount = pullResult.count;
      result.errors.push(...pullResult.errors);

      // Step 3: Resolve conflicts
      const conflictResult = await this.resolveConflicts();
      result.conflictsCount = conflictResult.count;
      result.errors.push(...conflictResult.errors);

      // Mark success if no critical errors
      result.success = result.errors.length === 0;

      // Reset failure counter on success
      if (result.success) {
        this.consecutiveFailures = 0;
      }

      this.config.onSyncComplete(result);
      console.log("SyncManager: Sync completed", result);

      return result;
    } catch (error) {
      this.consecutiveFailures++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      this.config.onSyncError(error as Error);
      console.error("SyncManager: Sync failed", error);

      // Stop auto-sync if too many consecutive failures
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.error("SyncManager: Too many consecutive failures, stopping auto-sync");
        this.stopSync();
      }

      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server
   */
  public async pushChanges(): Promise<{ count: number; errors: string[] }> {
    const result = { count: 0, errors: [] as string[] };

    try {
      // Get pending operations from sync queue
      const operations = await this.config.storage.getSyncQueue(this.config.userId);
      const pendingOps = operations.filter((op) => op.status === "pending");

      if (pendingOps.length === 0) {
        console.log("SyncManager: No pending operations to push");
        return result;
      }

      console.log(`SyncManager: Pushing ${pendingOps.length} operations to server`);

      // Process each operation
      for (const operation of pendingOps) {
        try {
          // Skip if retry count exceeded
          if (operation.retryCount >= this.config.maxRetries) {
            result.errors.push(
              `Operation ${operation.id} exceeded max retries (${this.config.maxRetries})`
            );
            await this.config.storage.updateSyncQueueStatus(
              operation.id,
              "failed",
              "Max retries exceeded"
            );
            continue;
          }

          // Mark as processing
          await this.config.storage.updateSyncQueueStatus(operation.id, "processing");

          // Send to server
          const endpoint = `${this.config.apiUrl}/sync/${operation.tableName}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.config.authToken}`,
            },
            body: JSON.stringify({
              operation: operation.operation,
              recordId: operation.recordId,
              data: operation.data,
              deviceId: this.config.deviceId,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const responseData = await response.json();

          // Handle conflicts
          if (responseData.conflict) {
            await this.handleConflict(operation, responseData.serverData);
            result.errors.push(`Conflict detected for ${operation.tableName}:${operation.recordId}`);
            continue;
          }

          // Mark as completed
          await this.config.storage.updateSyncQueueStatus(operation.id, "completed");
          await this.config.storage.removeSyncQueueItem(operation.id);
          result.count++;

          console.log(`SyncManager: Pushed ${operation.operation} for ${operation.tableName}:${operation.recordId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`SyncManager: Failed to push operation ${operation.id}`, error);

          // Update retry count and error
          await this.config.storage.updateSyncQueueStatus(
            operation.id,
            "failed",
            errorMessage
          );

          // Re-add to queue with incremented retry count
          await this.config.storage.addToSyncQueue({
            ...operation,
            retryCount: operation.retryCount + 1,
            status: "pending",
            lastError: errorMessage,
          });

          result.errors.push(`Failed to push ${operation.tableName}:${operation.recordId}: ${errorMessage}`);
        }

        // Add exponential backoff delay between operations
        if (pendingOps.indexOf(operation) < pendingOps.length - 1) {
          await this.delay(100 * Math.pow(2, operation.retryCount));
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("SyncManager: pushChanges failed", error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Pull server changes since last sync
   */
  public async pullChanges(): Promise<{ count: number; errors: string[] }> {
    const result = { count: 0, errors: [] as string[] };

    try {
      // Get last synced timestamp
      const lastSyncedAt = await this.config.storage.getLastSyncedAt(this.config.userId);
      const since = lastSyncedAt?.toISOString() ?? new Date(0).toISOString();

      console.log(`SyncManager: Pulling changes since ${since}`);

      // Request changes from server
      const endpoint = `${this.config.apiUrl}/sync/pull`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify({
          userId: this.config.userId,
          deviceId: this.config.deviceId,
          since,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const { changes, timestamp } = data;

      if (!changes || changes.length === 0) {
        console.log("SyncManager: No server changes to pull");
        await this.config.storage.setLastSyncedAt(this.config.userId, new Date(timestamp));
        return result;
      }

      console.log(`SyncManager: Applying ${changes.length} server changes`);

      // Apply each change
      for (const change of changes) {
        try {
          const { tableName, recordId, operation, data: recordData, version } = change;

          // Get local record for conflict detection
          const localRecord = await this.config.storage.getRecord(tableName, recordId);

          // Check for conflicts
          if (localRecord && localRecord.version && localRecord.version !== version - 1) {
            await this.handleConflict(
              {
                id: recordId,
                userId: this.config.userId,
                deviceId: this.config.deviceId,
                tableName,
                recordId,
                operation: "update",
                data: localRecord,
                status: "pending",
                retryCount: 0,
                createdAt: new Date(),
              },
              recordData
            );
            result.errors.push(`Conflict detected for ${tableName}:${recordId}`);
            continue;
          }

          // Apply change based on operation
          if (operation === "delete") {
            await this.config.storage.deleteRecord(tableName, recordId);
          } else {
            await this.config.storage.upsertRecord(tableName, {
              ...recordData,
              syncStatus: "synced",
              lastSyncedAt: new Date(),
              deviceId: this.config.deviceId,
            });
          }

          result.count++;
          console.log(`SyncManager: Applied ${operation} for ${tableName}:${recordId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`SyncManager: Failed to apply change`, error);
          result.errors.push(`Failed to apply change: ${errorMessage}`);
        }
      }

      // Update last synced timestamp
      await this.config.storage.setLastSyncedAt(this.config.userId, new Date(timestamp));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("SyncManager: pullChanges failed", error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   */
  public async resolveConflicts(): Promise<{ count: number; errors: string[] }> {
    const result = { count: 0, errors: [] as string[] };

    try {
      const conflicts = await this.config.storage.getUnresolvedConflicts(this.config.userId);

      if (conflicts.length === 0) {
        console.log("SyncManager: No conflicts to resolve");
        return result;
      }

      console.log(`SyncManager: Resolving ${conflicts.length} conflicts`);

      for (const conflict of conflicts) {
        try {
          // Last-write-wins: compare versions
          const serverWins = conflict.serverVersion > conflict.clientVersion;
          const winningData = serverWins ? conflict.serverData : conflict.clientData;
          const resolution = serverWins ? "server_wins" : "client_wins";

          // Apply winning data
          await this.config.storage.upsertRecord(conflict.tableName, {
            ...winningData,
            version: Math.max(conflict.serverVersion, conflict.clientVersion) + 1,
            syncStatus: "synced",
            lastSyncedAt: new Date(),
            deviceId: this.config.deviceId,
          });

          // Mark conflict as resolved
          await this.config.storage.updateConflictResolution(
            conflict.id,
            resolution,
            this.config.userId
          );

          result.count++;
          console.log(
            `SyncManager: Resolved conflict for ${conflict.tableName}:${conflict.recordId} (${resolution})`
          );

          // Notify listener
          this.config.onConflict(conflict);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`SyncManager: Failed to resolve conflict ${conflict.id}`, error);
          result.errors.push(`Failed to resolve conflict: ${errorMessage}`);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("SyncManager: resolveConflicts failed", error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Handle conflict by logging to conflict table
   */
  private async handleConflict(
    localOperation: SyncOperation,
    serverData: Record<string, any>
  ): Promise<void> {
    try {
      const conflict: Omit<ConflictEntry, "id" | "createdAt"> = {
        tableName: localOperation.tableName,
        recordId: localOperation.recordId,
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        serverVersion: serverData.version ?? 0,
        clientVersion: localOperation.data.version ?? 0,
        serverData,
        clientData: localOperation.data,
      };

      await this.config.storage.addConflict(conflict);
      console.log(
        `SyncManager: Conflict logged for ${localOperation.tableName}:${localOperation.recordId}`
      );
    } catch (error) {
      console.error("SyncManager: Failed to log conflict", error);
      throw error;
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Queue an offline operation
   */
  public async queueOperation(
    tableName: string,
    recordId: string,
    operation: "create" | "update" | "delete",
    data: Record<string, any>
  ): Promise<string> {
    try {
      const operationId = await this.config.storage.addToSyncQueue({
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        tableName,
        recordId,
        operation,
        data,
        status: "pending",
        retryCount: 0,
      });

      console.log(`SyncManager: Queued ${operation} for ${tableName}:${recordId}`);

      // Trigger immediate sync if online
      if (!this.isSyncing) {
        this.performSync().catch((error) => {
          console.error("SyncManager: Immediate sync after queue failed", error);
        });
      }

      return operationId;
    } catch (error) {
      console.error("SyncManager: Failed to queue operation", error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    isSyncing: boolean;
    consecutiveFailures: number;
    autoSyncActive: boolean;
  } {
    return {
      isSyncing: this.isSyncing,
      consecutiveFailures: this.consecutiveFailures,
      autoSyncActive: this.syncTimer !== null,
    };
  }

  /**
   * Force immediate sync
   */
  public async forceSync(): Promise<SyncResult> {
    return this.performSync();
  }
}
