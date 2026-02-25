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
import { trainingModules, userTrainingProgress, users } from "../schema";
import { eq, and, desc, asc, count } from "drizzle-orm";

const router = Router();

router.get("/api/training-modules", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;

    // Check if user is premium
    const [user] = await db
      .select({ isPremium: users.isPremium })
      .from(users)
      .where(eq(users.id, req.userId!));

    let whereConditions: any[] = [];

    if (!user?.isPremium) {
      whereConditions.push(eq(trainingModules.isPremium, false));
    }
    if (category) {
      whereConditions.push(eq(trainingModules.category, category));
    }
    if (difficulty) {
      whereConditions.push(eq(trainingModules.difficultyLevel, difficulty));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(trainingModules)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const modules = await db
      .select()
      .from(trainingModules)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(trainingModules.order), desc(trainingModules.createdAt))
      .limit(limit)
      .offset(offset);

    // Get user progress for each module
    const progress = await db
      .select()
      .from(userTrainingProgress)
      .where(eq(userTrainingProgress.userId, req.userId!));

    const progressMap = new Map(progress.map((p) => [p.moduleId, p]));

    const modulesWithProgress = modules.map((module) => ({
      ...module,
      userProgress: progressMap.get(module.id) || null,
    }));

    res.json(buildPaginatedResponse(modulesWithProgress, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching training modules:", error);
    res.status(500).json({ error: "Failed to fetch training modules" });
  }
});

router.get("/api/training-modules/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [module] = await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.id, id))
      .limit(1);

    if (!module) {
      return res.status(404).json({ error: "Training module not found" });
    }

    // Check if premium module requires subscription
    if (module.isPremium) {
      const [user] = await db
        .select({ isPremium: users.isPremium })
        .from(users)
        .where(eq(users.id, req.userId!));

      if (!user?.isPremium) {
        return res.status(403).json({
          error: "Premium subscription required",
          message: "Upgrade to premium to access this training module",
        });
      }
    }

    // Update or create progress record
    const [existingProgress] = await db
      .select()
      .from(userTrainingProgress)
      .where(
        and(
          eq(userTrainingProgress.userId, req.userId!),
          eq(userTrainingProgress.moduleId, id)
        )
      )
      .limit(1);

    if (existingProgress) {
      await db
        .update(userTrainingProgress)
        .set({ lastAccessedAt: new Date() })
        .where(eq(userTrainingProgress.id, existingProgress.id));
    } else {
      await db.insert(userTrainingProgress).values({
        userId: req.userId!,
        moduleId: id,
        lastAccessedAt: new Date(),
      });
    }

    res.json(module);
  } catch (error: any) {
    console.error("Error fetching training module:", error);
    res.status(500).json({ error: "Failed to fetch training module" });
  }
});

router.post("/api/training-modules/:id/complete", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await db
      .update(userTrainingProgress)
      .set({
        completed: true,
        completedAt: new Date(),
        progressPercent: 100,
      })
      .where(
        and(
          eq(userTrainingProgress.userId, req.userId!),
          eq(userTrainingProgress.moduleId, id)
        )
      );

    res.json({ success: true, message: "Module marked as completed" });
  } catch (error: any) {
    console.error("Error completing training module:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

export default router;
