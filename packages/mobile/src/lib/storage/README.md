# SQLite Storage Layer for Mobile

A production-ready SQLite storage implementation for the E.A.T. Platform's mobile app. Provides persistent local storage with offline-first synchronization capabilities using Drizzle ORM and expo-sqlite.

## Overview

The `SQLiteStorage` class implements the `StorageInterface` contract from `@eat/shared/sync/SyncManager`, enabling seamless offline-first data synchronization on mobile devices.

**Key Features:**
- Sync queue management for offline operations
- Conflict resolution tracking with last-write-wins strategy
- Generic CRUD operations on any data table
- Sync metadata tracking (last synced timestamps)
- Full database schema initialization
- Comprehensive error handling with logging
- Type-safe operations with TypeScript

## Installation

All dependencies are already included in `packages/mobile/package.json`:

```json
{
  "expo-sqlite": "~14.0.6",
  "drizzle-orm": "^0.39.1"
}
```

## Quick Start

### 1. Initialize Storage

```typescript
import { SQLiteStorage } from '@eat/mobile/lib/storage';

// Create storage instance
const storage = new SQLiteStorage();

// Initialize database
await storage.init();
```

### 2. Set Up Sync Manager

```typescript
import { SyncManager } from '@eat/shared/sync/SyncManager';

const syncManager = new SyncManager({
  apiUrl: 'http://your-api.com/api/v1',
  storage,
  userId: 'user-123',
  deviceId: 'device-456',
  authToken: 'jwt-token-here',
  autoSyncInterval: 30000, // 30 seconds
  maxRetries: 3,
});

// Start auto-sync
syncManager.startSync();
```

### 3. Queue Offline Operations

```typescript
// When offline, operations are queued locally
await syncManager.queueOperation(
  'listings',
  'listing-123',
  'update',
  { title: 'Updated Title' }
);

// When online, SyncManager automatically syncs with server
```

## API Reference

### Initialization

#### `async init(): Promise<void>`

Initialize the database and create all required tables. Must be called before using any other methods.

```typescript
await storage.init();
```

### Sync Queue Operations

#### `async getSyncQueue(userId: string): Promise<SyncOperation[]>`

Get all pending sync operations for a user.

```typescript
const operations = await storage.getSyncQueue(userId);
console.log(`${operations.length} operations pending`);
```

#### `async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'createdAt'>): Promise<string>`

Add an operation to the sync queue. Returns the operation ID.

```typescript
const opId = await storage.addToSyncQueue({
  userId: 'user-123',
  deviceId: 'device-456',
  tableName: 'listings',
  recordId: 'listing-123',
  operation: 'update',
  data: { title: 'New Title' },
  status: 'pending',
  retryCount: 0,
});
```

#### `async updateSyncQueueStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed', error?: string): Promise<void>`

Update the status of a sync queue operation.

```typescript
await storage.updateSyncQueueStatus(opId, 'completed');
// or with error
await storage.updateSyncQueueStatus(opId, 'failed', 'Network timeout');
```

#### `async removeSyncQueueItem(id: string): Promise<void>`

Remove an item from the sync queue.

```typescript
await storage.removeSyncQueueItem(opId);
```

### Conflict Management

#### `async addConflict(conflict: Omit<ConflictEntry, 'id' | 'createdAt'>): Promise<string>`

Log a conflict when server and client data diverge.

```typescript
const conflictId = await storage.addConflict({
  tableName: 'listings',
  recordId: 'listing-123',
  userId: 'user-123',
  deviceId: 'device-456',
  serverVersion: 2,
  clientVersion: 1,
  serverData: { title: 'Server Title' },
  clientData: { title: 'Client Title' },
});
```

#### `async getUnresolvedConflicts(userId: string): Promise<ConflictEntry[]>`

Get all unresolved conflicts for a user.

```typescript
const conflicts = await storage.getUnresolvedConflicts(userId);
conflicts.forEach(conflict => {
  console.log(`Conflict: ${conflict.tableName}:${conflict.recordId}`);
});
```

