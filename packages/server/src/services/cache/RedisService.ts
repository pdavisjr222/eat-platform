import Redis from "ioredis";

interface RedisError extends Error {
  code?: string;
}

/**
 * RedisService: Singleton instance for caching with JSON serialization,
 * connection retry logic, and graceful disconnect
 */
class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | null = null;
  private isConnecting = false;
  private isConnected = false;
  private readonly redisUrl: string;
  private readonly maxRetries = 10;
  private retryCount = 0;
  private reconnectInterval = 1000; // Start at 1 second
  private readonly maxReconnectInterval = 30000; // Cap at 30 seconds

  private constructor() {
    this.redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  }

  /**
   * Get singleton instance of RedisService
   */
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Initialize Redis connection with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.client = new Redis(this.redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, this.maxReconnectInterval);
          console.log(
            `[Redis] Retry attempt ${times}, reconnecting in ${delay}ms`
          );
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        reconnectOnError: (err) => {
          const targetError = err?.toString() || "";
          if (
            targetError.includes("READONLY") ||
            targetError.includes("CLUSTERDOWN")
          ) {
            return true;
          }
          return false;
        },
      });

      // Setup event listeners
      this.client.on("connect", () => {
        console.log("[Redis] Connected successfully");
        this.isConnected = true;
        this.retryCount = 0;
        this.reconnectInterval = 1000;
      });

      this.client.on("error", (err: RedisError) => {
        console.error("[Redis] Connection error:", err.message);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("[Redis] Connection closed");
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("[Redis] Attempting to reconnect...");
      });

      // Wait for initial connection
      await this.client.ping();
      this.isConnected = true;
      this.retryCount = 0;
      console.log("[Redis] Redis service initialized successfully");
    } catch (error) {
      this.isConnecting = false;
      const err = error as RedisError;
      console.error(
        "[Redis] Failed to connect:",
        err.message,
        `(Attempt ${this.retryCount + 1}/${this.maxRetries})`
      );

      this.retryCount++;
      if (this.retryCount < this.maxRetries) {
        const backoffDelay = Math.min(
          this.reconnectInterval * Math.pow(1.5, this.retryCount - 1),
          this.maxReconnectInterval
        );
        console.log(
          `[Redis] Retrying connection in ${backoffDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.connect();
      } else {
        console.error(
          "[Redis] Max connection attempts reached. Redis will be unavailable."
        );
        this.client = null;
      }
    }

    this.isConnecting = false;
  }

  /**
   * Get value from Redis cache
   * @param key - The cache key
   * @returns Parsed value or null if not found
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      console.warn(
        `[Redis] get() called but not connected. Key: ${key}`
      );
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        // If not valid JSON, return raw string value
        return value as unknown as T;
      }
    } catch (error) {
      const err = error as RedisError;
      console.error(
        `[Redis] get() failed for key "${key}":`,
        err.message
      );
      return null;
    }
  }

  /**
   * Set value in Redis cache with optional expiration
   * @param key - The cache key
   * @param value - Value to cache (will be JSON serialized)
   * @param expirationSeconds - Optional TTL in seconds
   */
  public async set<T = unknown>(
    key: string,
    value: T,
    expirationSeconds?: number
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn(
        `[Redis] set() called but not connected. Key: ${key}`
      );
      return false;
    }

    try {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);

      if (expirationSeconds) {
        await this.client.setex(key, expirationSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      const err = error as RedisError;
      console.error(
        `[Redis] set() failed for key "${key}":`,
        err.message
      );
      return false;
    }
  }

  /**
   * Delete one or more keys from Redis
   * @param keys - Key(s) to delete
   * @returns Number of keys deleted
   */
  public async del(...keys: string[]): Promise<number> {
    if (!this.isConnected || !this.client) {
      console.warn(
        `[Redis] del() called but not connected. Keys: ${keys.join(", ")}`
      );
      return 0;
    }

    try {
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      const err = error as RedisError;
      console.error(
        `[Redis] del() failed for keys "${keys.join(", ")}":`,
        err.message
      );
      return 0;
    }
  }

  /**
   * Check if key exists in Redis
   * @param key - The cache key
   * @returns true if exists, false otherwise
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn(
        `[Redis] exists() called but not connected. Key: ${key}`
      );
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      const err = error as RedisError;
      console.error(
        `[Redis] exists() failed for key "${key}":`,
        err.message
      );
      return false;
    }
  }

  /**
   * Set expiration time (TTL) on an existing key
   * @param key - The cache key
   * @param seconds - TTL in seconds
   * @returns true if expiration was set, false if key doesn't exist
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn(
        `[Redis] expire() called but not connected. Key: ${key}`
      );
      return false;
    }

    try {
      if (seconds < 0) {
        console.warn(
          `[Redis] expire() called with negative seconds: ${seconds}`
        );
        return false;
      }

      const result = await this.client.expire(key, seconds);
      return result === 1; // 1 if timeout was set, 0 if key does not exist
    } catch (error) {
      const err = error as RedisError;
      console.error(
        `[Redis] expire() failed for key "${key}":`,
        err.message
      );
      return false;
    }
  }

  /**
   * Clear all keys from current Redis database
   * WARNING: This flushes the entire current database
   */
  public async flushAll(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.warn("[Redis] flushAll() called but not connected");
      return false;
    }

    try {
      await this.client.flushdb();
      console.log("[Redis] Database flushed successfully");
      return true;
    } catch (error) {
      const err = error as RedisError;
      console.error("[Redis] flushAll() failed:", err.message);
      return false;
    }
  }

  /**
   * Get connection status
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Gracefully disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      console.log("[Redis] No active connection to disconnect");
      return;
    }

    try {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log("[Redis] Disconnected gracefully");
    } catch (error) {
      const err = error as RedisError;
      console.error("[Redis] Error during disconnect:", err.message);
      // Force close if quit fails
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
      this.isConnected = false;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   * Use with caution - prefer provided methods when possible
   */
  public getClient(): Redis | null {
    return this.client;
  }
}

export default RedisService.getInstance();
export { RedisService };
