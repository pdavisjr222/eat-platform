import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import { notifications } from "../schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

const router = Router();

router.get("/api/notifications", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const [totalResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, req.userId!));

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.userId!))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(userNotifications, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.post("/api/notifications/mark-read", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body;

    if (ids && ids.length > 0) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, req.userId!),
            sql`${notifications.id} IN (${sql.join(ids.map((id: string) => sql`${id}`), sql`, `)})`
          )
        );
    } else {
      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.userId, req.userId!));
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.get("/api/notifications/unread/count", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.userId!),
          eq(notifications.isRead, false)
        )
      );

    res.json({ unreadCount: result?.count || 0 });
  } catch (error: any) {
    console.error("Error fetching notification count:", error);
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

export default router;
