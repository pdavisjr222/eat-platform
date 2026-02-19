# Sync API Endpoints

Offline-first data synchronization API for the E.A.T. Platform.

## Overview

The Sync API enables seamless offline-first operation by:
- **Pushing** local changes from client to server with conflict detection
- **Pulling** server changes since last sync for the authenticated user
- **Status** reporting of sync state and pending operations

## Base URL

```
/api/v1/sync
```

All endpoints require authentication via Bearer token in the `Authorization` header.

---

## Endpoints

### 1. Push Operation

**POST** `/api/v1/sync/push`

Push a single operation (create, update, delete) from client to server.

#### Request Body

```typescript
{
  tableName: string;          // Table name (e.g., "listings", "foragingSpots")
  recordId: string;           // UUID of the record
  operation: "create" | "update" | "delete";
  data: Record<string, any>;  // Full record data
  deviceId: string;           // Device identifier
  clientVersion?: number;     // Optional: Current version number for conflict detection
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Operation applied successfully"
}
```

#### Conflict Response (409)

```json
{
  "error": "Version conflict",
  "conflict": {
    "serverVersion": 5,
    "clientVersion": 3,
    "serverData": { /* current server record */ },
    "message": "Version conflict detected"
  }
}
```

#### Error Response (400)

```json
{
  "error": "Not authorized to modify this record"
}
```

#### Example

```bash
curl -X POST http://localhost:5000/api/v1/sync/push \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "listings",
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "update",
    "data": {
      "title": "Fresh Tomatoes",
      "description": "Organic tomatoes from my garden",
      "price": 5.99,
      "category": "food"
    },
    "deviceId": "device-123",
    "clientVersion": 3
  }'
```

---

### 2. Pull Changes

**POST** `/api/v1/sync/pull`

Retrieve all changes since a given timestamp for the authenticated user.

#### Request Body

```typescript
{
  userId: string;             // Must match authenticated user
  deviceId: string;           // Device identifier
  since: string;              // ISO 8601 datetime (e.g., "2024-01-01T00:00:00Z")
  tables?: string[];          // Optional: Specific tables to sync
}
```

#### Success Response (200)

```json
{
  "success": true,
  "changes": [
    {
      "tableName": "listings",
      "recordId": "550e8400-e29b-41d4-a716-446655440000",
      "operation": "update",
      "data": { /* full record data */ },
      "version": 4,
      "updatedAt": "2024-01-08T12:00:00Z"
    },
    {
      "tableName": "foragingSpots",
      "recordId": "660e8400-e29b-41d4-a716-446655440001",
      "operation": "create",
      "data": { /* full record data */ },
      "version": 1,
      "updatedAt": "2024-01-08T13:00:00Z"
    }
  ],
  "timestamp": "2024-01-08T14:00:00Z",
  "count": 2
}
```

#### Example

```bash
curl -X POST http://localhost:5000/api/v1/sync/pull \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "deviceId": "device-123",
    "since": "2024-01-01T00:00:00Z",
    "tables": ["listings", "foragingSpots", "events"]
  }'
```

---

### 3. Sync Status

**GET** `/api/v1/sync/status?deviceId=device-123`

Get current sync status for the authenticated user.

#### Query Parameters

- `deviceId` (optional): Device identifier to get last sync time

#### Success Response (200)

```json
{
  "success": true,
  "lastSyncedAt": "2024-01-08T12:00:00Z",
  "pendingCount": 3,
  "conflictsCount": 1,
  "serverTime": "2024-01-08T14:00:00Z"
}
```

#### Example

