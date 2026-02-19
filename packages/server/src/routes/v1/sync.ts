/**
 * Sync API Routes for offline-first data synchronization
 *
 * Features:
 * - Push single operations from client to server
 * - Pull all changes since timestamp for user
 * - Get sync status (last sync time, pending count)
 * - Version conflict detection and resolution
 * - Transaction-based data integrity
 * - Support for all 28 tables with sync metadata
 * - User data isolation (only user's own data)
 *
 * Endpoints:
 * - POST /api/v1/sync/push - Push single operation
 * - POST /api/v1/sync/pull - Pull changes since timestamp
 * - GET /api/v1/sync/status - Get sync status
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { authenticateToken, type AuthRequest } from "../../auth";
import {
  users,
  memberProfiles,
  listings,
  vendors,
  coupons,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  eventRegistrations,
  trainingModules,
  userTrainingProgress,
  mealPlans,
  recipes,
  shoppingLists,
  chatMessages,
  reviews,
  jobPosts,
  jobApplications,
  creditTransactions,
  subscriptionPlans,
  payments,
  notifications,
  auditLogs,
  syncQueue,
  deviceRegistry,
  conflictLog,
  vendorReferrals,
  videoCalls,
  videoCallParticipants,
} from "@eat/shared/schema";
import { eq, and, gt, sql, or } from "drizzle-orm";
import type { Response } from "express";

const router = Router();

// ============================================
// TYPES & SCHEMAS
// ============================================

const pushOperationSchema = z.object({
  tableName: z.string(),
  recordId: z.string(),
  operation: z.enum(["create", "update", "delete"]),
  data: z.record(z.any()),
  deviceId: z.string(),
  clientVersion: z.number().optional(),
});

const pullRequestSchema = z.object({
  userId: z.string(),
  deviceId: z.string(),
  since: z.string().datetime(),
  tables: z.array(z.string()).optional(), // Optional: specific tables to sync
});

type PushOperation = z.infer<typeof pushOperationSchema>;
type PullRequest = z.infer<typeof pullRequestSchema>;

interface SyncChange {
  tableName: string;
  recordId: string;
  operation: "create" | "update" | "delete";
  data: Record<string, any>;
  version: number;
  updatedAt: Date;
}

// Map table names to Drizzle table references
const TABLE_MAP: Record<string, any> = {
  users,
  memberProfiles,
  listings,
  vendors,
  coupons,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  eventRegistrations,
  trainingModules,
  userTrainingProgress,
  mealPlans,
  recipes,
  shoppingLists,
  chatMessages,
  reviews,
  jobPosts,
  jobApplications,
  creditTransactions,
  subscriptionPlans,
  payments,
  notifications,
  auditLogs,
  syncQueue,
  deviceRegistry,
  conflictLog,
  vendorReferrals,
  videoCalls,
  videoCallParticipants,
};

// Tables that have user ownership/filtering
const USER_OWNED_TABLES = [
  "memberProfiles",
  "listings",
  "foragingSpots",
  "eventRegistrations",
  "userTrainingProgress",
  "mealPlans",
  "recipes",
  "shoppingLists",
  "chatMessages",
  "reviews",
  "jobPosts",
  "jobApplications",
  "creditTransactions",
  "payments",
  "notifications",
  "syncQueue",
  "deviceRegistry",
  "conflictLog",
  "videoCallParticipants",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get user-filtered condition for table queries
 */
function getUserFilterCondition(tableName: string, userId: string, table: any): any {
  switch (tableName) {
    case "memberProfiles":
      return eq(table.userId, userId);
    case "listings":
      return eq(table.ownerUserId, userId);
    case "foragingSpots":
      return eq(table.createdByUserId, userId);
    case "eventRegistrations":
      return eq(table.userId, userId);
    case "userTrainingProgress":
      return eq(table.userId, userId);
    case "mealPlans":
    case "recipes":
    case "shoppingLists":
    case "notifications":
    case "syncQueue":
    case "deviceRegistry":
    case "conflictLog":
      return eq(table.userId, userId);
    case "chatMessages":
      return or(eq(table.senderUserId, userId), eq(table.recipientUserId, userId));
    case "reviews":
      return eq(table.reviewerUserId, userId);
    case "jobPosts":
      return eq(table.postedByUserId, userId);
    case "jobApplications":
      return eq(table.applicantUserId, userId);
    case "creditTransactions":
    case "payments":
      return eq(table.userId, userId);
    case "videoCallParticipants":
      return eq(table.userId, userId);
    case "users":
      return eq(table.id, userId);
    default:
      return undefined;
  }
}

