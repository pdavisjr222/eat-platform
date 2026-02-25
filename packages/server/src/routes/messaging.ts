import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  getPaginationParams,
} from "../middleware";
import { chatMessages, users } from "../schema";
import { eq, and, desc, or, count, gt, sql } from "drizzle-orm";
import { notificationService } from "../services/notifications";

const router = Router();

router.get("/api/conversations", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    // Get all unique users this user has messaged with
    const sentTo = await db
      .selectDistinct({ id: chatMessages.recipientUserId })
      .from(chatMessages)
      .where(eq(chatMessages.senderUserId, req.userId!));

    const receivedFrom = await db
      .selectDistinct({ id: chatMessages.senderUserId })
      .from(chatMessages)
      .where(eq(chatMessages.recipientUserId, req.userId!));

    const conversationUserIds = [
      ...new Set([...sentTo.map((s) => s.id), ...receivedFrom.map((r) => r.id)]),
    ];

    if (conversationUserIds.length === 0) {
      return res.json([]);
    }

    const conversationUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        city: users.city,
        country: users.country,
      })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(conversationUserIds.map((id) => sql`${id}`), sql`, `)})`);

    // Get last message and unread count for each conversation
    const conversationsWithMeta = await Promise.all(
      conversationUsers.map(async (user) => {
        const [lastMessage] = await db
          .select()
          .from(chatMessages)
          .where(
            or(
              and(
                eq(chatMessages.senderUserId, req.userId!),
                eq(chatMessages.recipientUserId, user.id)
              ),
              and(
                eq(chatMessages.senderUserId, user.id),
                eq(chatMessages.recipientUserId, req.userId!)
              )
            )
          )
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        const [unreadResult] = await db
          .select({ count: count() })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.senderUserId, user.id),
              eq(chatMessages.recipientUserId, req.userId!),
              eq(chatMessages.isRead, false)
            )
          );

        return {
          ...user,
          lastMessage: lastMessage || null,
          unreadCount: unreadResult?.count || 0,
        };
      })
    );

    // Sort by last message time
    conversationsWithMeta.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    res.json(conversationsWithMeta);
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/api/messages/unread/count", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.recipientUserId, req.userId!),
          eq(chatMessages.isRead, false)
        )
      );

    res.json({ unreadCount: result?.count || 0 });
  } catch (error: any) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

router.get("/api/messages/:userId", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { page, limit, offset } = getPaginationParams(req);
    const since = req.query.since as string; // For polling new messages

    let whereCondition = or(
      and(
        eq(chatMessages.senderUserId, req.userId!),
        eq(chatMessages.recipientUserId, userId)
      ),
      and(
        eq(chatMessages.senderUserId, userId),
        eq(chatMessages.recipientUserId, req.userId!)
      )
    );

    if (since) {
      whereCondition = and(whereCondition, gt(chatMessages.createdAt, new Date(since)));
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(whereCondition)
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Mark messages as read
    await db
      .update(chatMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(chatMessages.senderUserId, userId),
          eq(chatMessages.recipientUserId, req.userId!),
          eq(chatMessages.isRead, false)
        )
      );

    res.json(messages.reverse()); // Return in chronological order
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/api/messages", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { recipientUserId, content, messageType, attachmentUrl } = req.body;

    if (!recipientUserId || !content) {
      return res.status(400).json({ error: "Recipient and content are required" });
    }

    // Verify recipient exists
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, recipientUserId))
      .limit(1);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        senderUserId: req.userId!,
        recipientUserId,
        content,
        messageType: messageType || "text",
        attachmentUrl,
      })
      .returning();

    // Get sender name for notification
    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    // Send push notification
    await notificationService.notifyNewMessage(
      recipientUserId,
      sender?.name || "A member",
      content
    );

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
