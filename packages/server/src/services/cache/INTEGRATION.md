# Redis Service Integration Guide

This guide shows how to integrate the RedisService singleton into the E.A.T. Platform application.

## 1. Initialize Redis on Server Startup

Modify `/packages/server/src/index.ts`:

```typescript
import "dotenv/config";
import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import RedisService from "./services/cache/RedisService";

const app = express();

// ... existing middleware ...

(async () => {
  try {
    // Initialize Redis before registering routes
    log("[Startup] Initializing Redis cache...");
    await RedisService.connect();

    if (RedisService.isReady()) {
      log("[Startup] Redis cache initialized successfully");
    } else {
      log("[Startup] Redis cache unavailable - app will function without caching");
    }
  } catch (error) {
    log("[Startup] Warning: Redis initialization failed, continuing without cache");
    console.error(error);
  }

  const server = await registerRoutes(app);

  // ... existing error handler ...

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    log("[Shutdown] Closing Redis connection...");
    await RedisService.disconnect();
    server.close(() => {
      log("[Shutdown] Server closed");
      process.exit(0);
    });
  });

  // ... existing server.listen() ...
})();
```

## 2. Use Redis in API Routes

Example: Cache user data in authentication endpoint

```typescript
// /packages/server/src/routes.ts or specific route handler

import RedisService from "../services/cache/RedisService";
import { validateBody } from "./middleware";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/api/v1/auth/login", validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check cache first
    const cachedUser = await RedisService.get(`user:${email}`);
    if (cachedUser) {
      return res.json({
        user: cachedUser,
        token: generateJWT(cachedUser),
      });
    }

    // Query database
    const user = await db.users.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Cache user data for 1 hour
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };
    await RedisService.set(`user:${email}`, userData, 3600);

    // Generate token and cache session
    const token = generateJWT(user);
    const sessionData = { token, userId: user.id, createdAt: Date.now() };
    await RedisService.set(`session:${user.id}`, sessionData, 604800); // 7 days

    res.json({
      user: userData,
      token,
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});
```

## 3. Cache Database Queries

Example: Cache listing data in marketplace endpoint

```typescript
import RedisService from "../services/cache/RedisService";

async function getListingById(listingId: string) {
  try {
    const cacheKey = `listing:${listingId}`;

    // Check cache first
    let listing = await RedisService.get(cacheKey);
    if (listing) {
      return listing;
    }

    // Query database
    listing = await db.listings.findById(listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    // Cache for 24 hours
    await RedisService.set(cacheKey, listing, 86400);

    return listing;
  } catch (error) {
    console.error(`[Listing] Error fetching ${listingId}:`, error);
    throw error;
  }
}

// Use in route
router.get("/api/v1/listings/:id", async (req, res) => {
  try {
    const listing = await getListingById(req.params.id);
    res.json(listing);
  } catch (error) {
    res.status(404).json({ error: "Listing not found" });
  }
});
```

## 4. Invalidate Cache on Data Changes

Example: Clear cache when listing is updated

```typescript
router.put("/api/v1/listings/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Update database
    const updated = await db.listings.update(id, req.body);

    // Invalidate cache
    const cacheKey = `listing:${id}`;
    await RedisService.del(cacheKey);

    // Also invalidate related caches
    await RedisService.del(
      `listings:search:${updated.category}`,
      `user:${updated.vendorId}:listings`
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});
```

## 5. Rate Limiting with Redis

Example: Prevent API abuse

```typescript
async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
  try {
    const key = `ratelimit:${userId}:${endpoint}`;
    const current = await RedisService.get<number>(key) || 0;
    const limit = 100; // requests per minute
    const windowSize = 60; // seconds

    if (current >= limit) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    await RedisService.set(key, current + 1, windowSize);
    return true;
  } catch (error) {
    console.error("[RateLimit] Check failed:", error);
    // Fail open - allow request if cache fails
    return true;
  }
}

// Use in middleware
app.use(async (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const allowed = await checkRateLimit(userId, req.path);

  if (!allowed) {
    return res.status(429).json({ error: "Too many requests" });
  }

  next();
});
```

## 6. Cache Complex Objects (Event Calendar)

```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  attendees: string[];
  capacity: number;
  registered: number;
}

router.get("/api/v1/events/:id", async (req, res) => {
  try {
    const cacheKey = `event:${req.params.id}`;

    // Try cache first
    let event = await RedisService.get<Event>(cacheKey);
    if (event) {
      return res.json(event);
    }

    // Query database
    event = await db.events.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Cache for 48 hours
    await RedisService.set(cacheKey, event, 172800);

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});
```