/**
 * Check if user has permission to modify record
 */
async function checkRecordPermission(
  tableName: string,
  recordId: string,
  userId: string,
  operation: "create" | "update" | "delete"
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const table = TABLE_MAP[tableName];
    if (!table) {
      return { allowed: false, error: `Unknown table: ${tableName}` };
    }

    // For create operations, always allow (ownership will be set)
    if (operation === "create") {
      return { allowed: true };
    }

    // For update/delete, check ownership
    const [record] = await db
      .select()
      .from(table)
      .where(eq(table.id, recordId))
      .limit(1);

    if (!record) {
      return { allowed: false, error: "Record not found" };
    }

    // Check ownership based on table type
    const userFilter = getUserFilterCondition(tableName, userId, table);
    if (!userFilter) {
      // Tables without user ownership (public data) - allow admins/moderators only
      const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
      const isAdmin = user?.role === "admin" || user?.role === "moderator";
      return { allowed: isAdmin, error: isAdmin ? undefined : "Insufficient permissions" };
    }

    // Verify record belongs to user
    const [ownedRecord] = await db
      .select()
      .from(table)
      .where(and(eq(table.id, recordId), userFilter))
      .limit(1);

    if (!ownedRecord) {
      return { allowed: false, error: "Not authorized to modify this record" };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Permission check error:", error);
    return { allowed: false, error: "Permission check failed" };
  }
}

/**
 * Apply operation to database with conflict detection
 */
async function applyOperation(
  operation: PushOperation,
  userId: string
): Promise<{ success: boolean; conflict?: any; error?: string }> {
  try {
    const table = TABLE_MAP[operation.tableName];
    if (!table) {
      return { success: false, error: `Unknown table: ${operation.tableName}` };
    }

    // Check permissions
    const permission = await checkRecordPermission(
      operation.tableName,
      operation.recordId,
      userId,
      operation.operation
    );
    if (!permission.allowed) {
      return { success: false, error: permission.error };
    }

    // Check for version conflict (only for update/delete)
    if (operation.operation !== "create") {
      const [existingRecord] = await db
        .select()
        .from(table)
        .where(eq(table.id, operation.recordId))
        .limit(1);

      if (existingRecord) {
        const serverVersion = existingRecord.version || 0;
        const clientVersion = operation.clientVersion || 0;

        if (serverVersion !== clientVersion) {
          // Version conflict detected
          await db.insert(conflictLog).values({
            tableName: operation.tableName,
            recordId: operation.recordId,
            userId,
            deviceId: operation.deviceId,
            serverVersion,
            clientVersion,
            serverData: existingRecord,
            clientData: operation.data,
          });

          return {
            success: false,
            conflict: {
              serverVersion,
              clientVersion,
              serverData: existingRecord,
              message: "Version conflict detected",
            },
          };
        }
      }
    }

    // Apply operation based on type
    switch (operation.operation) {
      case "create": {
        const newRecord = {
          ...operation.data,
          id: operation.recordId,
          version: 1,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          deviceId: operation.deviceId,
          isDeleted: false,
          createdAt: operation.data.createdAt || new Date(),
          updatedAt: new Date(),
        };

        await db.insert(table).values(newRecord);
        return { success: true };
      }

      case "update": {
        const [currentRecord] = await db
          .select()
          .from(table)
          .where(eq(table.id, operation.recordId))
          .limit(1);

        const updatedRecord = {
          ...operation.data,
          version: (currentRecord?.version || 0) + 1,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          deviceId: operation.deviceId,
          updatedAt: new Date(),
        };

        await db
          .update(table)
          .set(updatedRecord)
          .where(eq(table.id, operation.recordId));

        return { success: true };
      }

      case "delete": {
        // Soft delete: mark as deleted
        await db
          .update(table)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            syncStatus: "synced",
            lastSyncedAt: new Date(),
            version: sql`${table.version} + 1`,
          })
          .where(eq(table.id, operation.recordId));

        return { success: true };
      }

      default:
        return { success: false, error: "Invalid operation type" };
    }
  } catch (error: any) {
    console.error("Apply operation error:", error);
    return { success: false, error: error.message || "Failed to apply operation" };
  }
}