#### `async updateConflictResolution(id: string, resolution: 'server_wins' | 'client_wins' | 'manual' | 'merged', resolvedBy: string): Promise<void>`

Mark a conflict as resolved.

```typescript
await storage.updateConflictResolution(conflictId, 'server_wins', userId);
```

### Data Operations

#### `async getRecord(tableName: string, recordId: string): Promise<any>`

Get a single record by ID. Returns `null` if not found.

```typescript
const listing = await storage.getRecord('listings', 'listing-123');
if (listing) {
  console.log(listing.title);
}
```

#### `async upsertRecord(tableName: string, record: any): Promise<void>`

Insert or update a record (INSERT OR REPLACE).

```typescript
await storage.upsertRecord('listings', {
  id: 'listing-123',
  title: 'My Listing',
  description: 'A great listing',
  price: 99.99,
});
```

#### `async deleteRecord(tableName: string, recordId: string): Promise<void>`

Delete a record by ID.

```typescript
await storage.deleteRecord('listings', 'listing-123');
```

#### `async getRecordsByTable(tableName: string, filters?: any): Promise<any[]>`

Get all records from a table with optional filters.

```typescript
// Get all listings
const allListings = await storage.getRecordsByTable('listings');

// Get listings with filters
const myListings = await storage.getRecordsByTable('listings', {
  ownerUserId: 'user-123',
  availabilityStatus: 'active',
});
```

### Sync Metadata

#### `async getLastSyncedAt(userId: string, tableName?: string): Promise<Date | null>`

Get the last sync timestamp for a user (globally or per-table).

```typescript
// Global last sync
const lastSync = await storage.getLastSyncedAt(userId);

// Per-table sync
const listingsSync = await storage.getLastSyncedAt(userId, 'listings');
```

#### `async setLastSyncedAt(userId: string, timestamp: Date, tableName?: string): Promise<void>`

Update the last sync timestamp.

```typescript
await storage.setLastSyncedAt(userId, new Date());
```

### Utility Methods

#### `async clearSyncQueue(): Promise<void>`

Clear all items from the sync queue.

```typescript
await storage.clearSyncQueue();
```

#### `async getSyncQueueStats(userId: string): Promise<{ pending: number; failed: number; total: number }>`

Get statistics about pending and failed operations.

```typescript
const stats = await storage.getSyncQueueStats(userId);
console.log(`Pending: ${stats.pending}, Failed: ${stats.failed}`);
```

#### `async getConflictCount(userId: string): Promise<number>`

Get the number of unresolved conflicts.

```typescript
const count = await storage.getConflictCount(userId);
if (count > 0) {
  console.warn(`${count} conflicts need resolution`);
}
```

#### `async close(): Promise<void>`

Close the database connection.

```typescript
await storage.close();
```

#### `async clearAllData(): Promise<void>`

**WARNING: This clears all sync data. Use with caution (dev/testing only).**

```typescript
await storage.clearAllData();
```

## Database Schema

### Tables

