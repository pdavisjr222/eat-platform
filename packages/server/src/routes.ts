import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { db } from "./db";
import { config } from "./config";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  generateVerificationToken,
  generatePasswordResetToken,
  generateReferralCode,
  authenticateToken,
  sanitizeUser,
  type AuthRequest,
} from "./auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "./email";
import {
  corsMiddleware,
  securityMiddleware,
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  checkUserStatus,
  requireEmailVerified,
  requireRole,
  requireAdmin,
  requireModerator,
  requirePremium,
  logAuditAction,
  getPaginationParams,
  buildPaginatedResponse,
  optionalAuth,
} from "./middleware";
import {
  uploadProfileImage,
  uploadListingImages,
  uploadEventImage,
  uploadForagingImages,
  uploadDocument,
  uploadImage,
  getFileUrl,
  deleteFile,
} from "./upload";
import {
  isStripeConfigured,
  createSubscriptionCheckout,
  handleSubscriptionSuccess,
  cancelSubscription,
  getSubscriptionStatus,
  handleStripeWebhook,
  SUBSCRIPTION_PLANS,
} from "./stripe";
import {
  users,
  memberProfiles,
  listings,
  vendors,
  coupons,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  eventRegistrations,
  trainingModules,
  userTrainingProgress,
  mealPlans,
  recipes,
  shoppingLists,
  chatMessages,
  reviews,
  jobPosts,
  jobApplications,
  creditTransactions,
  subscriptionPlans,
  payments,
  notifications,
  auditLogs,
  insertUserSchema,
  insertListingSchema,
  insertVendorSchema,
  insertForagingSpotSchema,
  insertEventSchema,
  insertJobPostSchema,
  insertChatMessageSchema,
  insertReviewSchema,
  insertTrainingModuleSchema,
} from "@eat/shared/schema";
import { eq, and, desc, asc, sql, or, like, count, gt, lt, gte } from "drizzle-orm";
import { notificationService } from "./services/notifications";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global middleware
  app.use(corsMiddleware);
  app.use(securityMiddleware);
  app.use(apiRateLimiter);

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), config.uploadDir)));

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      stripe: isStripeConfigured(),
    });
  });

  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================

  app.post("/api/auth/signup", authRateLimiter, async (req, res) => {
    try {
      const { name, email, password, country, region, city, referralCode: referrerCode } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      // Check if email exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const referralCode = generateReferralCode();
      const verificationData = generateVerificationToken();

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          country,
          region,
          city,
          referralCode,
          emailVerificationToken: verificationData.token,
          emailVerificationExpires: verificationData.expires,
        })
        .returning();

      // Handle referral
      if (referrerCode) {
        const [referrer] = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, referrerCode.toUpperCase()))
          .limit(1);

        if (referrer) {
          await db
            .update(users)
            .set({ referredBy: referrer.id })
            .where(eq(users.id, newUser.id));

          // Give referral bonuses
          await db.insert(creditTransactions).values([
            {
              userId: referrer.id,
              type: "referral_bonus",
              amount: 50,
              description: `Referral bonus for inviting ${name}`,
            },
            {
              userId: newUser.id,
              type: "referral_bonus",
              amount: 25,
              description: "Welcome bonus for using a referral code",
            },
          ]);

          await db
            .update(users)
            .set({ creditBalance: sql`${users.creditBalance} + 50` })
            .where(eq(users.id, referrer.id));

          await db
            .update(users)
            .set({ creditBalance: sql`${users.creditBalance} + 25` })
            .where(eq(users.id, newUser.id));
        }
      }

      // Send verification email
      await sendVerificationEmail(email, name, verificationData.token);

      const token = generateToken(newUser.id);

      res.status(201).json({
        user: sanitizeUser(newUser),
        token,
        message: "Please check your email to verify your account",
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.isBanned) {
        return res.status(403).json({
          error: "Account suspended",
          reason: user.bannedReason || "Contact support for more information",
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      const isValid = await comparePasswords(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id);

      res.json({
        user: sanitizeUser(user),
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
        return res.status(400).json({ error: "Verification token has expired" });
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Send welcome email
      await sendWelcomeEmail(user.email, user.name);

      res.json({ message: "Email verified successfully" });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return res.json({ message: "If the email exists, a verification email will be sent" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const verificationData = generateVerificationToken();

      await db
        .update(users)
        .set({
          emailVerificationToken: verificationData.token,
          emailVerificationExpires: verificationData.expires,
        })
        .where(eq(users.id, user.id));

      await sendVerificationEmail(user.email, user.name, verificationData.token);

      res.json({ message: "Verification email sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  app.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If the email exists, a reset link will be sent" });
      }

      const resetData = generatePasswordResetToken();

      await db
        .update(users)
        .set({
          passwordResetToken: resetData.token,
          passwordResetExpires: resetData.expires,
        })
        .where(eq(users.id, user.id));

      await sendPasswordResetEmail(user.email, user.name, resetData.token);

      res.json({ message: "If the email exists, a reset link will be sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", authRateLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const passwordHash = await hashPassword(password);

      await db
        .update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/me", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error: any) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // ============================================
  // USER/MEMBER ROUTES
  // ============================================

  app.get("/api/members", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/members/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.put("/api/profile", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const {
        name,
        country,
        region,
        city,
        geographicRegion,
        bio,
        interests,
        skills,
        offerings,
      } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          country,
          region,
          city,
          geographicRegion,
          bio,
          interests,
          skills,
          offerings,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId!))
        .returning();

      res.json({ user: sanitizeUser(updatedUser) });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post(
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

  // ============================================
  // MARKETPLACE/LISTING ROUTES
  // ============================================

  app.get("/api/listings", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/listings/nearby", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/listings/my-listings", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
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

  app.post(
    "/api/listings/:id/images",
    authenticateToken,
    checkUserStatus,
    uploadRateLimiter,
    (req, res, next) => {
      uploadListingImages(req, res, (err) => {
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

        const newImages = files.map((file) => getFileUrl(file.filename, "listings"));
        const existingImages = listing.images || [];

        await db
          .update(listings)
          .set({
            images: [...existingImages, ...newImages],
            updatedAt: new Date(),
          })
          .where(eq(listings.id, id));

        res.json({ images: newImages });
      } catch (error: any) {
        console.error("Error uploading listing images:", error);
        res.status(500).json({ error: "Failed to upload images" });
      }
    }
  );

  app.put("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { type, category, title, description, price, currency, locationText, latitude, longitude, availabilityStatus, images } = req.body;

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

      const [updatedListing] = await db
        .update(listings)
        .set({
          type,
          category,
          title,
          description,
          price: price ? parseFloat(price) : null,
          currency,
          locationText,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          availabilityStatus,
          images,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))
        .returning();

      res.json(updatedListing);
    } catch (error: any) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  // ============================================
  // VENDOR ROUTES
  // ============================================

  app.get("/api/vendors", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/vendors/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
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

  // Verify vendor (moderator/admin only)
  app.post(
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

  // ============================================
  // FORAGING SPOT ROUTES
  // ============================================

  app.get("/api/foraging-spots", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/foraging-spots/recent", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
    "/api/foraging-spots",
    authenticateToken,
    checkUserStatus,
    requireEmailVerified,
    async (req: AuthRequest, res) => {
      try {
        const {
          latitude,
          longitude,
          title,
          plantType,
          species,
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

  app.put("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.delete("/api/foraging-spots/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  // ============================================
  // EVENT ROUTES
  // ============================================

  app.get("/api/events", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/events/upcoming", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
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
          })
          .returning();

        res.status(201).json(newEvent);
      } catch (error: any) {
        console.error("Error creating event:", error);
        res.status(500).json({ error: "Failed to create event" });
      }
    }
  );

  app.post("/api/events/:id/register", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.put("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.delete("/api/events/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  // ============================================
  // TRAINING MODULE ROUTES
  // ============================================

  app.get("/api/training-modules", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/training-modules/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post("/api/training-modules/:id/complete", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  // ============================================
  // JOB POST ROUTES
  // ============================================

  app.get("/api/jobs", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.get("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
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

  app.put("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.delete("/api/jobs/:id", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  // ============================================
  // MESSAGING ROUTES (POLLING-BASED)
  // ============================================

  app.get("/api/conversations", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      // Get all unique users this user has messaged with
      const sentTo = await db
        .selectDistinct({ id: chatMessages.recipientUserId })
        .from(chatMessages)
        .where(eq(chatMessages.senderUserId, req.userId!));

      const receivedFrom = await db
        .selectDistinct({ id: chatMessages.senderUserId })
        .from(chatMessages)
        .where(eq(chatMessages.recipientUserId, req.userId!));

      const conversationUserIds = [
        ...new Set([...sentTo.map((s) => s.id), ...receivedFrom.map((r) => r.id)]),
      ];

      if (conversationUserIds.length === 0) {
        return res.json([]);
      }

      const conversationUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          city: users.city,
          country: users.country,
        })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(conversationUserIds.map((id) => sql`${id}`), sql`, `)})`);

      // Get last message and unread count for each conversation
      const conversationsWithMeta = await Promise.all(
        conversationUsers.map(async (user) => {
          const [lastMessage] = await db
            .select()
            .from(chatMessages)
            .where(
              or(
                and(
                  eq(chatMessages.senderUserId, req.userId!),
                  eq(chatMessages.recipientUserId, user.id)
                ),
                and(
                  eq(chatMessages.senderUserId, user.id),
                  eq(chatMessages.recipientUserId, req.userId!)
                )
              )
            )
            .orderBy(desc(chatMessages.createdAt))
            .limit(1);

          const [unreadResult] = await db
            .select({ count: count() })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.senderUserId, user.id),
                eq(chatMessages.recipientUserId, req.userId!),
                eq(chatMessages.isRead, false)
              )
            );

          return {
            ...user,
            lastMessage: lastMessage || null,
            unreadCount: unreadResult?.count || 0,
          };
        })
      );

      // Sort by last message time
      conversationsWithMeta.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });

      res.json(conversationsWithMeta);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/:userId", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { page, limit, offset } = getPaginationParams(req);
      const since = req.query.since as string; // For polling new messages

      let whereCondition = or(
        and(
          eq(chatMessages.senderUserId, req.userId!),
          eq(chatMessages.recipientUserId, userId)
        ),
        and(
          eq(chatMessages.senderUserId, userId),
          eq(chatMessages.recipientUserId, req.userId!)
        )
      );

      if (since) {
        whereCondition = and(whereCondition, gt(chatMessages.createdAt, new Date(since)));
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(whereCondition)
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit)
        .offset(offset);

      // Mark messages as read
      await db
        .update(chatMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(chatMessages.senderUserId, userId),
            eq(chatMessages.recipientUserId, req.userId!),
            eq(chatMessages.isRead, false)
          )
        );

      res.json(messages.reverse()); // Return in chronological order
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { recipientUserId, content, messageType, attachmentUrl } = req.body;

      if (!recipientUserId || !content) {
        return res.status(400).json({ error: "Recipient and content are required" });
      }

      // Verify recipient exists
      const [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.id, recipientUserId))
        .limit(1);

      if (!recipient) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          senderUserId: req.userId!,
          recipientUserId,
          content,
          messageType: messageType || "text",
          attachmentUrl,
        })
        .returning();

      // Get sender name for notification
      const [sender] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      // Send push notification
      await notificationService.notifyNewMessage(
        recipientUserId,
        sender?.name || "A member",
        content
      );

      res.status(201).json(newMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/unread/count", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.recipientUserId, req.userId!),
            eq(chatMessages.isRead, false)
          )
        );

      res.json({ unreadCount: result?.count || 0 });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // ============================================
  // REVIEW ROUTES
  // ============================================

  app.get("/api/reviews/:subjectType/:subjectId", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
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

  app.post(
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

  // ============================================
  // NOTIFICATION ROUTES
  // ============================================

  app.get("/api/notifications", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { page, limit, offset } = getPaginationParams(req);

      const [totalResult] = await db
        .select({ count: count() })
        .from(notifications)
        .where(eq(notifications.userId, req.userId!));

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.userId!))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(buildPaginatedResponse(userNotifications, totalResult.count, { page, limit, offset }));
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/mark-read", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { ids } = req.body;

      if (ids && ids.length > 0) {
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(
            and(
              eq(notifications.userId, req.userId!),
              sql`${notifications.id} IN (${sql.join(ids.map((id: string) => sql`${id}`), sql`, `)})`
            )
          );
      } else {
        // Mark all as read
        await db
          .update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notifications.userId, req.userId!));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  app.get("/api/notifications/unread/count", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, req.userId!),
            eq(notifications.isRead, false)
          )
        );

      res.json({ unreadCount: result?.count || 0 });
    } catch (error: any) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // ============================================
  // SUBSCRIPTION/PAYMENT ROUTES
  // ============================================

  app.get("/api/subscription/plans", authenticateToken, async (req: AuthRequest, res) => {
    res.json({
      monthly: SUBSCRIPTION_PLANS.monthly,
      yearly: SUBSCRIPTION_PLANS.yearly,
      stripeConfigured: isStripeConfigured(),
    });
  });

  app.get("/api/subscription/status", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const status = await getSubscriptionStatus(req.userId!);
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/checkout", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const { planType } = req.body;

      if (!planType || !["monthly", "yearly"].includes(planType)) {
        return res.status(400).json({ error: "Valid plan type is required (monthly or yearly)" });
      }

      const result = await createSubscriptionCheckout(req.userId!, planType);

      if ("error" in result) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ url: result.url });
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/subscription/success", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.query.session_id as string;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const success = await handleSubscriptionSuccess(sessionId);

      if (success) {
        res.json({ success: true, message: "Subscription activated successfully" });
      } else {
        res.status(400).json({ error: "Could not verify subscription" });
      }
    } catch (error: any) {
      console.error("Error handling subscription success:", error);
      res.status(500).json({ error: "Failed to process subscription" });
    }
  });

  app.post("/api/subscription/cancel", authenticateToken, checkUserStatus, async (req: AuthRequest, res) => {
    try {
      const result = await cancelSubscription(req.userId!);

      if (result.success) {
        res.json({ success: true, message: "Subscription cancelled" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook endpoint
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const signature = req.headers["stripe-signature"] as string;
        const result = await handleStripeWebhook(req.body, signature);

        if (result.received) {
          res.json({ received: true });
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error: any) {
        console.error("Webhook error:", error);
        res.status(400).json({ error: "Webhook error" });
      }
    }
  );

  // ============================================
  // ADMIN ROUTES
  // ============================================

  app.get("/api/admin/users", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { page, limit, offset } = getPaginationParams(req);

      const [totalResult] = await db.select({ count: count() }).from(users);

      const allUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(
        buildPaginatedResponse(
          allUsers.map((u) => sanitizeUser(u)),
          totalResult.count,
          { page, limit, offset }
        )
      );
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/ban", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(403).json({ error: "Cannot ban admin users" });
      }

      await db
        .update(users)
        .set({
          isBanned: true,
          bannedReason: reason,
          bannedAt: new Date(),
          bannedBy: req.userId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      await logAuditAction(req.userId!, "ban", "user", id, { isBanned: false }, { isBanned: true, reason }, req);

      res.json({ success: true, message: "User banned successfully" });
    } catch (error: any) {
      console.error("Error banning user:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:id/unban", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      await db
        .update(users)
        .set({
          isBanned: false,
          bannedReason: null,
          bannedAt: null,
          bannedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      await logAuditAction(req.userId!, "unban", "user", id, { isBanned: true }, { isBanned: false }, req);

      res.json({ success: true, message: "User unbanned successfully" });
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  app.post("/api/admin/users/:id/role", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id));

      await logAuditAction(req.userId!, "update_role", "user", id, { role: user.role }, { role }, req);

      res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.get("/api/admin/audit-logs", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { page, limit, offset } = getPaginationParams(req);

      const [totalResult] = await db.select({ count: count() }).from(auditLogs);

      const logs = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(buildPaginatedResponse(logs, totalResult.count, { page, limit, offset }));
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/stats", authenticateToken, checkUserStatus, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const [usersCount] = await db.select({ count: count() }).from(users);
      const [listingsCount] = await db.select({ count: count() }).from(listings);
      const [vendorsCount] = await db.select({ count: count() }).from(vendors);
      const [eventsCount] = await db.select({ count: count() }).from(events);
      const [jobsCount] = await db.select({ count: count() }).from(jobPosts);
      const [foragingSpotsCount] = await db.select({ count: count() }).from(foragingSpots);

      // Premium users
      const [premiumCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isPremium, true));

      // Verified vendors
      const [verifiedVendorsCount] = await db
        .select({ count: count() })
        .from(vendors)
        .where(eq(vendors.verified, true));

      res.json({
        users: usersCount.count,
        premiumUsers: premiumCount.count,
        listings: listingsCount.count,
        vendors: vendorsCount.count,
        verifiedVendors: verifiedVendorsCount.count,
        events: eventsCount.count,
        jobs: jobsCount.count,
        foragingSpots: foragingSpotsCount.count,
      });
    } catch (error: any) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Create admin user for training modules
  app.post(
    "/api/admin/training-modules",
    authenticateToken,
    checkUserStatus,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { title, category, difficultyLevel, description, content, videoUrl, imageUrl, estimatedDuration, isPremium, order } = req.body;

        if (!title || !category || !difficultyLevel || !content) {
          return res.status(400).json({ error: "Title, category, difficulty level, and content are required" });
        }

        const [newModule] = await db
          .insert(trainingModules)
          .values({
            title,
            category,
            difficultyLevel,
            description,
            content,
            videoUrl,
            imageUrl,
            estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
            isPremium: isPremium || false,
            order: order ? parseInt(order) : 0,
          })
          .returning();

        res.status(201).json(newModule);
      } catch (error: any) {
        console.error("Error creating training module:", error);
        res.status(500).json({ error: "Failed to create training module" });
      }
    }
  );

  // ============================================
  // CONFIG ROUTES
  // ============================================

  app.get("/api/config/maps", authenticateToken, (req, res) => {
    res.json({
      apiKey: config.googleMapsApiKey,
    });
  });

  // ============================================
  // SYNC ROUTES
  // ============================================

  // Import and register sync routes
  const syncRoutes = (await import("./routes/v1/sync")).default;
  app.use("/api/v1/sync", syncRoutes);

  // ============================================
  // DEVICE REGISTRATION ROUTES
  // ============================================

  // Import and register device routes
  const deviceRoutes = (await import("./routes/v1/devices")).default;
  app.use("/api/v1/devices", deviceRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
