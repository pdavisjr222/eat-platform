import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  requireEmailVerified,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import { reviews, users, vendors } from "../schema";
import { eq, and, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/reviews/:subjectType/:subjectId", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { subjectType, subjectId } = req.params;
    const { page, limit, offset } = getPaginationParams(req);

    const [totalResult] = await db
      .select({ count: count() })
      .from(reviews)
      .where(
        and(
          eq(reviews.subjectType, subjectType),
          eq(reviews.subjectId, subjectId)
        )
      );

    const reviewsList = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.subjectType, subjectType),
          eq(reviews.subjectId, subjectId)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Get reviewer info
    const reviewsWithReviewers = await Promise.all(
      reviewsList.map(async (review) => {
        const [reviewer] = await db
          .select({
            id: users.id,
            name: users.name,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(eq(users.id, review.reviewerUserId))
          .limit(1);

        return { ...review, reviewer };
      })
    );

    res.json(buildPaginatedResponse(reviewsWithReviewers, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post(
  "/api/reviews",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { subjectType, subjectId, rating, title, comment } = req.body;

      if (!subjectType || !subjectId || !rating) {
        return res.status(400).json({ error: "Subject type, subject ID, and rating are required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if user already reviewed this subject
      const [existing] = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.reviewerUserId, req.userId!),
            eq(reviews.subjectType, subjectType),
            eq(reviews.subjectId, subjectId)
          )
        )
        .limit(1);

      if (existing) {
        return res.status(400).json({ error: "You have already reviewed this" });
      }

      const [newReview] = await db
        .insert(reviews)
        .values({
          reviewerUserId: req.userId!,
          subjectType,
          subjectId,
          rating,
          title,
          comment,
        })
        .returning();

      // Update vendor rating if applicable
      if (subjectType === "vendor") {
        const vendorReviews = await db
          .select({ rating: reviews.rating })
          .from(reviews)
          .where(
            and(
              eq(reviews.subjectType, "vendor"),
              eq(reviews.subjectId, subjectId)
            )
          );

        const avgRating =
          vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;

        await db
          .update(vendors)
          .set({
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: vendorReviews.length,
            updatedAt: new Date(),
          })
          .where(eq(vendors.id, subjectId));
      }

      res.status(201).json(newReview);
    } catch (error: any) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  }
);

export default router;