#### sync_queue
Stores offline operations waiting to be synced to the server.

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'create', 'update', 'delete'
  data TEXT NOT NULL,        -- JSON
  status TEXT NOT NULL,      -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
)
```

#### conflict_log
Records conflicts detected during sync.

```sql
CREATE TABLE conflict_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  server_version INTEGER NOT NULL,
  client_version INTEGER NOT NULL,
  server_data TEXT NOT NULL,  -- JSON
  client_data TEXT NOT NULL,  -- JSON
  resolution TEXT,            -- 'server_wins', 'client_wins', 'manual', 'merged'
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL
)
```

#### sync_metadata
Tracks last synced timestamps for incremental sync.

```sql
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```

### Indexes

Automatically created for performance:
- `idx_sync_queue_user_id` - Fast lookup by user
- `idx_sync_queue_status` - Fast filtering by status
- `idx_conflict_log_user_id` - Fast conflict lookup
- `idx_conflict_log_resolved` - Find unresolved conflicts

## Error Handling

All methods use try/catch and provide descriptive error messages:

```typescript
try {
  const record = await storage.getRecord('listings', id);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed to get record: ${error.message}`);
  }
}
```

Errors are logged to console with `[SQLiteStorage]` prefix for easy filtering.

## Performance Considerations

1. **Batch Operations:** When syncing multiple records, consider batching inserts/updates for better performance.

2. **Indexes:** The sync queue and conflict log tables are indexed on commonly queried fields. Consider adding custom indexes for frequently filtered data tables.

3. **Large Data:** JSON fields are stored as text. For very large JSON objects (>1MB), consider splitting into separate tables.

4. **Cleanup:** Periodically archive and delete old completed sync operations to keep the queue small.

## Security Notes

1. **Database Encryption:** Use `expo-sqlite` encryption features in production:
   ```typescript
   const db = await SQLite.openDatabaseAsync('eat.db', {
     encryptionKey: encryptionKey,
   });
   ```

2. **Validation:** Table names are validated against a whitelist to prevent SQL injection.

3. **Sensitive Data:** Don't store passwords or sensitive tokens in the local database. Use `expo-secure-store` instead.

## Testing

### Unit Tests

```typescript
import { SQLiteStorage } from '@eat/mobile/lib/storage';

describe('SQLiteStorage', () => {
  let storage: SQLiteStorage;

  beforeEach(async () => {
    storage = new SQLiteStorage();
    await storage.init();
  });

  afterEach(async () => {
    await storage.close();
  });

  test('should queue an operation', async () => {
    const opId = await storage.addToSyncQueue({
      userId: 'user-1',
      deviceId: 'device-1',
      tableName: 'listings',
      recordId: 'rec-1',
      operation: 'create',
      data: { title: 'Test' },
      status: 'pending',
      retryCount: 0,
    });

    expect(opId).toBeDefined();

    const queue = await storage.getSyncQueue('user-1');
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(opId);
  });
});
```

## Integration with SyncManager

The `SQLiteStorage` is designed to work seamlessly with `SyncManager`:

1. **Offline Queue:** When offline, `SyncManager.queueOperation()` adds to the sync queue
2. **Push Changes:** `SyncManager.pushChanges()` reads from sync_queue and sends to server
3. **Pull Changes:** `SyncManager.pullChanges()` stores changes using `upsertRecord()`
4. **Resolve Conflicts:** `SyncManager.resolveConflicts()` handles conflict resolution

See `SQLiteStorage.example.ts` for full integration examples.

## Troubleshooting

### Database Locked Error
**Cause:** Multiple operations trying to write simultaneously
**Solution:** Ensure proper transaction handling, close unused connections

### Sync Not Working
**Check:**
1. `syncManager.startSync()` was called
2. Auth token is valid
3. Network connectivity
4. Check console logs for `[SQLiteStorage]` prefix

### Conflicts Keep Appearing
**Check:**
1. Multiple devices editing same record
2. Clock skew between devices
3. Conflict resolution is being applied

## Advanced Usage

### Custom Sync Interval

```typescript
const syncManager = new SyncManager({
  // ... other config
  autoSyncInterval: 60000, // Sync every 60 seconds
});
```

### Retry Configuration

```typescript
const syncManager = new SyncManager({
  // ... other config
  maxRetries: 5, // Retry up to 5 times
});
```

### Sync Callbacks

```typescript
const syncManager = new SyncManager({
  // ... other config
  onSyncStart: () => {
    console.log('Sync started');
  },
  onSyncComplete: (result) => {
    console.log(`Synced ${result.pushedCount} changes`);
  },
  onSyncError: (error) => {
    console.error('Sync failed:', error);
  },
  onConflict: (conflict) => {
    console.warn('Conflict detected:', conflict);
  },
});
```

## File Structure

```
packages/mobile/src/lib/storage/
├── SQLiteStorage.ts          # Main implementation
├── SQLiteStorage.example.ts  # Usage examples
├── index.ts                  # Module exports
└── README.md                 # This file
```

## References

- [expo-sqlite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [SyncManager Interface](../../../shared/sync/SyncManager.ts)
- [Database Schema](../../../shared/schema.ts)

## License

Part of the E.A.T. Platform. See repository LICENSE for details.
