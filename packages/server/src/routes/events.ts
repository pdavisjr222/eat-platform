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
import { events, eventRegistrations, users } from "../schema";
import { eq, and, desc, asc, count, sql, gte } from "drizzle-orm";

const router = Router();

router.get("/api/events", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const type = req.query.type as string;
    const status = req.query.status as string;

    let whereConditions: any[] = [];

    if (type) {
      whereConditions.push(eq(events.type, type));
    }
    if (status) {
      whereConditions.push(eq(events.status, status));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(events)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const allEvents = await db
      .select()
      .from(events)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(events.isFeatured), asc(events.startDateTime))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(allEvents, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/events/upcoming", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(eq(events.status, "upcoming"), gte(events.startDateTime, now)))
      .orderBy(asc(events.startDateTime))
      .limit(10);

    res.json(upcomingEvents);
  } catch (error: any) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if user is registered
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, req.userId!)))
      .limit(1);

    res.json({ ...event, isRegistered: !!registration });
  } catch (error: any) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

router.post(
  "/api/events",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const {
        title,
        description,
        type,
        startDateTime,
        endDateTime,
        timeZone,
        locationOnline,
        locationAddress,
        latitude,
        longitude,
        capacity,
        price,
        currency,
        imageUrl,
        images,
      } = req.body;

      if (!title || !description || !type || !startDateTime || !endDateTime || !timeZone) {
        return res.status(400).json({
          error: "Title, description, type, start time, end time, and timezone are required",
        });
      }

      const [newEvent] = await db
        .insert(events)
        .values({
          title,
          description,
          type,
          hostUserId: req.userId!,
          startDateTime: new Date(startDateTime),
          endDateTime: new Date(endDateTime),
          timeZone,
          locationOnline: locationOnline || false,
          locationAddress,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          capacity: capacity ? parseInt(capacity) : null,
          price: price ? parseFloat(price) : 0,
          currency: currency || "USD",
          imageUrl,
          images: images || [],
        })
        .returning();

      res.status(201).json(newEvent);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  }
);

router.post("/api/events/:id/register", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.capacity && event.registeredCount >= event.capacity) {
      return res.status(400).json({ error: "Event is at full capacity" });
    }

    // Check if already registered
    const [existing] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.userId, req.userId!)))
      .limit(1);

    if (existing) {
      return res.status(400).json({ error: "Already registered for this event" });
    }

    await db.insert(eventRegistrations).values({
      eventId: id,
      userId: req.userId!,
    });

    await db
      .update(events)
      .set({ registeredCount: sql`${events.registeredCount} + 1` })
      .where(eq(events.id, id));

    res.json({ success: true, message: "Successfully registered for event" });
  } catch (error: any) {
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Failed to register for event" });
  }
});

router.put("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.hostUserId !== req.userId) {
      return res.status(403).json({ error: "You can only edit your own events" });
    }

    const [updatedEvent] = await db
      .update(events)
      .set({
        ...updateData,
        startDateTime: updateData.startDateTime ? new Date(updateData.startDateTime) : event.startDateTime,
        endDateTime: updateData.endDateTime ? new Date(updateData.endDateTime) : event.endDateTime,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    res.json(updatedEvent);
  } catch (error: any) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId!));
    const canDelete = event.hostUserId === req.userId || user?.role === "admin" || user?.role === "moderator";

    if (!canDelete) {
      return res.status(403).json({ error: "You can only delete your own events" });
    }

    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    await db.delete(events).where(eq(events.id, id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