## 7. Cache Vendor Referral Data

```typescript
async function getVendorReferrals(vendorId: string) {
  const cacheKey = `vendor:${vendorId}:referrals`;

  // Try cache
  let referrals = await RedisService.get(cacheKey);
  if (referrals) {
    return referrals;
  }

  // Query database (aggregation query)
  referrals = await db.vendorReferrals.aggregateByVendor(vendorId);

  // Cache for 6 hours (computationally expensive)
  await RedisService.set(cacheKey, referrals, 21600);

  return referrals;
}

// Use in route
router.get("/api/v1/vendors/:id/referrals", authenticateToken, async (req, res) => {
  try {
    const referrals = await getVendorReferrals(req.params.id);
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch referral data" });
  }
});
```

## 8. Monitor Redis Health

Create a health check endpoint:

```typescript
router.get("/api/v1/health/redis", async (req, res) => {
  try {
    const isReady = RedisService.isReady();

    if (!isReady) {
      return res.status(503).json({
        status: "unavailable",
        service: "Redis",
        message: "Redis cache is offline",
      });
    }

    // Test connectivity
    const testKey = `health:test:${Date.now()}`;
    const success = await RedisService.set(testKey, "ok", 10);

    if (!success) {
      return res.status(503).json({
        status: "error",
        service: "Redis",
        message: "Redis write test failed",
      });
    }

    res.json({
      status: "healthy",
      service: "Redis",
      ready: true,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "Redis",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
```

## 9. Batch Cache Invalidation

```typescript
async function invalidateUserCaches(userId: string) {
  const keys = [
    `user:${userId}`,
    `user:${userId}:listings`,
    `user:${userId}:referrals`,
    `user:${userId}:notifications`,
    `session:${userId}`,
  ];

  const deleted = await RedisService.del(...keys);
  console.log(`[Cache] Invalidated ${deleted} keys for user ${userId}`);
}

// Use when user data changes
router.put("/api/v1/users/:id/profile", authenticateToken, async (req, res) => {
  try {
    const updated = await db.users.update(req.params.id, req.body);

    // Invalidate all user caches
    await invalidateUserCaches(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});
```

## 10. Testing Redis Integration

```typescript
import RedisService from "../services/cache/RedisService";

describe("Redis Integration", () => {
  beforeAll(async () => {
    await RedisService.connect();
  });

  afterAll(async () => {
    await RedisService.disconnect();
  });

  afterEach(async () => {
    await RedisService.flushAll();
  });

  it("should cache and retrieve user data", async () => {
    const userData = { id: "123", name: "Test User" };

    await RedisService.set("user:123", userData);
    const retrieved = await RedisService.get<typeof userData>("user:123");

    expect(retrieved).toEqual(userData);
  });

  it("should respect expiration time", async () => {
    await RedisService.set("temp:key", "value", 1);

    let exists = await RedisService.exists("temp:key");
    expect(exists).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 1100));

    exists = await RedisService.exists("temp:key");
    expect(exists).toBe(false);
  });
});
```

## Environment Configuration

Add to `.env`:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Or with auth:
REDIS_URL=redis://username:password@redis.example.com:6379/0

# Or production with TLS:
REDIS_URL=rediss://:password@redis.example.com:6379
```

## Performance Considerations

- **Cache hit rate**: Monitor to ensure caching effectiveness
- **Memory usage**: Set Redis maxmemory policy (e.g., `allkeys-lru`)
- **TTL values**: Use appropriate expiration times per data type
- **Batch operations**: Use `del()` with multiple keys for efficiency

## Monitoring

Log cache operations in production:

```typescript
const cacheKey = "important:data";

// Log cache hit
if (await RedisService.exists(cacheKey)) {
  console.log(`[Cache HIT] ${cacheKey}`);
}

// Log cache miss
const data = await RedisService.get(cacheKey);
if (!data) {
  console.log(`[Cache MISS] ${cacheKey}`);
}
```

## Troubleshooting

**Q: Redis connection fails**
- Check Redis server is running: `redis-cli ping`
- Verify REDIS_URL environment variable
- Check firewall/network connectivity

**Q: Cache entries expire too quickly**
- Verify TTL values are correct (in seconds, not milliseconds)
- Check Redis `maxmemory` policy isn't evicting keys

**Q: High memory usage**
- Reduce TTL values for less critical data
- Implement cache invalidation on data changes
- Monitor cache hit rates to ensure efficiency

**Q: Stale data served from cache**
- Ensure cache invalidation on writes (see Section 4)
- Reduce TTL for frequently changing data
- Implement version-based cache keys
