import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  sanitizeUser,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  requireAdmin,
  logAuditAction,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import {
  users,
  listings,
  vendors,
  events,
  jobPosts,
  foragingSpots,
  trainingModules,
  auditLogs,
} from "../schema";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/admin/users", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const [totalResult] = await db.select({ count: count() }).from(users);

    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(
      buildPaginatedResponse(
        allUsers.map((u) => sanitizeUser(u)),
        totalResult.count,
        { page, limit, offset }
      )
    );
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/api/admin/users/:id/ban", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ error: "Cannot ban admin users" });
    }

    await db
      .update(users)
      .set({
        isBanned: true,
        bannedReason: reason,
        bannedAt: new Date(),
        bannedBy: req.userId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await logAuditAction(req.userId!, "ban", "user", id, { isBanned: false }, { isBanned: true, reason }, req);

    res.json({ success: true, message: "User banned successfully" });
  } catch (error: any) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
});

router.post("/api/admin/users/:id/unban", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await db
      .update(users)
      .set({
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
        bannedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await logAuditAction(req.userId!, "unban", "user", id, { isBanned: true }, { isBanned: false }, req);

    res.json({ success: true, message: "User unbanned successfully" });
  } catch (error: any) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
});

router.post("/api/admin/users/:id/role", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "moderator", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));

    await logAuditAction(req.userId!, "update_role", "user", id, { role: user.role }, { role }, req);

    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.get("/api/admin/audit-logs", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const [totalResult] = await db.select({ count: count() }).from(auditLogs);

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(logs, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/api/admin/stats", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [usersCount] = await db.select({ count: count() }).from(users);
    const [listingsCount] = await db.select({ count: count() }).from(listings);
    const [vendorsCount] = await db.select({ count: count() }).from(vendors);
    const [eventsCount] = await db.select({ count: count() }).from(events);
    const [jobsCount] = await db.select({ count: count() }).from(jobPosts);
    const [foragingSpotsCount] = await db.select({ count: count() }).from(foragingSpots);

    // Premium users
    const [premiumCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isPremium, true));

    // Verified vendors
    const [verifiedVendorsCount] = await db
      .select({ count: count() })
      .from(vendors)
      .where(eq(vendors.verified, true));

    res.json({
      users: usersCount.count,
      premiumUsers: premiumCount.count,
      listings: listingsCount.count,
      vendors: vendorsCount.count,
      verifiedVendors: verifiedVendorsCount.count,
      events: eventsCount.count,
      jobs: jobsCount.count,
      foragingSpots: foragingSpotsCount.count,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Create admin training module
router.post(
  "/api/admin/training-modules",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { title, category, difficultyLevel, description, content, videoUrl, imageUrl, estimatedDuration, isPremium, order } = req.body;

      if (!title || !category || !difficultyLevel || !content) {
        return res.status(400).json({ error: "Title, category, difficulty level, and content are required" });
      }

      const [newModule] = await db
        .insert(trainingModules)
        .values({
          title,
          category,
          difficultyLevel,
          description,
          content,
          videoUrl,
          imageUrl,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
          isPremium: isPremium || false,
          order: order ? parseInt(order) : 0,
        })
        .returning();

      res.status(201).json(newModule);
    } catch (error: any) {
      console.error("Error creating training module:", error);
      res.status(500).json({ error: "Failed to create training module" });
    }
  }
);

export default router;
