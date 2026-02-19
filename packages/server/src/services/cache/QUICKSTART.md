# Redis Service Quick Start Guide

Get the Redis service running in 5 minutes.

## Step 1: Ensure Redis is Running

### Local Development (macOS/Linux)
```bash
# Using Homebrew (macOS)
brew install redis
brew services start redis

# Or Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Or native Redis
redis-server
```

### Verify Connection
```bash
redis-cli ping
# Should return: PONG
```

## Step 2: Configure Environment

Create or update `.env` file in `packages/server/`:

```env
REDIS_URL=redis://localhost:6379
```

For authentication:
```env
REDIS_URL=redis://username:password@localhost:6379
```

For TLS (production):
```env
REDIS_URL=rediss://:password@redis.example.com:6379
```

## Step 3: Initialize in Server

Edit `packages/server/src/index.ts`:

```typescript
import RedisService from "./services/cache/RedisService";

(async () => {
  // Add this early in startup
  console.log("[Startup] Initializing Redis...");
  await RedisService.connect();

  if (RedisService.isReady()) {
    console.log("[Startup] Redis initialized");
  }

  // ... rest of server setup ...
})();
```

## Step 4: Use in Your Routes

```typescript
import RedisService from "../services/cache/RedisService";

// Cache user data
const user = { id: "123", name: "John Doe" };
await RedisService.set("user:123", user, 3600); // 1 hour TTL

// Retrieve cached data
const cached = await RedisService.get<typeof user>("user:123");

// Delete cache
await RedisService.del("user:123");

// Check if exists
const exists = await RedisService.exists("user:123");
```

## Step 5: Test It

### Quick Test Script
```typescript
// Create test-redis.ts in packages/server/
import RedisService from "./src/services/cache/RedisService";

async function test() {
  console.log("Testing Redis service...");

  // Connect
  await RedisService.connect();
  console.log("✓ Connected");

  // Set
  const testData = { message: "Hello Redis" };
  await RedisService.set("test:key", testData);
  console.log("✓ Set value");

  // Get
  const retrieved = await RedisService.get("test:key");
  console.log("✓ Retrieved:", retrieved);

  // Delete
  await RedisService.del("test:key");
  console.log("✓ Deleted");

  // Disconnect
  await RedisService.disconnect();
  console.log("✓ Disconnected");

  console.log("\n✅ All tests passed!");
}

test().catch(console.error);
```

Run it:
```bash
cd packages/server
npx tsx test-redis.ts
```

Expected output:
```
Testing Redis service...
[Redis] Connected successfully
✓ Connected
✓ Set value
✓ Retrieved: { message: 'Hello Redis' }
✓ Deleted
[Redis] Disconnected gracefully
✓ Disconnected

✅ All tests passed!
```

## Common Scenarios

### Scenario 1: Cache User Data

```typescript
router.get("/api/v1/users/:id", async (req, res) => {
  try {
    const cacheKey = `user:${req.params.id}`;

    // Try cache first
    let user = await RedisService.get(cacheKey);

    if (!user) {
      // Query database
      user = await db.users.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Cache for 1 hour
      await RedisService.set(cacheKey, user, 3600);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### Scenario 2: Invalidate on Update

```typescript
router.put("/api/v1/users/:id", async (req, res) => {
  try {
    // Update database
    const updated = await db.users.update(req.params.id, req.body);

    // Invalidate cache
    await RedisService.del(`user:${req.params.id}`);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});
```

### Scenario 3: Session Management

```typescript
// After successful login
const session = { token, userId, createdAt: Date.now() };
await RedisService.set(
  `session:${userId}`,
  session,
  604800 // 7 days
);

// On subsequent requests
const session = await RedisService.get(`session:${userId}`);
if (!session) {
  return res.status(401).json({ error: "Session expired" });
}
```

### Scenario 4: Rate Limiting

```typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const limit = 100;

  const count = await RedisService.get<number>(key) || 0;

  if (count >= limit) {
    return false;
  }

  await RedisService.set(key, count + 1, 60); // 1-minute window
  return true;
}

// Use in middleware
app.use(async (req, res, next) => {
  const allowed = await checkRateLimit(req.user?.id || req.ip);
  if (!allowed) {
    return res.status(429).json({ error: "Rate limited" });
  }
  next();
});
```

## API Reference

### Connection
```typescript
await RedisService.connect()           // Initialize
RedisService.isReady()                 // Check status
await RedisService.disconnect()        // Cleanup
```

### Cache Operations
```typescript
await RedisService.set(key, value, ttl?)    // Cache
await RedisService.get<T>(key)              // Retrieve
await RedisService.del(...keys)             // Delete
await RedisService.exists(key)              // Check
await RedisService.expire(key, seconds)     // Set TTL
```

### Batch Operations
```typescript
// Delete multiple keys
await RedisService.del("key1", "key2", "key3");
```

### Database Operations
```typescript
await RedisService.flushAll()          // Clear all (use with caution!)
```

## Default TTL Values

```typescript
SESSION: 604800,        // 7 days
USER_PROFILE: 3600,     // 1 hour
LISTING: 86400,         // 24 hours
RATE_LIMIT: 60,         // 1 minute
TEMPORARY: 300,         // 5 minutes
```

## Debugging

### Check Redis Directly
```bash
redis-cli
> KEYS *                    # List all keys
> GET key:name              # Get value
> DEL key:name              # Delete key
> INFO                      # Server info
> MONITOR                   # Live command monitor
```

### Enable Logging
All operations are logged with `[Redis]` prefix:
```
[Redis] Connected successfully
[Redis] get() failed for key "user:123": Connection timeout
[Redis] Database flushed successfully
```

### Monitor Connections
```typescript
setInterval(() => {
  console.log("Redis status:", RedisService.isReady());
}, 30000); // Every 30 seconds
```

## Troubleshooting

**Q: "redis://localhost:6379" not working**
- Ensure Redis is running: `redis-cli ping`
- Check port 6379 is open: `netstat -an | grep 6379`

**Q: Connection timeout**
- Verify Redis URL in .env
- Check firewall/network access
- Ensure Redis server has capacity

**Q: get() always returns null**
- Check key exists: `redis-cli GET "key:name"`
- Verify TTL hasn't expired: `redis-cli TTL "key:name"`

**Q: Performance is slow**
- Monitor Redis: `redis-cli INFO stats`
- Check network latency
- Verify Redis server resources

## Production Checklist

- [ ] Redis URL configured in .env
- [ ] RedisService.connect() called on startup
- [ ] RedisService.disconnect() called on shutdown
- [ ] Error handling for cache misses
- [ ] Cache invalidation on data changes
- [ ] Health check endpoint configured
- [ ] Monitoring/logging in place
- [ ] Redis maxmemory policy set
- [ ] TLS enabled for remote connections
- [ ] Backups configured

## Next Steps

1. Read full documentation: `README.md`
2. See integration examples: `INTEGRATION.md`
3. Review code examples: `RedisService.example.ts`
4. Check TypeScript types: `types.ts`

## Support

For issues or questions:
1. Check logs for `[Redis]` prefixed messages
2. Verify Redis is running: `redis-cli ping`
3. Review troubleshooting section above
4. Check example usage: `RedisService.example.ts`
