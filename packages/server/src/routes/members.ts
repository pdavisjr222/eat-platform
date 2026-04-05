import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  sanitizeUser,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  uploadRateLimiter,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import {
  uploadProfileImage,
  getFileUrl,
  deleteFile,
} from "../upload";
import { users } from "../schema";
import { eq, and, desc, or, like, count } from "drizzle-orm";

const router = Router();

router.get("/api/members", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const search = req.query.search as string;
    const country = req.query.country as string;

    let query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        country: users.country,
        region: users.region,
        city: users.city,
        bio: users.bio,
        profileImageUrl: users.profileImageUrl,
        interests: users.interests,
        skills: users.skills,
        offerings: users.offerings,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.isBanned, false)))
      .$dynamic();

    if (search) {
      query = query.where(
        or(
          like(users.name, `%${search}%`),
          like(users.city, `%${search}%`),
          like(users.country, `%${search}%`)
        )
      );
    }

    if (country) {
      query = query.where(eq(users.country, country));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.isActive, true), eq(users.isBanned, false)));

    const allMembers = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(allMembers, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/api/members/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [member] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        country: users.country,
        region: users.region,
        city: users.city,
        bio: users.bio,
        profileImageUrl: users.profileImageUrl,
        interests: users.interests,
        skills: users.skills,
        offerings: users.offerings,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(member);
  } catch (error: any) {
    console.error("Error fetching member:", error);
    res.status(500).json({ error: "Failed to fetch member" });
  }
});

router.put("/api/profile", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const allowedFields = [
      "name", "country", "region", "city", "geographicRegion",
      "bio", "interests", "skills", "offerings", "profileImageUrl",
    ] as const;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.userId!))
      .returning();

    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post(
  "/api/profile/image",
  authenticateToken,
  checkUserStatus,
  uploadRateLimiter,
  (req, res, next) => {
    uploadProfileImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const imageUrl = getFileUrl(req.file.filename, "profiles");

      // Delete old profile image if exists
      const [currentUser] = await db
        .select({ profileImageUrl: users.profileImageUrl })
        .from(users)
        .where(eq(users.id, req.userId!));

      if (currentUser?.profileImageUrl) {
        await deleteFile(currentUser.profileImageUrl);
      }

      await db
        .update(users)
        .set({ profileImageUrl: imageUrl, updatedAt: new Date() })
        .where(eq(users.id, req.userId!));

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

export default router;
