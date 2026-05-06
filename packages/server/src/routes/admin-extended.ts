// Extended admin endpoints — admin-only powers that go beyond ban / unban /
// role-change / delete (those live in admin.ts). Every endpoint here is gated
// by `requireAdmin` and writes to `audit_logs` so destructive or sensitive
// reads are attributable to a specific admin.

import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  generateToken,
  hashPassword,
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
import { users, chatMessages, payments, creditTransactions, notifications } from "../schema";
import { eq, or, desc, count, sql } from "drizzle-orm";
import logger from "../logger";

const router = Router();

// Fields a regular user can edit on their own profile (used by PUT /api/profile).
// Admins may also edit role / isActive / isPremium / banned* via this endpoint.
const PROFILE_FIELDS = [
  "name",
  "country",
  "region",
  "city",
  "bio",
  "interests",
  "skills",
  "offerings",
  "profileImageUrl",
] as const;

const ADMIN_ONLY_FIELDS = [
  "role",
  "isActive",
  "isPremium",
  "isBanned",
  "bannedReason",
  "creditBalance",
] as const;

const ALLOWED_ROLES = new Set(["user", "moderator", "admin"]);

// GET /api/admin/users/:id -- full profile incl. private fields
router.get(
  "/api/admin/users/:id",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Strip only password_hash + reset/verification tokens; admins see everything else
      // including private fields like stripeCustomerId, banned* metadata, raw email.
      const {
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        passwordResetToken,
        passwordResetExpires,
        ...adminView
      } = user as Record<string, unknown>;

      await logAuditAction(
        req.userId!,
        "admin.user.view-private",
        "user",
        id,
        null,
        null,
        req
      );

      res.json({ user: adminView });
    } catch (error) {
      logger.error({ error }, "Admin view user error");
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);

// PUT /api/admin/users/:id -- edit any user's profile
router.put(
  "/api/admin/users/:id",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "User not found" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      for (const field of [...PROFILE_FIELDS, ...ADMIN_ONLY_FIELDS]) {
        if (req.body[field] !== undefined) {
          if (field === "role" && !ALLOWED_ROLES.has(req.body.role)) {
            return res.status(400).json({ error: "Invalid role" });
          }
          updates[field] = req.body[field];
          oldValues[field] = (existing as Record<string, unknown>)[field];
          newValues[field] = req.body[field];
        }
      }

      if (Object.keys(newValues).length === 0) {
        return res.status(400).json({ error: "No editable fields provided" });
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      await logAuditAction(
        req.userId!,
        "admin.user.edit",
        "user",
        id,
        oldValues,
        newValues,
        req
      );

      res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      logger.error({ error }, "Admin edit user error");
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// GET /api/admin/users/:id/messages -- view a user's private DMs (paginated)
router.get(
  "/api/admin/users/:id/messages",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { page, limit, offset } = getPaginationParams(req);

      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
      if (!target) return res.status(404).json({ error: "User not found" });

      const where = or(
        eq(chatMessages.senderUserId, id),
        eq(chatMessages.recipientUserId, id)
      );

      const [{ total }] = await db
        .select({ total: count() })
        .from(chatMessages)
        .where(where);

      const rows = await db
        .select()
        .from(chatMessages)
        .where(where)
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit)
        .offset(offset);

      await logAuditAction(
        req.userId!,
        "admin.user.view-messages",
        "user",
        id,
        null,
        { count: rows.length, page, limit },
        req
      );

      res.json(buildPaginatedResponse(rows, total, { page, limit, offset }));
    } catch (error) {
      logger.error({ error }, "Admin view messages error");
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

// GET /api/admin/users/:id/payments -- payments + credit transactions
router.get(
  "/api/admin/users/:id/payments",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
      if (!target) return res.status(404).json({ error: "User not found" });

      const [pmts, credits] = await Promise.all([
        db
          .select()
          .from(payments)
          .where(eq(payments.userId, id))
          .orderBy(desc(payments.createdAt)),
        db
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.userId, id))
          .orderBy(desc(creditTransactions.createdAt)),
      ]);

      await logAuditAction(
        req.userId!,
        "admin.user.view-payments",
        "user",
        id,
        null,
        { paymentCount: pmts.length, creditCount: credits.length },
        req
      );

      res.json({ payments: pmts, creditTransactions: credits });
    } catch (error) {
      logger.error({ error }, "Admin view payments error");
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }
);

