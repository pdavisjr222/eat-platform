import { Router } from "express";
import { db } from "../db";
import { authenticateToken, type AuthRequest } from "../auth";
import { checkUserStatus, requireEmailVerified, getPaginationParams, buildPaginatedResponse } from "../middleware";
import { gardenClubs } from "../schema";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/garden-clubs", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const search = req.query.search as string;

    let whereConditions: any[] = [eq(gardenClubs.isDeleted, false)];

    if (search) {
      whereConditions.push(
        or(
          ilike(gardenClubs.name, `%${search}%`),
          ilike(gardenClubs.city, `%${search}%`),
          ilike(gardenClubs.country, `%${search}%`),
          ilike(gardenClubs.description, `%${search}%`)
        )
      );
    }

    const where = and(...whereConditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(gardenClubs)
      .where(where);

    const clubs = await db
      .select()
      .from(gardenClubs)
      .where(where)
      .orderBy(desc(gardenClubs.memberCount), desc(gardenClubs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(clubs, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching garden clubs:", error);
    res.status(500).json({ error: "Failed to fetch garden clubs" });
  }
});

router.get("/api/garden-clubs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [club] = await db
      .select()
      .from(gardenClubs)
      .where(and(eq(gardenClubs.id, id), eq(gardenClubs.isDeleted, false)))
      .limit(1);

    if (!club) {
      return res.status(404).json({ error: "Garden club not found" });
    }

    res.json(club);
  } catch (error: any) {
    console.error("Error fetching garden club:", error);
    res.status(500).json({ error: "Failed to fetch garden club" });
  }
});

router.post(
  "/api/garden-clubs",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { name, description, city, country, region, email, website, meetingSchedule, contactInfo, latitude, longitude, imageUrl } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const [newClub] = await db
        .insert(gardenClubs)
        .values({
          name,
          description,
          city: city || null,
          country: country || null,
          region: region || null,
          email: email || null,
          website: website || null,
          meetingSchedule: meetingSchedule || null,
          contactInfo: contactInfo || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          imageUrl: imageUrl || null,
          memberCount: 1,
        })
        .returning();

      res.status(201).json(newClub);
    } catch (error: any) {
      console.error("Error creating garden club:", error);
      res.status(500).json({ error: "Failed to create garden club" });
    }
  }
);

router.put(
  "/api/garden-clubs/:id",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description, city, country, region, email, website, meetingSchedule, contactInfo, latitude, longitude, imageUrl } = req.body;

      if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
      }

      const [updated] = await db
        .update(gardenClubs)
        .set({
          name,
          description,
          city: city || null,
          country: country || null,
          region: region || null,
          email: email || null,
          website: website || null,
          meetingSchedule: meetingSchedule || null,
          contactInfo: contactInfo || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          imageUrl: imageUrl || null,
          updatedAt: new Date(),
        })
        .where(and(eq(gardenClubs.id, id), eq(gardenClubs.isDeleted, false)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Garden club not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating garden club:", error);
      res.status(500).json({ error: "Failed to update garden club" });
    }
  }
);

export default router;