```bash
curl -X GET "http://localhost:5000/api/v1/sync/status?deviceId=device-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Supported Tables (28 Total)

### User-Owned Tables
Data filtered by authenticated user:

- `users` - User profile data (own record only)
- `memberProfiles` - Extended member profiles
- `listings` - Marketplace listings (ownerUserId)
- `foragingSpots` - Foraging locations (createdByUserId)
- `eventRegistrations` - Event registrations
- `userTrainingProgress` - Training module progress
- `mealPlans` - Meal planning data
- `recipes` - User recipes (createdByUserId)
- `shoppingLists` - Shopping lists
- `chatMessages` - Messages (senderUserId or recipientUserId)
- `reviews` - User reviews (reviewerUserId)
- `jobPosts` - Job postings (postedByUserId)
- `jobApplications` - Job applications (applicantUserId)
- `creditTransactions` - Credit history
- `payments` - Payment history
- `notifications` - User notifications
- `syncQueue` - Sync operation queue
- `deviceRegistry` - Device registrations
- `conflictLog` - Conflict resolution log
- `videoCallParticipants` - Video call participation

### Public/Shared Tables
Data accessible to all authenticated users:

- `vendors` - Vendor directory
- `coupons` - Vendor coupons/deals
- `gardenClubs` - Garden club listings
- `seedBanks` - Seed bank directory
- `resourceHubs` - Resource hub locations
- `events` - Public events
- `trainingModules` - Training content
- `subscriptionPlans` - Subscription plans
- `vendorReferrals` - Vendor referral tracking
- `videoCalls` - Video call sessions
- `auditLogs` - Admin audit logs

---

## Features

### 1. Conflict Detection

The API uses optimistic locking with version numbers:
- Each record has a `version` field that increments on update
- Client sends `clientVersion` with update/delete operations
- Server compares `clientVersion` with `serverVersion`
- If versions don't match, returns 409 with conflict details
- Conflict logged to `conflictLog` table for resolution

### 2. Data Isolation

User data is automatically filtered:
- Users can only access/modify their own data
- Queries automatically filter by userId
- Permission checks on all operations
- Public data (vendors, events, etc.) accessible to all

### 3. Transaction Safety

All operations use database transactions:
- Atomic operation execution
- Rollback on error
- Consistent state maintained

### 4. Soft Deletes

Delete operations are soft deletes:
- Record marked with `isDeleted: true`
- `deletedAt` timestamp set
- Version incremented
- Record synced to clients as delete operation

### 5. Device Tracking

All operations track device information:
- `deviceId` recorded on all changes
- `lastSyncedAt` timestamp per device
- Device registry for push notifications

---

## Error Handling

### 400 Bad Request
- Invalid request body
- Missing required fields
- Invalid table name

### 401 Unauthorized
- Missing or invalid Bearer token

### 403 Forbidden
- Attempting to access other user's data
- Insufficient permissions

### 409 Conflict
- Version mismatch detected
- Returns server data for resolution

### 500 Internal Server Error
- Database error
- Unexpected server error

---

## Usage with SyncManager

The client-side `SyncManager` (packages/shared/sync/SyncManager.ts) integrates with these endpoints:

```typescript
import { SyncManager } from '@shared/sync/SyncManager';

const syncManager = new SyncManager({
  apiUrl: 'http://localhost:5000/api/v1/sync',
  userId: 'user-123',
  deviceId: 'device-123',
  authToken: 'your-jwt-token',
  storage: yourStorageImplementation,
});

// Start auto-sync
syncManager.startSync();

// Manual sync
await syncManager.performSync();

// Queue offline operation
await syncManager.queueOperation(
  'listings',
  'record-id',
  'update',
  { title: 'Updated Title' }
);
```

---

## Testing

### Test Push Operation

```bash
# Create new listing offline
curl -X POST http://localhost:5000/api/v1/sync/push \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "listings",
    "recordId": "new-listing-123",
    "operation": "create",
    "data": {
      "title": "Test Listing",
      "description": "Created offline",
      "type": "sell",
      "category": "food",
      "ownerUserId": "user-123"
    },
    "deviceId": "device-123"
  }'
```

### Test Pull Changes

```bash
# Get all changes since yesterday
curl -X POST http://localhost:5000/api/v1/sync/pull \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "deviceId": "device-123",
    "since": "2024-01-07T00:00:00Z"
  }'
```

### Test Sync Status

```bash
curl -X GET "http://localhost:5000/api/v1/sync/status?deviceId=device-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Performance Considerations

- **Pagination**: Pull endpoint returns all changes; consider implementing pagination for large datasets
- **Indexing**: Ensure indexes on `updatedAt`, `userId`, and `version` columns
- **Throttling**: Rate limiting applied via `apiRateLimiter` middleware
- **Caching**: Consider caching recent changes with Redis for faster pull operations

---

## Security

- All endpoints require JWT authentication
- User data isolation enforced at database level
- Permission checks on all operations
- SQL injection protection via parameterized queries (Drizzle ORM)
- Input validation via Zod schemas

---

## Future Enhancements

- [ ] Batch push operations (multiple operations in one request)
- [ ] Pagination for pull endpoint
- [ ] WebSocket support for real-time sync
- [ ] Compression for large payloads
- [ ] Incremental sync optimization
- [ ] Conflict resolution strategies (server-wins, client-wins, merge)

---

## Support

For issues or questions, see:
- Main documentation: `CLAUDE.md`
- Schema reference: `packages/shared/schema.ts`
- Client sync manager: `packages/shared/sync/SyncManager.ts`