// POST /api/admin/users/:id/impersonate -- get a JWT acting as the target user.
// The JWT carries impersonatorId so subsequent audit entries credit the admin.
router.post(
  "/api/admin/users/:id/impersonate",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (id === req.userId) {
        return res.status(400).json({ error: "Cannot impersonate yourself" });
      }

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!target) return res.status(404).json({ error: "User not found" });

      // Refuse to impersonate other admins -- prevents one admin from quietly
      // borrowing another admin's elevated authority.
      if (target.role === "admin") {
        return res
          .status(403)
          .json({ error: "Cannot impersonate another admin" });
      }

      const token = generateToken(target.id, {
        role: target.role,
        impersonatorId: req.userId,
      });

      await logAuditAction(
        req.userId!,
        "admin.user.impersonate",
        "user",
        id,
        null,
        { impersonator: req.userId, target: target.email },
        req
      );

      res.json({
        user: sanitizeUser(target),
        token,
        impersonator: { id: req.userId },
      });
    } catch (error) {
      logger.error({ error }, "Admin impersonate error");
      res.status(500).json({ error: "Failed to impersonate" });
    }
  }
);

// POST /api/admin/users/:id/temp-password -- set a known temp password and
// return it to the admin. Useful when an admin is helping a user over the
// phone and the user can't access their email.
router.post(
  "/api/admin/users/:id/temp-password",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!target) return res.status(404).json({ error: "User not found" });

      // 12-char unambiguous alphabet (no I/l/1/O/0)
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let tempPassword = "";
      const buf = (await import("crypto")).randomBytes(12);
      for (let i = 0; i < 12; i++) tempPassword += chars[buf[i] % chars.length];

      const hash = await hashPassword(tempPassword);

      await db
        .update(users)
        .set({
          passwordHash: hash,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      await logAuditAction(
        req.userId!,
        "admin.user.temp-password",
        "user",
        id,
        null,
        { target: target.email },
        req
      );

      res.json({
        message:
          "Temporary password set. Tell the user to log in with it and change it immediately.",
        tempPassword,
      });
    } catch (error) {
      logger.error({ error }, "Admin temp-password error");
      res.status(500).json({ error: "Failed to set temp password" });
    }
  }
);

// POST /api/admin/announcements -- broadcast a notification to every active user
router.post(
  "/api/admin/announcements",
  authenticateToken,
  checkUserStatus,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { title, message, type } = req.body as {
        title?: string;
        message?: string;
        type?: string;
      };

      if (!title || typeof title !== "string" || title.length === 0) {
        return res.status(400).json({ error: "title required" });
      }
      if (!message || typeof message !== "string" || message.length === 0) {
        return res.status(400).json({ error: "message required" });
      }

      // Insert one notifications row per active, non-banned user in a single SQL.
      // Using a SELECT to drive the INSERT keeps the round-trip small even with
      // 100k users; for very large user bases this should move to a job queue.
      const inserted = await db.execute(sql`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, version, sync_status, is_deleted)
        SELECT gen_random_uuid()::text, id, ${title}, ${message}, ${type ?? "announcement"}, false, NOW(), 1, 'synced', false
          FROM users
         WHERE is_active = true AND is_banned = false
      `);

      const count = (inserted as { rowCount?: number }).rowCount ?? 0;

      await logAuditAction(
        req.userId!,
        "admin.announcement.broadcast",
        "notification",
        null,
        null,
        { title, type: type ?? "announcement", recipients: count },
        req
      );

      res.json({
        message: `Announcement sent to ${count} active users.`,
        recipients: count,
      });
    } catch (error) {
      logger.error({ error }, "Admin announcement error");
      res.status(500).json({ error: "Failed to send announcement" });
    }
  }
);

export default router;
