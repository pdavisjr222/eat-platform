import { Router } from "express";
import { db } from "../db";
import {
  authenticateToken,
  type AuthRequest,
} from "../auth";
import {
  checkUserStatus,
  requireEmailVerified,
  requireModerator,
  logAuditAction,
  getPaginationParams,
  buildPaginatedResponse,
} from "../middleware";
import { vendors, coupons } from "../schema";
import { eq, and, desc, count } from "drizzle-orm";

const router = Router();

router.get("/api/vendors", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const type = req.query.type as string;
    const verified = req.query.verified as string;

    let whereConditions: any[] = [];

    if (type) {
      whereConditions.push(eq(vendors.type, type));
    }
    if (verified === "true") {
      whereConditions.push(eq(vendors.verified, true));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(vendors)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const allVendors = await db
      .select()
      .from(vendors)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(vendors.verified), desc(vendors.rating), desc(vendors.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(buildPaginatedResponse(allVendors, totalResult.count, { page, limit, offset }));
  } catch (error: any) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.get("/api/vendors/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get vendor coupons
    const vendorCoupons = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.vendorId, id), eq(coupons.isActive, true)));

    res.json({ ...vendor, coupons: vendorCoupons });
  } catch (error: any) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.post(
  "/api/vendors",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { name, description, type, website, email, phone, address, city, country, latitude, longitude, logoUrl } = req.body;

      if (!name || !description || !type) {
        return res.status(400).json({ error: "Name, description, and type are required" });
      }

      const [newVendor] = await db
        .insert(vendors)
        .values({
          linkedUserId: req.userId,
          name,
          description,
          type,
          website,
          email,
          phone,
          address,
          city,
          country,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          logoUrl,
        })
        .returning();

      res.status(201).json(newVendor);
    } catch (error: any) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  }
);

router.put(
  "/api/vendors/:id",
  authenticateToken,
  checkUserStatus,
  requireEmailVerified,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, id))
        .limit(1);

      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      if (vendor.linkedUserId !== req.userId) {
        return res.status(403).json({ error: "Not authorized to edit this vendor" });
      }

      const { name, description, type, website, email, phone, address, city, country, latitude, longitude, logoUrl } = req.body;

      if (!name || !description || !type) {
        return res.status(400).json({ error: "Name, description, and type are required" });
      }

      const [updated] = await db
        .update(vendors)
        .set({
          name,
          description,
          type,
          website: website || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          country: country || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          logoUrl: logoUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  }
);

// Verify vendor (moderator/admin only)
router.post(
  "/api/vendors/:id/verify",
  authenticateToken,
  checkUserStatus,
  requireModerator,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, id))
        .limit(1);

      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      await db
        .update(vendors)
        .set({
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: req.userId,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, id));

      await logAuditAction(
        req.userId!,
        "verify",
        "vendor",
        id,
        { verified: false },
        { verified: true },
        req
      );

      res.json({ success: true, message: "Vendor verified successfully" });
    } catch (error: any) {
      console.error("Error verifying vendor:", error);
      res.status(500).json({ error: "Failed to verify vendor" });
    }
  }
);

export default router;
