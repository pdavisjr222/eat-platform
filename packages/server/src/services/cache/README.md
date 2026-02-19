# Redis Cache Service

Singleton Redis service for the E.A.T. Platform with connection retry logic, JSON serialization, and graceful error handling.

## Features

- **Singleton Pattern**: Single instance shared across the entire application
- **JSON Serialization**: Automatic serialization/deserialization of complex objects
- **Connection Retry Logic**: Exponential backoff with configurable retry attempts
- **Error Handling**: Comprehensive try/catch blocks with logging
- **Graceful Disconnect**: Clean shutdown on application termination
- **Type Safety**: Full TypeScript support with generics

## Configuration

Set the Redis URL via environment variable:

```env
REDIS_URL=redis://localhost:6379
# Or with authentication:
REDIS_URL=redis://username:password@host:port/db
# Or default to localhost:
# (no REDIS_URL = defaults to redis://localhost:6379)
```

## API Methods

### connect()

Initialize Redis connection with automatic retry logic.

```typescript
await RedisService.connect();
```

**Features:**
- Exponential backoff retry (max 10 attempts)
- Automatic reconnection on connection loss
- Ready state tracking

---

### get\<T\>(key)

Retrieve a cached value and parse as JSON.

```typescript
const user = await RedisService.get<UserData>("user:123");
```

**Returns:** Parsed object or `null` if not found/connection unavailable

---

### set\<T\>(key, value, expirationSeconds?)

Cache a value with optional expiration.

```typescript
await RedisService.set("user:123", userData, 3600); // 1 hour
```

**Parameters:**
- `key` - Cache key (string)
- `value` - Value to cache (any serializable type)
- `expirationSeconds` - Optional TTL (number)

**Returns:** `true` if successful, `false` otherwise

---

### del(...keys)

Delete one or more keys.

```typescript
const deleted = await RedisService.del("user:123", "user:456");
// Returns number of keys deleted
```

---

### exists(key)

Check if key exists in cache.

```typescript
const exists = await RedisService.exists("user:123");
```

**Returns:** `true` if key exists, `false` otherwise

---

### expire(key, seconds)

Set expiration time on an existing key.

```typescript
await RedisService.expire("user:123", 1800); // 30 minutes
```

**Returns:** `true` if expiration was set, `false` if key doesn't exist

---

### flushAll()

Clear all keys from the current database.

```typescript
await RedisService.flushAll(); // ⚠️ Use carefully!
```

**Returns:** `true` if successful

---

### isReady()

Check if Redis is connected and ready.

```typescript
const ready = RedisService.isReady();
```

**Returns:** `boolean`

---

### disconnect()

Gracefully disconnect from Redis.

```typescript
await RedisService.disconnect();
```

---

### getClient()

Get the raw ioredis client for advanced operations.

```typescript
const client = RedisService.getClient();
// Use with caution - prefer provided methods when possible
```

## Usage Examples

### Basic Caching

```typescript
import RedisService from "./services/cache/RedisService";

// Cache user data for 1 hour
const user = { id: "123", name: "John", role: "seller" };
await RedisService.set("user:123", user, 3600);

// Retrieve
const cached = await RedisService.get<typeof user>("user:123");
```

### Session Management

```typescript
// Cache session token with 7-day expiration
const sessionData = { token: "abc123", userId: "user_123" };
await RedisService.set("session:user_123", sessionData, 604800);

// Check session validity
const valid = await RedisService.exists("session:user_123");
```

### Marketplace Listing Cache

```typescript
// Cache product listing for 24 hours
const listing = {
  id: "listing_456",
  title: "Organic Tomatoes",
  price: 25.00,
  seller: "vendor_789",
};
await RedisService.set("listing:456", listing, 86400);
```

### Rate Limiting

```typescript
// Track API calls per user per minute
const key = `api:user_123:calls`;
const current = await RedisService.get<number>(key) || 0;
await RedisService.set(key, current + 1, 60); // 1-minute window

if (current > RATE_LIMIT) {
  // Reject request
}
```

### Batch Operations

```typescript
// Invalidate multiple user caches
const userIds = ["user_1", "user_2", "user_3"];
const keys = userIds.map(id => `user:${id}`);
await RedisService.del(...keys);
```

## Error Handling

All methods include try/catch blocks and graceful fallbacks:

```typescript
// get() returns null on error
const user = await RedisService.get("user:123"); // null if fails

// set() returns false on error
const success = await RedisService.set("user:123", data);
if (!success) {
  // Handle cache miss - use database instead
}

// del() returns 0 on error
const deleted = await RedisService.del("user:123");

// exists() returns false on error
const exists = await RedisService.exists("user:123");
```

## Connection Retry Logic

- **Initial retry delay**: 1 second
- **Max retries**: 10 attempts
- **Backoff formula**: `min(delay × 1.5^attempt, 30 seconds)`
- **Connection loss**: Automatic reconnection with exponential backoff
- **Offline queue**: Enabled to buffer commands during disconnection

## Logging

All operations are logged to console:

```
[Redis] Connected successfully
[Redis] get() failed for key "user:123": Connection timeout
[Redis] Database flushed successfully
[Redis] Disconnected gracefully
```

## Best Practices

1. **Always check `isReady()`** before critical operations in production:
   ```typescript
   if (RedisService.isReady()) {
     await RedisService.set(key, value);
   }
   ```

2. **Use appropriate TTLs**:
   - Sessions: 7 days (604800 seconds)
   - User data: 1 hour (3600 seconds)
   - Listings: 24 hours (86400 seconds)
   - Rate limits: 1 minute (60 seconds)

3. **Handle cache misses gracefully**:
   ```typescript
   let user = await RedisService.get("user:123");
   if (!user) {
     user = await db.users.findById("123");
     await RedisService.set("user:123", user, 3600);
   }
   ```

4. **Initialize on app startup**:
   ```typescript
   // In index.ts
   await RedisService.connect();
   ```

5. **Cleanup on shutdown**:
   ```typescript
   // When process terminates
   process.on("SIGTERM", async () => {
     await RedisService.disconnect();
     process.exit(0);
   });
   ```

## Debugging

Enable detailed logging by checking console output:

```typescript
// Monitor connection status
setInterval(() => {
  console.log("Redis ready:", RedisService.isReady());
}, 30000); // Every 30 seconds
```

## Testing

See `RedisService.example.ts` for comprehensive usage examples covering:
- Basic get/set operations
- Complex object caching
- Expiration management
- Batch operations
- Error handling patterns
- Real-world scenarios (users, listings, sessions, vendors)

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `get()` returns null | Connection down | Check Redis server, logs |
| `set()` returns false | Redis unavailable | Verify REDIS_URL, server status |
| Connection timeout | Server unreachable | Check host/port, firewall |
| "Max retries exceeded" | Redis down for too long | Start Redis server |

## Performance Characteristics

- Get operation: ~1-5ms (network dependent)
- Set operation: ~1-5ms (network dependent)
- Delete operation: ~1-5ms per key
- Database size: No practical limit (depends on Redis configuration)

## Related Files

- Configuration: `/packages/server/src/config.ts`
- Usage examples: `./RedisService.example.ts`
- Main server: `/packages/server/src/index.ts`
