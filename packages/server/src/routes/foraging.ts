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
import { foragingSpots, users } from "../schema";
import { eq, and, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/foraging-spots", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const plantType = req.query.plantType as string;
    const country = req.query.country as string;

    let whereConditions: any[] = [];

    if (plantType) {
      whereConditions.push(eq(foragingSpots.plantType, plantType));
    }
    if (country) {
      whereConditions.push(eq(foragingSpots.country, country));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(foragingSpots)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const spots = await db
      .select()
      .from(foragingSpots)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(foragingSpots.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(spots, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching foraging spots:", error);
    res.status(500).json({ error: "Failed to fetch foraging spots" });
  }
});

router.get("/api/foraging-spots/recent", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const recentSpots = await db
      .select()
      .from(foragingSpots)
      .orderBy(desc(foragingSpots.createdAt))
      .limit(10);

    res.json(recentSpots);
  } catch (error: any) {
    console.error("Error fetching recent foraging spots:", error);
    res.status(500).json({ error: "Failed to fetch foraging spots" });
  }
});

router.get("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [spot] = await db
      .select()
      .from(foragingSpots)
      .where(eq(foragingSpots.id, id))
      .limit(1);

    if (!spot) {
      return res.status(404).json({ error: "Foraging spot not found" });
    }

    res.json(spot);
  } catch (error: any) {
    console.error("Error fetching foraging spot:", error);
    res.status(500).json({ error: "Failed to fetch foraging spot" });
  }
});

router.post(
  "/api/foraging-spots",
  authenticateToken,
  checkUserStatus,
  async (req: AuthRequest, res) => {
    try {
      const {
        latitude,
        longitude,
        title,
        plantType,
        species,
        otherNames,
        description,
        edibleParts,
        seasonality,
        benefits,
        accessNotes,
        country,
        region,
        images,
      } = req.body;

      if (!latitude || !longitude || !title || !plantType || !description) {
        return res.status(400).json({
          error: "Latitude, longitude, title, plant type, and description are required",
        });
      }

      const [newSpot] = await db
        .insert(foragingSpots)
        .values({
          createdByUserId: req.userId!,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          title,
          plantType,
          species,
          otherNames,
          description,
          edibleParts,
          seasonality,
          benefits,
          accessNotes,
          country,
          region,
          images: images || [],
        })
        .returning();

      res.status(201).json(newSpot);
    } catch (error: any) {
      console.error("Error creating foraging spot:", error);
      res.status(500).json({ error: "Failed to create foraging spot" });
    }
  }
);

router.put("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [existing] = await db
      .select()
      .from(foragingSpots)
      .where(eq(foragingSpots.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Foraging spot not found" });
    }

    if (existing.createdByUserId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to edit this spot" });
    }

    const [updatedSpot] = await db
      .update(foragingSpots)
      .set({
        ...updateData,
        latitude: updateData.latitude ? parseFloat(updateData.latitude) : existing.latitude,
        longitude: updateData.longitude ? parseFloat(updateData.longitude) : existing.longitude,
        updatedAt: new Date(),
      })
      .where(eq(foragingSpots.id, id))
      .returning();

    res.json(updatedSpot);
  } catch (error: any) {
    console.error("Error updating foraging spot:", error);
    res.status(500).json({ error: "Failed to update foraging spot" });
  }
});

router.delete("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(foragingSpots)
      .where(eq(foragingSpots.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Foraging spot not found" });
    }

    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId!));
    const canDelete = existing.createdByUserId === req.userId || user?.role === "admin" || user?.role === "moderator";

    if (!canDelete) {
      return res.status(403).json({ error: "Not authorized to delete this spot" });
    }

    await db.delete(foragingSpots).where(eq(foragingSpots.id, id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting foraging spot:", error);
    res.status(500).json({ error: "Failed to delete foraging spot" });
  }
});

export default router;
