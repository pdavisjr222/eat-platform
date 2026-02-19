# SyncManager

Client-side synchronization manager for offline-first data operations.

## Features

- **Offline queue**: Queue operations when offline, sync when back online
- **Push/Pull sync**: Bidirectional sync with server
- **Conflict resolution**: Last-write-wins strategy (customizable)
- **Auto-sync**: Configurable interval (default: 30 seconds)
- **Retry logic**: Exponential backoff for failed operations
- **Platform-agnostic**: Works on web and mobile via dependency injection

## Usage

### 1. Implement StorageInterface

The SyncManager requires a storage adapter that implements the `StorageInterface`. This allows it to work with any storage backend (SQLite, IndexedDB, etc.).

#### Example: Web (IndexedDB)

```typescript
import { StorageInterface } from "@eat/shared/sync";

export class WebStorage implements StorageInterface {
  private db: IDBDatabase;

  async getSyncQueue(userId: string) {
    const tx = this.db.transaction("syncQueue", "readonly");
    const store = tx.objectStore("syncQueue");
    const index = store.index("userId");
    const operations = await index.getAll(userId);
    return operations;
  }

  async addToSyncQueue(operation) {
    const tx = this.db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");
    const id = crypto.randomUUID();
    await store.add({ ...operation, id, createdAt: new Date() });
    return id;
  }

  // ... implement other methods
}
```

#### Example: Mobile (SQLite via Expo)

```typescript
import * as SQLite from "expo-sqlite";
import { StorageInterface } from "@eat/shared/sync";

export class MobileStorage implements StorageInterface {
  private db: SQLite.SQLiteDatabase;

  async getSyncQueue(userId: string) {
    const result = await this.db.getAllAsync(
      "SELECT * FROM sync_queue WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );
    return result.map(this.mapSyncOperation);
  }

  async addToSyncQueue(operation) {
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

  // ... implement other methods
}
```

### 2. Initialize SyncManager

```typescript
import { SyncManager } from "@eat/shared/sync";
import { WebStorage } from "./storage/web";

const storage = new WebStorage();
await storage.init();

const syncManager = new SyncManager({
  apiUrl: "https://api.eatplatform.com/v1",
  storage,
  userId: "user-123",
  deviceId: "device-456",
  authToken: "jwt-token-here",
  autoSyncInterval: 30000, // 30 seconds
  maxRetries: 3,
  onSyncStart: () => console.log("Sync started"),
  onSyncComplete: (result) => console.log("Sync completed", result),
  onSyncError: (error) => console.error("Sync error", error),
  onConflict: (conflict) => console.warn("Conflict detected", conflict),
});
```

### 3. Start Auto-Sync

```typescript
// Start automatic syncing
syncManager.startSync();

// Stop when user logs out
syncManager.stopSync();
```

### 4. Queue Offline Operations

```typescript
// Example: User creates a listing while offline
const listingData = {
  id: "listing-123",
  title: "Organic Tomatoes",
  price: 5.99,
  version: 1,
  deviceId: "device-456",
  syncStatus: "pending",
  createdAt: new Date(),
};

// Queue the operation
await syncManager.queueOperation(
  "listings", // table name
  "listing-123", // record ID
  "create", // operation type
  listingData
);

// SyncManager will automatically push this when online
```

### 5. Manual Sync

```typescript
// Force immediate sync
const result = await syncManager.forceSync();

console.log(`
  Success: ${result.success}
  Pushed: ${result.pushedCount} operations
  Pulled: ${result.pulledCount} changes
  Conflicts: ${result.conflictsCount}
  Errors: ${result.errors.join(", ")}
`);
```

### 6. Check Sync Status

```typescript
const status = syncManager.getSyncStatus();

console.log(`
  Is syncing: ${status.isSyncing}
  Auto-sync active: ${status.autoSyncActive}
  Consecutive failures: ${status.consecutiveFailures}
`);
```

## API Endpoints Required

Your server must implement these endpoints:

