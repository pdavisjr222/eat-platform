/**
 * Type definitions for Redis Cache Service
 * Provides TypeScript interfaces and types for improved IDE support and type safety
 */

/**
 * Base cache entry interface
 */
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * User data structure for caching
 */
export interface CachedUser {
  id: string;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
  profileImage?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  verified: boolean;
  createdAt: string;
}

/**
 * Session data for authentication
 */
export interface CachedSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Marketplace listing data
 */
export interface CachedListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  vendorId: string;
  images: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  condition: "new" | "used" | "refurbished";
  available: number;
  rating: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Foraging spot data
 */
export interface CachedForagingSpot {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  speciesAvailable: string[];
  seasonalData: {
    season: "spring" | "summer" | "fall" | "winter";
    harvestPeriod: string;
    abundance: "low" | "medium" | "high";
  }[];
  images: string[];
  submissions: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event calendar entry
 */
export interface CachedEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  organizer: {
    id: string;
    name: string;
    image?: string;
  };
  attendees: string[]; // User IDs
  capacity: number;
  registered: number;
  image?: string;
  tags: string[];
  createdAt: string;
}

/**
 * Vendor referral data
 */
export interface CachedVendorReferrals {
  vendorId: string;
  activeReferrals: number;
  totalCommissions: number;
  monthlyCommissions: number;
  referralRate: number;
  topReferrers: Array<{
    userId: string;
    count: number;
    earnings: number;
  }>;
  lastUpdated: string;
}

/**
 * Learning/Training module
 */
export interface CachedTrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number; // in minutes
  difficulty: "beginner" | "intermediate" | "advanced";
  instructor: {
    id: string;
    name: string;
    bio?: string;
    image?: string;
  };
  lessons: Array<{
    id: string;
    title: string;
    duration: number;
    videoUrl?: string;
  }>;
  price: number;
  rating: number;
  enrollees: number;
  image?: string;
  createdAt: string;
}

/**
 * Video call session
 */
export interface CachedVideoCall {
  id: string;
  type: "one-on-one" | "group";
  initiatorId: string;
  participantIds: string[];
  channelName: string;
  startTime: number;
  endTime?: number;
  duration?: number; // in seconds
  status: "active" | "completed" | "failed";
  recordingUrl?: string;
}

/**
 * Notification preferences
 */
export interface CachedNotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  categories: {
    messages: boolean;
    listings: boolean;
    events: boolean;
    referrals: boolean;
    security: boolean;
  };
  updatedAt: string;
}

/**
 * Rate limit tracking
 */
export interface RateLimitData {
  userId: string;
  endpoint: string;
  count: number;
  resetAt: number;
}

/**
 * Device registry for push notifications
 */
export interface CachedDeviceToken {
  userId: string;
  deviceId: string;
  token: string;
  platform: "ios" | "android" | "web";
  lastSeen: number;
}

/**
 * Redis configuration options
 */
export interface RedisConfig {
  url: string;
  maxRetries?: number;
  connectTimeout?: number;
  retryDelayBase?: number;
  maxReconnectInterval?: number;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  connectedAt: number;
  uptime: number;
}

/**
 * Default TTL values (in seconds)
 */
export const DEFAULT_TTLS = {
  // Authentication & Sessions
  SESSION: 604800, // 7 days
  JWT_TOKEN: 604800, // 7 days
  PASSWORD_RESET: 3600, // 1 hour

  // User Data
  USER_PROFILE: 3600, // 1 hour
  USER_LISTINGS: 1800, // 30 minutes
  USER_REFERRALS: 21600, // 6 hours

  // Marketplace
  LISTING: 86400, // 24 hours
  LISTING_SEARCH: 3600, // 1 hour
  PRODUCT_CATEGORY: 86400, // 24 hours

  // Foraging
  FORAGING_SPOT: 86400, // 24 hours
  FORAGING_SEARCH: 3600, // 1 hour

  // Events
  EVENT: 172800, // 48 hours
  EVENT_LIST: 3600, // 1 hour

  // Learning
  TRAINING_MODULE: 86400, // 24 hours
  COURSE_PROGRESS: 3600, // 1 hour

  // Rate Limiting
  RATE_LIMIT: 60, // 1 minute
  API_QUOTA: 3600, // 1 hour

  // Notifications
  NOTIFICATION_PREFERENCES: 604800, // 7 days
  DEVICE_TOKEN: 2592000, // 30 days

  // General
  CACHE_CONTROL: 3600, // 1 hour
  TEMPORARY: 300, // 5 minutes
};

/**
 * Cache key prefixes for organization
 */
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_EMAIL: (email: string) => `user:email:${email}`,
  USER_LISTINGS: (userId: string) => `user:${userId}:listings`,
  USER_REFERRALS: (userId: string) => `user:${userId}:referrals`,
  USER_NOTIFICATIONS: (userId: string) => `user:${userId}:notifications`,

  SESSION: (userId: string) => `session:${userId}`,
  SESSION_TOKEN: (token: string) => `session:token:${token}`,

  LISTING: (id: string) => `listing:${id}`,
  LISTINGS_CATEGORY: (category: string) => `listings:category:${category}`,
  LISTING_SEARCH: (query: string) => `listing:search:${query}`,

  FORAGING_SPOT: (id: string) => `foragingspot:${id}`,
  FORAGING_SEARCH: (location: string) => `foragingspot:search:${location}`,

  EVENT: (id: string) => `event:${id}`,
  EVENTS_DATE: (date: string) => `events:date:${date}`,
  EVENT_ATTENDEES: (eventId: string) => `event:${eventId}:attendees`,

  TRAINING_MODULE: (id: string) => `training:${id}`,
  TRAINING_PROGRESS: (userId: string, moduleId: string) =>
    `training:${userId}:${moduleId}`,

  VENDOR_REFERRALS: (vendorId: string) => `vendor:${vendorId}:referrals`,
  VENDOR_STATS: (vendorId: string) => `vendor:${vendorId}:stats`,

  RATE_LIMIT: (userId: string, endpoint: string) =>
    `ratelimit:${userId}:${endpoint}`,

  NOTIFICATION_PREFS: (userId: string) => `notifications:${userId}:prefs`,
  DEVICE_TOKEN: (userId: string, deviceId: string) =>
    `device:${userId}:${deviceId}`,

  HEALTH_TEST: (timestamp: number) => `health:test:${timestamp}`,
};

/**
 * Error types for cache operations
 */
export enum CacheErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
  DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
  TIMEOUT = "TIMEOUT",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Custom cache error
 */
export class CacheError extends Error {
  constructor(
    public type: CacheErrorType,
    public message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "CacheError";
  }
}
