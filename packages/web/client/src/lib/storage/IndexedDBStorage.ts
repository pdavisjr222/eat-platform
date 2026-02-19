/**
 * IndexedDB Storage Layer for E.A.T. Platform
 *
 * Implements StorageInterface using Dexie.js for offline-first data persistence.
 * Supports all 28 tables from schema.ts with proper indexing for sync operations.
 *
 * Features:
 * - Offline-first with comprehensive sync metadata tracking
 * - Conflict detection and resolution logging
 * - Automatic index creation for performance
 * - Transaction safety for multi-step operations
 * - Comprehensive error handling with logging
 */

import Dexie, { Table, Transaction } from "dexie";
import {
  StorageInterface,
  SyncOperation,
  ConflictEntry,
} from "@eat/shared/sync";

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  country?: string;
  region?: string;
  city?: string;
  geographicRegion?: string;
  bio?: string;
  profileImageUrl?: string;
  interests?: string[];
  skills?: string[];
  offerings?: string[];
  referralCode?: string;
  referredBy?: string;
  creditBalance: number;
  role: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  isActive: boolean;
  isBanned: boolean;
  bannedReason?: string;
  bannedAt?: Date;
  bannedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBListing {
  id: string;
  ownerUserId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  images?: string[];
  price?: number;
  currency?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  availabilityStatus: string;
  isFeatured: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBVendor {
  id: string;
  linkedUserId?: string;
  name: string;
  description: string;
  logoUrl?: string;
  type: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBForagingSpot {
  id: string;
  createdByUserId: string;
  latitude: number;
  longitude: number;
  title: string;
  plantType: string;
  species?: string;
  description: string;
  images?: string[];
  edibleParts?: string;
  seasonality?: string;
  benefits?: string;
  accessNotes?: string;
  isVerified: boolean;
  verifiedBy?: string;
  country?: string;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBEvent {
  id: string;
  title: string;
  description: string;
  hostUserId?: string;
  hostClubId?: string;
  type: string;
  startDateTime: Date;
  endDateTime: Date;
  timeZone: string;
  locationOnline: boolean;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  registeredCount: number;
  imageUrl?: string;
  price?: number;
  currency?: string;
  isFeatured: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBVideoCall {
  id: string;
  callType: string;
  hostUserId: string;
  channelName: string;
  agoraToken?: string;
  status: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface DBGenericRecord {
  id: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  syncStatus?: "synced" | "pending" | "conflict";
  lastSyncedAt?: Date;
  deviceId?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  [key: string]: any;
}

export interface DBSyncOperation extends SyncOperation {}

export interface DBConflictEntry extends ConflictEntry {}

// ============================================================================
// DEXIE DATABASE CLASS
// ============================================================================

export class EatPlatformDB extends Dexie {
  // Data tables
  users!: Table<DBUser>;
  memberProfiles!: Table<DBGenericRecord>;
  listings!: Table<DBListing>;
  vendors!: Table<DBVendor>;
  coupons!: Table<DBGenericRecord>;
  foragingSpots!: Table<DBForagingSpot>;
  gardenClubs!: Table<DBGenericRecord>;
  seedBanks!: Table<DBGenericRecord>;
  resourceHubs!: Table<DBGenericRecord>;
  events!: Table<DBEvent>;
  eventRegistrations!: Table<DBGenericRecord>;
  trainingModules!: Table<DBGenericRecord>;
  userTrainingProgress!: Table<DBGenericRecord>;
  mealPlans!: Table<DBGenericRecord>;
  recipes!: Table<DBGenericRecord>;
  shoppingLists!: Table<DBGenericRecord>;
  chatMessages!: Table<DBGenericRecord>;
  reviews!: Table<DBGenericRecord>;
  jobPosts!: Table<DBGenericRecord>;
  jobApplications!: Table<DBGenericRecord>;
  creditTransactions!: Table<DBGenericRecord>;
  subscriptionPlans!: Table<DBGenericRecord>;
  payments!: Table<DBGenericRecord>;
  notifications!: Table<DBGenericRecord>;
  auditLogs!: Table<DBGenericRecord>;
  vendorReferrals!: Table<DBGenericRecord>;
  videoCalls!: Table<DBVideoCall>;
  videoCallParticipants!: Table<DBGenericRecord>;

  // Sync infrastructure tables
  syncQueue!: Table<DBSyncOperation>;
  deviceRegistry!: Table<DBGenericRecord>;
  conflictLog!: Table<DBConflictEntry>;

  // Metadata
  syncMeta!: Table<{ key: string; timestamp: string }>;

  constructor() {
    super("EatPlatformDB");
    this.version(1).stores({
      // Data tables with indexes for common queries
      users: "id, &email, syncStatus, lastSyncedAt, userId",
      memberProfiles: "id, userId, syncStatus, lastSyncedAt",
      listings: "id, ownerUserId, syncStatus, lastSyncedAt, userId",
      vendors: "id, linkedUserId, syncStatus, lastSyncedAt, userId",
      coupons: "id, vendorId, syncStatus, lastSyncedAt, userId",
      foragingSpots: "id, createdByUserId, syncStatus, lastSyncedAt, userId",
      gardenClubs: "id, syncStatus, lastSyncedAt, userId",
      seedBanks: "id, managedByUserId, syncStatus, lastSyncedAt, userId",
      resourceHubs: "id, createdByUserId, syncStatus, lastSyncedAt, userId",
      events: "id, hostUserId, hostClubId, syncStatus, lastSyncedAt, userId",
      eventRegistrations:
        "id, eventId, userId, syncStatus, lastSyncedAt",
      trainingModules: "id, syncStatus, lastSyncedAt, userId",
      userTrainingProgress:
        "id, userId, moduleId, syncStatus, lastSyncedAt",
      mealPlans: "id, userId, syncStatus, lastSyncedAt",
      recipes: "id, createdByUserId, syncStatus, lastSyncedAt, userId",
      shoppingLists: "id, userId, linkedMealPlanId, syncStatus, lastSyncedAt",
      chatMessages:
        "id, senderUserId, recipientUserId, syncStatus, lastSyncedAt, userId",
      reviews: "id, reviewerUserId, subjectId, syncStatus, lastSyncedAt, userId",
      jobPosts: "id, postedByUserId, vendorId, syncStatus, lastSyncedAt, userId",
      jobApplications: "id, jobId, applicantUserId, syncStatus, lastSyncedAt, userId",
      creditTransactions: "id, userId, syncStatus, lastSyncedAt",
      subscriptionPlans: "id, stripePriceId, syncStatus, lastSyncedAt, userId",
      payments: "id, userId, syncStatus, lastSyncedAt",
      notifications: "id, userId, syncStatus, lastSyncedAt",
      auditLogs: "id, userId, entityType, entityId, syncStatus, lastSyncedAt",
      vendorReferrals:
        "id, referrerVendorId, referredVendorId, syncStatus, lastSyncedAt, userId",
      videoCalls: "id, hostUserId, syncStatus, lastSyncedAt, userId",
      videoCallParticipants: "id, callId, userId, syncStatus, lastSyncedAt",

      // Sync infrastructure
      syncQueue: "id, userId, status, createdAt",
      deviceRegistry: "id, userId, &deviceId, lastActiveAt",
      conflictLog: "id, userId, tableName, recordId, createdAt",
      syncMeta: "key",
    });
  }
}

// ============================================================================
// INDEXED DB STORAGE IMPLEMENTATION
// ============================================================================

export class IndexedDBStorage implements StorageInterface {
  private db: EatPlatformDB;

  constructor() {
    this.db = new EatPlatformDB();
  }

  /**
   * Initialize database connection
   */
  async init(): Promise<void> {
    try {
      await this.db.open();
      console.log("IndexedDBStorage: Database initialized successfully");
    } catch (error) {
      console.error("IndexedDBStorage: Failed to initialize database", error);
      throw new Error(`Failed to initialize IndexedDB: ${error}`);
    }
  }

  /**
   * Get all pending sync operations for a user
   */
  async getSyncQueue(userId: string): Promise<SyncOperation[]> {
    try {
      const operations = await this.db.syncQueue
        .where("userId")
        .equals(userId)
        .toArray();
      return operations;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get sync queue", {
        userId,
        error,
      });
      throw new Error(`Failed to get sync queue: ${error}`);
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(
    operation: Omit<SyncOperation, "id" | "createdAt">
  ): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const record: DBSyncOperation = {
        ...operation,
        id,
        createdAt: new Date(),
      } as any;
      await this.db.syncQueue.add(record);
      console.log("IndexedDBStorage: Operation added to sync queue", { id });
      return id;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to add to sync queue", {
        operation,
        error,
      });
      throw new Error(`Failed to add to sync queue: ${error}`);
    }
  }

  /**
   * Update sync operation status
   */
  async updateSyncQueueStatus(
    id: string,
    status: SyncOperation["status"],
    error?: string
  ): Promise<void> {
    try {
      const operation = await this.db.syncQueue.get(id);
      if (!operation) {
        throw new Error(`Operation ${id} not found`);
      }

      const updates: any = { status };
      if (error) updates.lastError = error;
      if (
        status === "completed" ||
        status === "failed"
      ) {
        updates.processedAt = new Date();
      }

      await this.db.syncQueue.update(id, updates);
      console.log("IndexedDBStorage: Sync queue status updated", {
        id,
        status,
      });
    } catch (error) {
      console.error("IndexedDBStorage: Failed to update sync queue status", {
        id,
        status,
        error,
      });
      throw new Error(`Failed to update sync queue: ${error}`);
    }
  }

  /**
   * Remove completed sync operation
   */
  async removeSyncQueueItem(id: string): Promise<void> {
    try {
      await this.db.syncQueue.delete(id);
      console.log("IndexedDBStorage: Sync queue item removed", { id });
    } catch (error) {
      console.error("IndexedDBStorage: Failed to remove sync queue item", {
        id,
        error,
      });
      throw new Error(`Failed to remove sync queue item: ${error}`);
    }
  }

  /**
   * Record sync conflict
   */
  async addConflict(
    conflict: Omit<ConflictEntry, "id" | "createdAt">
  ): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const record: DBConflictEntry = {
        ...conflict,
        id,
        createdAt: new Date(),
      } as any;
      await this.db.conflictLog.add(record);
      console.log("IndexedDBStorage: Conflict logged", {
        id,
        tableName: conflict.tableName,
        recordId: conflict.recordId,
      });
      return id;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to add conflict", {
        conflict,
        error,
      });
      throw new Error(`Failed to add conflict: ${error}`);
    }
  }

  /**
   * Get unresolved conflicts for user
   */
  async getUnresolvedConflicts(userId: string): Promise<ConflictEntry[]> {
    try {
      const conflicts = await this.db.conflictLog
        .where("userId")
        .equals(userId)
        .filter((c) => !c.resolvedAt)
        .toArray();
      return conflicts;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get unresolved conflicts", {
        userId,
        error,
      });
      throw new Error(`Failed to get conflicts: ${error}`);
    }
  }

  /**
   * Mark conflict as resolved
   */
  async updateConflictResolution(
    id: string,
    resolution: ConflictEntry["resolution"],
    resolvedBy: string
  ): Promise<void> {
    try {
      const conflict = await this.db.conflictLog.get(id);
      if (!conflict) {
        throw new Error(`Conflict ${id} not found`);
      }

      await this.db.conflictLog.update(id, {
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
      });
      console.log("IndexedDBStorage: Conflict resolved", {
        id,
        resolution,
      });
    } catch (error) {
      console.error("IndexedDBStorage: Failed to update conflict resolution", {
        id,
        error,
      });
      throw new Error(`Failed to update conflict: ${error}`);
    }
  }

  /**
   * Get single record from table
   */
  async getRecord(tableName: string, recordId: string): Promise<any> {
    try {
      const table = this.db.table(tableName);
      const record = await table.get(recordId);
      return record || null;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get record", {
        tableName,
        recordId,
        error,
      });
      throw new Error(`Failed to get record: ${error}`);
    }
  }

  /**
   * Insert or update record
   */
  async upsertRecord(tableName: string, record: any): Promise<void> {
    try {
      const table = this.db.table(tableName);
      const existing = await table.get(record.id);

      if (existing) {
        await table.update(record.id, record);
        console.log("IndexedDBStorage: Record updated", {
          tableName,
          recordId: record.id,
        });
      } else {
        await table.add(record);
        console.log("IndexedDBStorage: Record inserted", {
          tableName,
          recordId: record.id,
        });
      }
    } catch (error) {
      console.error("IndexedDBStorage: Failed to upsert record", {
        tableName,
        recordId: record.id,
        error,
      });
      throw new Error(`Failed to upsert record: ${error}`);
    }
  }

  /**
   * Delete record (hard delete)
   */
  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    try {
      const table = this.db.table(tableName);
      await table.delete(recordId);
      console.log("IndexedDBStorage: Record deleted", {
        tableName,
        recordId,
      });
    } catch (error) {
      console.error("IndexedDBStorage: Failed to delete record", {
        tableName,
        recordId,
        error,
      });
      throw new Error(`Failed to delete record: ${error}`);
    }
  }

  /**
   * Get all records from table with optional filters
   */
  async getRecordsByTable(
    tableName: string,
    filters?: Record<string, any>
  ): Promise<any[]> {
    try {
      const table = this.db.table(tableName);

      if (!filters || Object.keys(filters).length === 0) {
        return await table.toArray();
      }

      // Apply filters
      let query = table.toCollection();
      for (const [key, value] of Object.entries(filters)) {
        // If the filter value is an array, use 'anyOf' for OR logic
        if (Array.isArray(value)) {
          query = query.filter((record: any) => value.includes(record[key]));
        } else {
          query = query.filter((record: any) => record[key] === value);
        }
      }

      return await query.toArray();
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get records by table", {
        tableName,
        filters,
        error,
      });
      throw new Error(`Failed to get records: ${error}`);
    }
  }

  /**
   * Get last sync timestamp for user/table
   */
  async getLastSyncedAt(
    userId: string,
    tableName?: string
  ): Promise<Date | null> {
    try {
      const key = tableName
        ? `lastSync:${userId}:${tableName}`
        : `lastSync:${userId}`;
      const entry = await this.db.syncMeta.get(key);
      return entry ? new Date(entry.timestamp) : null;
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get last synced time", {
        userId,
        tableName,
        error,
      });
      throw new Error(`Failed to get last sync time: ${error}`);
    }
  }

  /**
   * Update last sync timestamp
   */
  async setLastSyncedAt(
    userId: string,
    timestamp: Date,
    tableName?: string
  ): Promise<void> {
    try {
      const key = tableName
        ? `lastSync:${userId}:${tableName}`
        : `lastSync:${userId}`;
      await this.db.syncMeta.put({
        key,
        timestamp: timestamp.toISOString(),
      });
      console.log("IndexedDBStorage: Last sync time updated", {
        userId,
        tableName,
        timestamp: timestamp.toISOString(),
      });
    } catch (error) {
      console.error("IndexedDBStorage: Failed to set last sync time", {
        userId,
        tableName,
        error,
      });
      throw new Error(`Failed to set last sync time: ${error}`);
    }
  }

  /**
   * Clear all sync queue items (useful for full sync reset)
   */
  async clearSyncQueue(userId?: string): Promise<void> {
    try {
      if (userId) {
        await this.db.syncQueue.where("userId").equals(userId).delete();
        console.log("IndexedDBStorage: User sync queue cleared", { userId });
      } else {
        await this.db.syncQueue.clear();
        console.log("IndexedDBStorage: All sync queues cleared");
      }
    } catch (error) {
      console.error("IndexedDBStorage: Failed to clear sync queue", {
        userId,
        error,
      });
      throw new Error(`Failed to clear sync queue: ${error}`);
    }
  }

  /**
   * Clear all conflicts (useful for reset)
   */
  async clearConflicts(userId?: string): Promise<void> {
    try {
      if (userId) {
        await this.db.conflictLog.where("userId").equals(userId).delete();
        console.log("IndexedDBStorage: User conflicts cleared", { userId });
      } else {
        await this.db.conflictLog.clear();
        console.log("IndexedDBStorage: All conflicts cleared");
      }
    } catch (error) {
      console.error("IndexedDBStorage: Failed to clear conflicts", {
        userId,
        error,
      });
      throw new Error(`Failed to clear conflicts: ${error}`);
    }
  }

  /**
   * Clear all data (for logout/reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await this.db.delete();
      await this.db.open();
      console.log("IndexedDBStorage: All data cleared and database reopened");
    } catch (error) {
      console.error("IndexedDBStorage: Failed to clear all data", { error });
      throw new Error(`Failed to clear all data: ${error}`);
    }
  }

  /**
   * Get database statistics for debugging
   */
  async getStats(): Promise<{
    tables: Record<string, number>;
    syncQueueCount: number;
    conflictCount: number;
  }> {
    try {
      const tableNames = [
        "users",
        "listings",
        "vendors",
        "foragingSpots",
        "events",
        "videoCalls",
        "recipes",
        "mealPlans",
        "chatMessages",
        "notifications",
        "reviews",
        "jobPosts",
      ];

      const tables: Record<string, number> = {};
      for (const tableName of tableNames) {
        try {
          const table = this.db.table(tableName);
          tables[tableName] = await table.count();
        } catch {
          tables[tableName] = 0;
        }
      }

      const syncQueueCount = await this.db.syncQueue.count();
      const conflictCount = await this.db.conflictLog.count();

      return {
        tables,
        syncQueueCount,
        conflictCount,
      };
    } catch (error) {
      console.error("IndexedDBStorage: Failed to get statistics", { error });
      throw new Error(`Failed to get statistics: ${error}`);
    }
  }
}

export default IndexedDBStorage;