### POST /api/v1/sync/:tableName

Push a single operation to the server.

**Request:**
```json
{
  "operation": "create" | "update" | "delete",
  "recordId": "record-123",
  "data": { ... },
  "deviceId": "device-456"
}
```

**Response (success):**
```json
{
  "success": true,
  "version": 2
}
```

**Response (conflict):**
```json
{
  "conflict": true,
  "serverData": { "version": 3, ... }
}
```

### POST /api/v1/sync/pull

Pull all changes since last sync.

**Request:**
```json
{
  "userId": "user-123",
  "deviceId": "device-456",
  "since": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "changes": [
    {
      "tableName": "listings",
      "recordId": "listing-456",
      "operation": "update",
      "data": { ... },
      "version": 2
    }
  ],
  "timestamp": "2024-01-08T12:00:00.000Z"
}
```

## Conflict Resolution

By default, SyncManager uses **last-write-wins** strategy:
- Compare `version` fields on client and server records
- Higher version wins
- Losing version is discarded

### Custom Resolution

For custom conflict resolution, implement your own logic in the `onConflict` callback:

```typescript
const syncManager = new SyncManager({
  // ... other config
  onConflict: async (conflict) => {
    // Show UI to user for manual resolution
    const userChoice = await showConflictDialog(conflict);

    if (userChoice === "keep_server") {
      await storage.upsertRecord(
        conflict.tableName,
        conflict.serverData
      );
      await storage.updateConflictResolution(
        conflict.id,
        "server_wins",
        userId
      );
    } else if (userChoice === "keep_local") {
      // Push local version to server again
      await syncManager.queueOperation(
        conflict.tableName,
        conflict.recordId,
        "update",
        conflict.clientData
      );
    }
  },
});
```

## Error Handling

SyncManager includes robust error handling:

- **Network errors**: Automatically retries with exponential backoff
- **Max retries**: Operations fail after 3 attempts (configurable)
- **Consecutive failures**: Auto-sync stops after 5 consecutive failures
- **Error logging**: All errors logged to console and returned in `SyncResult`

## Performance

- **Batch operations**: Queued operations processed in order
- **Exponential backoff**: Delays between retries: 100ms, 200ms, 400ms
- **Efficient queries**: Only fetches changes since `lastSyncedAt`
- **Minimal payload**: Only sends changed data

## Testing

### Test Offline Mode

```typescript
// Simulate offline
window.dispatchEvent(new Event("offline"));

// Queue operations
await syncManager.queueOperation("listings", "123", "create", data);

// Verify queue
const queue = await storage.getSyncQueue(userId);
console.log(`Queued operations: ${queue.length}`);

// Simulate online
window.dispatchEvent(new Event("online"));

// Wait for auto-sync
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Test Conflicts

```typescript
// 1. Create record locally (version 1)
await storage.upsertRecord("listings", { id: "123", title: "Test", version: 1 });

// 2. Simulate server update (version 2)
// 3. Try to sync local version 1
// 4. Verify conflict is logged

const conflicts = await storage.getUnresolvedConflicts(userId);
console.log(`Conflicts: ${conflicts.length}`);
```

## Migration from Existing Code

If you have existing sync logic:

1. **Extract storage operations** → Implement `StorageInterface`
2. **Replace sync calls** → Use `syncManager.queueOperation()`
3. **Remove manual sync timers** → Use `syncManager.startSync()`
4. **Update API endpoints** → Match required format above

## Troubleshooting

**Sync not happening:**
- Check `getSyncStatus()` - is auto-sync active?
- Check network connectivity
- Verify auth token is valid
- Check browser console for errors

**Conflicts keep appearing:**
- Ensure version field is incremented on each update
- Check if multiple devices are editing same record
- Review conflict resolution logic

**Performance issues:**
- Increase `autoSyncInterval` (e.g., 60000 for 1 minute)
- Implement batch API endpoints for bulk operations
- Add indexes to storage tables

## License

MIT
