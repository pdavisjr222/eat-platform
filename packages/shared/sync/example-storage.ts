/**
 * Example storage implementations for SyncManager
 *
 * These are reference implementations showing how to adapt
 * different storage backends to the StorageInterface.
 */

import { StorageInterface, SyncOperation, ConflictEntry } from "./SyncManager";

// ============================================================================
// WEB IMPLEMENTATION (IndexedDB)
// ============================================================================

export class WebStorage implements StorageInterface {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "EATApp";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sync queue store
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
          syncStore.createIndex("userId", "userId", { unique: false });
          syncStore.createIndex("status", "status", { unique: false });
        }

        // Create conflict log store
        if (!db.objectStoreNames.contains("conflictLog")) {
          const conflictStore = db.createObjectStore("conflictLog", { keyPath: "id" });
          conflictStore.createIndex("userId", "userId", { unique: false });
          conflictStore.createIndex("resolved", "resolvedAt", { unique: false });
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains("syncMeta")) {
          db.createObjectStore("syncMeta", { keyPath: "key" });
        }

        // Create data stores for each table
        const tables = [
          "users", "listings", "foragingSpots", "events", "recipes",
          "mealPlans", "shoppingLists", "chatMessages", "notifications"
        ];

        tables.forEach(tableName => {
          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, { keyPath: "id" });
            store.createIndex("userId", "userId", { unique: false });
          }
        });
      };
    });
  }

  // Sync queue operations
  async getSyncQueue(userId: string): Promise<SyncOperation[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("syncQueue", "readonly");
    const store = tx.objectStore("syncQueue");
    const index = store.index("userId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(operation: Omit<SyncOperation, "id" | "createdAt">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = crypto.randomUUID();
    const tx = this.db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const request = store.add({ ...operation, id, createdAt: new Date() });
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueStatus(id: string, status: SyncOperation["status"], error?: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = status;
          if (error) operation.lastError = error;
          if (status === "completed" || status === "failed") {
            operation.processedAt = new Date();
          }
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`Operation ${id} not found`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Conflict log operations
  async addConflict(conflict: Omit<ConflictEntry, "id" | "createdAt">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = crypto.randomUUID();
    const tx = this.db.transaction("conflictLog", "readwrite");
    const store = tx.objectStore("conflictLog");

    return new Promise((resolve, reject) => {
      const request = store.add({ ...conflict, id, createdAt: new Date() });
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getUnresolvedConflicts(userId: string): Promise<ConflictEntry[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("conflictLog", "readonly");
    const store = tx.objectStore("conflictLog");
    const index = store.index("userId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const conflicts = request.result.filter((c: ConflictEntry) => !c.resolvedAt);
        resolve(conflicts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateConflictResolution(id: string, resolution: ConflictEntry["resolution"], resolvedBy: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction("conflictLog", "readwrite");
    const store = tx.objectStore("conflictLog");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const conflict = getRequest.result;
        if (conflict) {
          conflict.resolution = resolution;
          conflict.resolvedBy = resolvedBy;
          conflict.resolvedAt = new Date();
          const putRequest = store.put(conflict);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`Conflict ${id} not found`));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Data operations
  async getRecord(tableName: string, recordId: string): Promise<any> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction(tableName, "readonly");
    const store = tx.objectStore(tableName);

    return new Promise((resolve, reject) => {
      const request = store.get(recordId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async upsertRecord(tableName: string, record: any): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction(tableName, "readwrite");
    const store = tx.objectStore(tableName);

    return new Promise((resolve, reject) => {
      const request = store.delete(recordId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsByTable(tableName: string, filters?: any): Promise<any[]> {
    if (!this.db) throw new Error("Database not initialized");

    const tx = this.db.transaction(tableName, "readonly");
    const store = tx.objectStore(tableName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result;

        // Apply filters if provided
        if (filters) {
          results = results.filter((record: any) => {
            return Object.entries(filters).every(([key, value]) => record[key] === value);
          });
        }

        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync metadata
  async getLastSyncedAt(userId: string, tableName?: string): Promise<Date | null> {
    if (!this.db) throw new Error("Database not initialized");

    const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;
    const tx = this.db.transaction("syncMeta", "readonly");
    const store = tx.objectStore("syncMeta");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? new Date(result.timestamp) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setLastSyncedAt(userId: string, timestamp: Date, tableName?: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;
    const tx = this.db.transaction("syncMeta", "readwrite");
    const store = tx.objectStore("syncMeta");

    return new Promise((resolve, reject) => {
      const request = store.put({ key, timestamp: timestamp.toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// MOBILE IMPLEMENTATION (SQLite via Expo)
// ============================================================================

export class MobileStorage implements StorageInterface {
  private db: any; // SQLite.SQLiteDatabase type

  constructor(db: any) {
    this.db = db;
  }

  // Sync queue operations
  async getSyncQueue(userId: string): Promise<SyncOperation[]> {
    const result = await this.db.getAllAsync(
      "SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );
    return result.map(this.mapSyncOperation);
  }

  async addToSyncQueue(operation: Omit<SyncOperation, "id" | "createdAt">): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.runAsync(
      `INSERT INTO sync_queue (id, user_id, device_id, table_name, record_id,
       operation, data, status, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        new Date().toISOString(),
      ]
    );
    return id;
  }

  async updateSyncQueueStatus(id: string, status: SyncOperation["status"], error?: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE sync_queue SET status = ?, last_error = ?, processed_at = ?
       WHERE id = ?`,
      [status, error || null, status === "completed" || status === "failed" ? new Date().toISOString() : null, id]
    );
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  // Conflict log operations
  async addConflict(conflict: Omit<ConflictEntry, "id" | "createdAt">): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.runAsync(
      `INSERT INTO conflict_log (id, table_name, record_id, user_id, device_id,
       server_version, client_version, server_data, client_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        new Date().toISOString(),
      ]
    );
    return id;
  }

  async getUnresolvedConflicts(userId: string): Promise<ConflictEntry[]> {
    const result = await this.db.getAllAsync(
      "SELECT * FROM conflict_log WHERE user_id = ? AND resolved_at IS NULL",
      [userId]
    );
    return result.map(this.mapConflict);
  }

  async updateConflictResolution(id: string, resolution: ConflictEntry["resolution"], resolvedBy: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE conflict_log SET resolution = ?, resolved_by = ?, resolved_at = ? WHERE id = ?",
      [resolution, resolvedBy, new Date().toISOString(), id]
    );
  }

  // Data operations
  async getRecord(tableName: string, recordId: string): Promise<any> {
    const result = await this.db.getFirstAsync(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [recordId]
    );
    return result ? this.mapRecord(result) : null;
  }

  async upsertRecord(tableName: string, record: any): Promise<void> {
    // Get table columns dynamically
    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map(col => {
      const value = record[col];
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object") return JSON.stringify(value);
      return value;
    });

    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")})
       VALUES (${placeholders})`,
      values
    );
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [recordId]);
  }

  async getRecordsByTable(tableName: string, filters?: any): Promise<any[]> {
    let query = `SELECT * FROM ${tableName}`;
    const params: any[] = [];

    if (filters) {
      const conditions = Object.keys(filters).map(key => `${key} = ?`);
      query += ` WHERE ${conditions.join(" AND ")}`;
      params.push(...Object.values(filters));
    }

    const result = await this.db.getAllAsync(query, params);
    return result.map(this.mapRecord);
  }

  // Sync metadata
  async getLastSyncedAt(userId: string, tableName?: string): Promise<Date | null> {
    const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;
    const result = await this.db.getFirstAsync(
      "SELECT value FROM sync_metadata WHERE key = ?",
      [key]
    );
    return result ? new Date(result.value) : null;
  }

  async setLastSyncedAt(userId: string, timestamp: Date, tableName?: string): Promise<void> {
    const key = tableName ? `lastSync:${userId}:${tableName}` : `lastSync:${userId}`;
    await this.db.runAsync(
      "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)",
      [key, timestamp.toISOString()]
    );
  }

  // Helper mappers
  private mapSyncOperation(row: any): SyncOperation {
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      tableName: row.table_name,
      recordId: row.record_id,
      operation: row.operation,
      data: JSON.parse(row.data),
      status: row.status,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: new Date(row.created_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }

  private mapConflict(row: any): ConflictEntry {
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
      resolution: row.resolution,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRecord(row: any): any {
    // Convert snake_case columns to camelCase
    const record: any = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      record[camelKey] = value;
    }
    return record;
  }
}
