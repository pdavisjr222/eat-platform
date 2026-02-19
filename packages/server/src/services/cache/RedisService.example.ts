/**
 * RedisService Usage Examples
 *
 * This file demonstrates how to use the RedisService singleton
 * in the E.A.T. Platform application.
 */

import RedisService from "./RedisService";

/**
 * Example 1: Initialize Redis connection
 */
export async function initializeRedis() {
  try {
    await RedisService.connect();
    console.log("Redis connected:", RedisService.isReady());
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
  }
}

/**
 * Example 2: Cache user data (object serialization)
 */
export async function cacheUserData() {
  const userId = "user_12345";
  const userData = {
    id: "user_12345",
    email: "john@example.com",
    name: "John Doe",
    role: "seller",
    createdAt: new Date().toISOString(),
  };

  try {
    // Cache for 1 hour (3600 seconds)
    const success = await RedisService.set(
      `user:${userId}`,
      userData,
      3600
    );

    if (success) {
      console.log("User data cached successfully");
    }

    // Retrieve cached data
    const cached = await RedisService.get<typeof userData>(
      `user:${userId}`
    );
    console.log("Retrieved user data:", cached);
  } catch (error) {
    console.error("Cache operation failed:", error);
  }
}

/**
 * Example 3: Cache session tokens (with expiration)
 */
export async function cacheSessionToken(
  userId: string,
  token: string,
  expirySeconds = 604800 // 7 days
) {
  try {
    const key = `session:${userId}`;
    const sessionData = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + expirySeconds * 1000,
    };

    const success = await RedisService.set(
      key,
      sessionData,
      expirySeconds
    );

    if (success) {
      console.log(`Session cached for user ${userId}`);
    }

    return success;
  } catch (error) {
    console.error("Session caching failed:", error);
    return false;
  }
}

/**
 * Example 4: Cache listing data for marketplace
 */
export async function cacheListingData(
  listingId: string,
  listingData: any
) {
  try {
    const key = `listing:${listingId}`;
    // Cache listings for 24 hours
    const success = await RedisService.set(key, listingData, 86400);

    if (success) {
      console.log(`Listing ${listingId} cached`);
    }

    return success;
  } catch (error) {
    console.error("Listing cache failed:", error);
    return false;
  }
}

/**
 * Example 5: Check if key exists (for availability checks)
 */
export async function checkCacheAvailability(key: string) {
  try {
    const exists = await RedisService.exists(key);
    console.log(`Cache key "${key}" exists:`, exists);
    return exists;
  } catch (error) {
    console.error("Existence check failed:", error);
    return false;
  }
}

/**
 * Example 6: Delete cache entries
 */
export async function invalidateCaches(keys: string[]) {
  try {
    const deletedCount = await RedisService.del(...keys);
    console.log(`Deleted ${deletedCount} cache entries`);
    return deletedCount;
  } catch (error) {
    console.error("Cache deletion failed:", error);
    return 0;
  }
}

/**
 * Example 7: Set expiration on existing key
 */
export async function setKeyExpiration(
  key: string,
  expirySeconds: number
) {
  try {
    const success = await RedisService.expire(key, expirySeconds);
    if (success) {
      console.log(
        `Expiration set for key "${key}" in ${expirySeconds}s`
      );
    } else {
      console.log(`Key "${key}" does not exist`);
    }
    return success;
  } catch (error) {
    console.error("Expiration setting failed:", error);
    return false;
  }
}

/**
 * Example 8: Cache notification preferences
 */
export async function cacheNotificationPreferences(
  userId: string,
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  }
) {
  try {
    const key = `user:${userId}:notifications`;
    // Cache preferences for 7 days
    const success = await RedisService.set(key, preferences, 604800);
    return success;
  } catch (error) {
    console.error("Notification preferences caching failed:", error);
    return false;
  }
}

/**
 * Example 9: Rate limiting - track API calls
 */
export async function trackApiCall(userId: string, endpoint: string) {
  try {
    const key = `api:${userId}:${endpoint}:calls`;
    const currentCount = await RedisService.get<number>(key);
    const newCount = (currentCount || 0) + 1;

    // Store with 1-minute window
    await RedisService.set(key, newCount, 60);

    return newCount;
  } catch (error) {
    console.error("API tracking failed:", error);
    return 0;
  }
}

/**
 * Example 10: Cache vendor referral data
 */
export async function cacheVendorReferrals(vendorId: string) {
  try {
    const referralData = {
      vendorId,
      activeReferrals: 42,
      totalCommissions: 1500.50,
      lastUpdated: new Date().toISOString(),
    };

    const key = `vendor:${vendorId}:referrals`;
    // Cache for 6 hours
    const success = await RedisService.set(key, referralData, 21600);

    return success;
  } catch (error) {
    console.error("Vendor referral caching failed:", error);
    return false;
  }
}

/**
 * Example 11: Cleanup/flush database (use with caution!)
 */
export async function cleanupCache() {
  try {
    const success = await RedisService.flushAll();
    if (success) {
      console.log("All cache entries flushed");
    }
    return success;
  } catch (error) {
    console.error("Cache flush failed:", error);
    return false;
  }
}

/**
 * Example 12: Graceful shutdown
 */
export async function shutdownRedis() {
  try {
    await RedisService.disconnect();
    console.log("Redis disconnected gracefully");
  } catch (error) {
    console.error("Error during Redis shutdown:", error);
  }
}

/**
 * Example 13: Check Redis connection status
 */
export function checkRedisStatus() {
  const isReady = RedisService.isReady();
  console.log("Redis ready:", isReady);
  return isReady;
}

/**
 * Example 14: Complex object caching - event calendar
 */
export async function cacheEventData(eventId: string) {
  try {
    const eventData = {
      id: eventId,
      title: "Community Foraging Workshop",
      description: "Learn sustainable foraging practices",
      startDate: "2025-02-15T10:00:00Z",
      endDate: "2025-02-15T12:00:00Z",
      location: "Central Park, Zone A",
      attendees: ["user_1", "user_2", "user_3"],
      metadata: {
        category: "workshop",
        capacity: 50,
        registered: 28,
      },
    };

    const key = `event:${eventId}`;
    // Cache for 48 hours
    const success = await RedisService.set(key, eventData, 172800);

    return success;
  } catch (error) {
    console.error("Event caching failed:", error);
    return false;
  }
}

/**
 * Example 15: Error handling best practices
 */
export async function robustCacheOperation(key: string, value: any) {
  try {
    // Validate input
    if (!key || !value) {
      throw new Error("Key and value are required");
    }

    // Set with error handling
    const success = await RedisService.set(key, value, 3600);

    if (!success) {
      console.warn(`Failed to cache key: ${key}`);
      // Fallback to memory or database
      return false;
    }

    // Verify cache
    const retrieved = await RedisService.get(key);
    if (!retrieved) {
      console.warn(`Failed to retrieve cached key: ${key}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Robust cache operation failed for key "${key}":`, error);
    // Return false instead of throwing to allow graceful degradation
    return false;
  }
}
