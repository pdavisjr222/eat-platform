import { Router } from "express";
import { db } from "../db";
import { authenticateToken, type AuthRequest } from "../auth";
import { checkUserStatus, requireEmailVerified } from "../middleware";
import { communityPosts, users } from "../schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET /api/community-posts — list all posts (newest first), with author info
router.get("/api/community-posts", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await db
      .select({
        id: communityPosts.id,
        content: communityPosts.content,
        createdAt: communityPosts.createdAt,
        authorUserId: communityPosts.authorUserId,
        authorName: users.name,
        authorProfileImageUrl: users.profileImageUrl,
        authorCity: users.city,
        authorCountry: users.country,
      })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.authorUserId, users.id))
      .where(eq(communityPosts.isDeleted, false))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(posts);
  } catch (error: any) {
    console.error("Error fetching community posts:", error);
    res.status(500).json({ error: "Failed to fetch community posts" });
  }
});

// POST /api/community-posts — create a post
router.post("/api/community-posts", authenticateToken, requireEmailVerified, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ error: "Post must be 2000 characters or fewer" });
    }

    const [post] = await db
      .insert(communityPosts)
      .values({ authorUserId: req.userId!, content: content.trim() })
      .returning();

    // Return post with author info
    const [authorInfo] = await db
      .select({ name: users.name, profileImageUrl: users.profileImageUrl, city: users.city, country: users.country })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    res.status(201).json({
      ...post,
      authorName: authorInfo?.name,
      authorProfileImageUrl: authorInfo?.profileImageUrl,
      authorCity: authorInfo?.city,
      authorCountry: authorInfo?.country,
    });
  } catch (error: any) {
    console.error("Error creating community post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// DELETE /api/community-posts/:id — delete own post
router.delete("/api/community-posts/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(and(eq(communityPosts.id, id), eq(communityPosts.isDeleted, false)))
      .limit(1);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.authorUserId !== req.userId) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await db
      .update(communityPosts)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(communityPosts.id, id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting community post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
