import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  requireEmailVerified,
  uploadRateLimiter,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import {
  uploadListingImages,
  uploadListingImagesMemory,
  getFileUrl,
  deleteFile,
} from "../upload";
import { listings, users } from "../schema";
import { eq, and, desc, or, like, count, sql } from "drizzle-orm";

const router = Router();

router.get("/api/listings", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const search = req.query.search as string;
    const type = req.query.type as string;
    const category = req.query.category as string;

    let whereConditions = [eq(listings.availabilityStatus, "active")];

    if (type) {
      whereConditions.push(eq(listings.type, type));
    }
    if (category) {
      whereConditions.push(eq(listings.category, category));
    }
    if (search) {
      whereConditions.push(
        or(
          like(listings.title, `%${search}%`),
          like(listings.description, `%${search}%`)
        )!
      );
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(listings)
      .where(and(...whereConditions));

    const allListings = await db
      .select()
      .from(listings)
      .where(and(...whereConditions))
      .orderBy(desc(listings.isFeatured), desc(listings.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(allListings, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.get("/api/listings/nearby", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const recentListings = await db
      .select()
      .from(listings)
      .where(eq(listings.availabilityStatus, "active"))
      .orderBy(desc(listings.createdAt))
      .limit(10);

    res.json(recentListings);
  } catch (error: any) {
    console.error("Error fetching nearby listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.get("/api/listings/my-listings", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const userListings = await db
      .select()
      .from(listings)
      .where(eq(listings.ownerUserId, req.userId!))
      .orderBy(desc(listings.createdAt));

    res.json(userListings);
  } catch (error: any) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

router.get("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Increment view count
    await db
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, id));

    res.json(listing);
  } catch (error: any) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

router.post(
  "/api/listings",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { type, category, title, description, price, currency, locationText, latitude, longitude, images } = req.body;

      if (!type || !category || !title || !description) {
        return res.status(400).json({ error: "Type, category, title, and description are required" });
      }

      const [newListing] = await db
        .insert(listings)
        .values({
          ownerUserId: req.userId!,
          type,
          category,
          title,
          description,
          price: price ? parseFloat(price) : null,
          currency: currency || "USD",
          locationText,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          images: images || [],
        })
        .returning();

      res.status(201).json(newListing);
    } catch (error: any) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  }
);

router.post(
  "/api/listings/:id/images",
  authenticateToken,
  checkUserStatus,
  uploadRateLimiter,
  (req, res, next) => {
    uploadListingImagesMemory(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images uploaded" });
      }

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (listing.ownerUserId !== req.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Convert buffers to base64 data URLs for persistent storage in Neon JSONB
      const newImages = files.map(
        (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
      );
      const existingImages = listing.images || [];

      await db
        .update(listings)
        .set({
          images: [...existingImages, ...newImages],
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id));

      res.json({ images: newImages.map((_, i) => `image_${i}`) });
    } catch (error: any) {
      console.error("Error uploading listing images:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  }
);

router.put("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    if (existing.ownerUserId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to edit this listing" });
    }

    // Partial update — only touch fields that are explicitly provided in the request body
    const b = req.body;
    const patch: Record<string, any> = { updatedAt: new Date() };
    if (b.type               !== undefined) patch.type               = b.type;
    if (b.category           !== undefined) patch.category           = b.category;
    if (b.title              !== undefined) patch.title              = b.title;
    if (b.description        !== undefined) patch.description        = b.description;
    if (b.price              !== undefined) patch.price              = b.price ? parseFloat(b.price) : null;
    if (b.currency           !== undefined) patch.currency           = b.currency;
    if (b.locationText       !== undefined) patch.locationText       = b.locationText;
    if (b.latitude           !== undefined) patch.latitude           = b.latitude ? parseFloat(b.latitude) : null;
    if (b.longitude          !== undefined) patch.longitude          = b.longitude ? parseFloat(b.longitude) : null;
    if (b.availabilityStatus !== undefined) patch.availabilityStatus = b.availabilityStatus;
    if (b.images             !== undefined) patch.images             = b.images;

    const [updatedListing] = await db
      .update(listings)
      .set(patch)
      .where(eq(listings.id, id))
      .returning();

    res.json(updatedListing);
  } catch (error: any) {
    console.error("Error updating listing:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

router.delete("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Allow owner, moderators, and admins to delete
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, req.userId!));
    const canDelete = existing.ownerUserId === req.userId || user?.role === "admin" || user?.role === "moderator";

    if (!canDelete) {
      return res.status(403).json({ error: "Not authorized to delete this listing" });
    }

    // Delete associated images
    if (existing.images && existing.images.length > 0) {
      for (const image of existing.images) {
        await deleteFile(image);
      }
    }

    await db.delete(listings).where(eq(listings.id, id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;
