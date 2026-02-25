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
import { jobPosts, jobApplications, users } from "../schema";
import { eq, and, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/jobs", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const category = req.query.category as string;
    const jobType = req.query.jobType as string;
    const isRemote = req.query.isRemote as string;

    let whereConditions = [eq(jobPosts.status, "active")];

    if (category) {
      whereConditions.push(eq(jobPosts.category, category));
    }
    if (jobType) {
      whereConditions.push(eq(jobPosts.jobType, jobType));
    }
    if (isRemote === "true") {
      whereConditions.push(eq(jobPosts.isRemote, true));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(jobPosts)
      .where(and(...whereConditions));

    const jobs = await db
      .select()
      .from(jobPosts)
      .where(and(...whereConditions))
      .orderBy(desc(jobPosts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(jobs, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching job posts:", error);
    res.status(500).json({ error: "Failed to fetch job posts" });
  }
});

router.get("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [job] = await db
      .select()
      .from(jobPosts)
      .where(eq(jobPosts.id, id))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: "Job post not found" });
    }

    res.json(job);
  } catch (error: any) {
    console.error("Error fetching job post:", error);
    res.status(500).json({ error: "Failed to fetch job post" });
  }
});

router.post(
  "/api/jobs",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const {
        title,
        description,
        jobType,
        category,
        locationText,
        latitude,
        longitude,
        isRemote,
        compensationInfo,
        salaryMin,
        salaryMax,
        salaryCurrency,
        requirements,
        benefits,
        applicationUrl,
        applicationEmail,
        expiresAt,
      } = req.body;

      if (!title || !description || !jobType || !category) {
        return res.status(400).json({
          error: "Title, description, job type, and category are required",
        });
      }

      const [newJob] = await db
        .insert(jobPosts)
        .values({
          postedByUserId: req.userId!,
          title,
          description,
          jobType,
          category,
          locationText,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          isRemote: isRemote || false,
          compensationInfo,
          salaryMin: salaryMin ? parseFloat(salaryMin) : null,
          salaryMax: salaryMax ? parseFloat(salaryMax) : null,
          salaryCurrency: salaryCurrency || "USD",
          requirements: requirements || [],
          benefits: benefits || [],
          applicationUrl,
          applicationEmail,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      res.status(201).json(newJob);
    } catch (error: any) {
      console.error("Error creating job post:", error);
      res.status(500).json({ error: "Failed to create job post" });
    }
  }
);

router.put("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [existing] = await db
      .select()
      .from(jobPosts)
      .where(eq(jobPosts.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Job post not found" });
    }

    if (existing.postedByUserId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to edit this job post" });
    }

    const [updatedJob] = await db
      .update(jobPosts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(jobPosts.id, id))
      .returning();

    res.json(updatedJob);
  } catch (error: any) {
    console.error("Error updating job post:", error);
    res.status(500).json({ error: "Failed to update job post" });
  }
});

router.delete("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(jobPosts)
      .where(eq(jobPosts.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Job post not found" });
    }

    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId!));
    const canDelete = existing.postedByUserId === req.userId || user?.role === "admin" || user?.role === "moderator";

    if (!canDelete) {
      return res.status(403).json({ error: "Not authorized to delete this job post" });
    }

    await db.delete(jobApplications).where(eq(jobApplications.jobId, id));
    await db.delete(jobPosts).where(eq(jobPosts.id, id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting job post:", error);
    res.status(500).json({ error: "Failed to delete job post" });
  }
});

export default router;