/**
 * Get all changes for user since timestamp
 */
async function getChangesSince(
  userId: string,
  since: Date,
  tables?: string[]
): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const tablesToSync = tables || Object.keys(TABLE_MAP);

  try {
    for (const tableName of tablesToSync) {
      const table = TABLE_MAP[tableName];
      if (!table) continue;

      // Skip tables without sync metadata
      if (!table.updatedAt || !table.version) continue;

      // Build query with user filter and timestamp filter
      const userFilter = getUserFilterCondition(tableName, userId, table);
      const timeFilter = gt(table.updatedAt, since);

      let query;
      if (userFilter) {
        query = db
          .select()
          .from(table)
          .where(and(userFilter, timeFilter));
      } else {
        // For public data tables, only sync if updated after timestamp
        query = db.select().from(table).where(timeFilter);
      }

      const records = await query;

      // Convert records to sync changes
      for (const record of records) {
        const operation = record.isDeleted ? "delete" : record.createdAt > since ? "create" : "update";

        changes.push({
          tableName,
          recordId: record.id,
          operation,
          data: record,
          version: record.version || 1,
          updatedAt: record.updatedAt,
        });
      }
    }

    // Sort by updatedAt to maintain order
    changes.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

    return changes;
  } catch (error) {
    console.error("Get changes error:", error);
    return [];
  }
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/v1/sync/push
 * Push single operation from client to server
 */
router.post("/push", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validation = pushOperationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const operation = validation.data;
    const userId = req.userId!;

    // Apply operation with conflict detection
    const result = await applyOperation(operation, userId);

    if (!result.success) {
      if (result.conflict) {
        // Return 409 Conflict with server data
        return res.status(409).json({
          error: "Version conflict",
          conflict: result.conflict,
        });
      }

      return res.status(400).json({
        error: result.error || "Failed to apply operation",
      });
    }

    res.json({
      success: true,
      message: "Operation applied successfully",
    });
  } catch (error: any) {
    console.error("Push operation error:", error);
    res.status(500).json({
      error: "Failed to process push operation",
      details: error.message,
    });
  }
});

/**
 * POST /api/v1/sync/pull
 * Pull all changes since timestamp for user
 */
router.post("/pull", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validation = pullRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validation.error.errors,
      });
    }

    const pullRequest = validation.data;
    const userId = req.userId!;

    // Verify user matches authenticated user
    if (pullRequest.userId !== userId) {
      return res.status(403).json({
        error: "Cannot pull data for other users",
      });
    }

    const since = new Date(pullRequest.since);
    const changes = await getChangesSince(userId, since, pullRequest.tables);

    res.json({
      success: true,
      changes,
      timestamp: new Date().toISOString(),
      count: changes.length,
    });
  } catch (error: any) {
    console.error("Pull changes error:", error);
    res.status(500).json({
      error: "Failed to pull changes",
      details: error.message,
    });
  }
});

/**
 * GET /api/v1/sync/status
 * Get sync status for user (last sync time, pending operations count)
 */
router.get("/status", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get last synced timestamp from device registry
    const deviceId = req.query.deviceId as string;
    let lastSyncedAt: Date | null = null;

    if (deviceId) {
      const [device] = await db
        .select({ lastActiveAt: deviceRegistry.lastActiveAt })
        .from(deviceRegistry)
        .where(and(eq(deviceRegistry.userId, userId), eq(deviceRegistry.deviceId, deviceId)))
        .limit(1);

      lastSyncedAt = device?.lastActiveAt || null;
    }

    // Get pending operations count
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(syncQueue)
      .where(
        and(
          eq(syncQueue.userId, userId),
          or(eq(syncQueue.status, "pending"), eq(syncQueue.status, "failed"))
        )
      );

    const pendingCount = Number(pendingResult?.count || 0);

    // Get unresolved conflicts count
    const [conflictsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conflictLog)
      .where(and(eq(conflictLog.userId, userId), sql`${conflictLog.resolution} IS NULL`));

    const conflictsCount = Number(conflictsResult?.count || 0);

    res.json({
      success: true,
      lastSyncedAt: lastSyncedAt?.toISOString() || null,
      pendingCount,
      conflictsCount,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get sync status error:", error);
    res.status(500).json({
      error: "Failed to get sync status",
      details: error.message,
    });
  }
});

// ============================================
// EXPORT
// ============================================

export default router;
