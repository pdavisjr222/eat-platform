import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./db";
import { hashPassword, comparePasswords, generateToken, authenticateToken, type AuthRequest } from "./auth";
import {
  users,
  listings,
  vendors,
  coupons,
  foragingSpots,
  gardenClubs,
  seedBanks,
  resourceHubs,
  events,
  trainingModules,
  mealPlans,
  recipes,
  shoppingLists,
  chatMessages,
  reviews,
  jobPosts,
  creditTransactions,
  insertUserSchema,
  insertListingSchema,
  insertVendorSchema,
  insertCouponSchema,
  insertForagingSpotSchema,
  insertGardenClubSchema,
  insertSeedBankSchema,
  insertResourceHubSchema,
  insertEventSchema,
  insertTrainingModuleSchema,
  insertMealPlanSchema,
  insertRecipeSchema,
  insertShoppingListSchema,
  insertChatMessageSchema,
  insertReviewSchema,
  insertJobPostSchema,
  insertCreditTransactionSchema,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(data.password);
      const referralCode = nanoid(10).toUpperCase();

      const [newUser] = await db
        .insert(users)
        .values({
          ...data,
          passwordHash,
          referralCode,
        })
        .returning();

      if (data.referralCode) {
        const referrer = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, data.referralCode))
          .limit(1);

        if (referrer.length > 0) {
          await db
            .update(users)
            .set({ referredBy: referrer[0].id })
            .where(eq(users.id, newUser.id));

          await db.insert(creditTransactions).values({
            userId: referrer[0].id,
            type: "referralBonus",
            amount: 50,
            description: "Referral bonus for inviting a new member",
          });

          await db
            .update(users)
            .set({ creditBalance: sql`${users.creditBalance} + 50` })
            .where(eq(users.id, referrer[0].id));

          await db.insert(creditTransactions).values({
            userId: newUser.id,
            type: "referralBonus",
            amount: 25,
            description: "Welcome bonus for using a referral code",
          });

          await db
            .update(users)
            .set({ creditBalance: sql`${users.creditBalance} + 25` })
            .where(eq(users.id, newUser.id));
        }
      }

      const token = generateToken(newUser.id);
      const { passwordHash: _, ...userWithoutPassword } = newUser;

      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id);
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  // ============================================
  // USER/MEMBER ROUTES
  // ============================================

  app.get("/api/members", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const allMembers = await db
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
        .orderBy(desc(users.createdAt));

      res.json(allMembers);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // ============================================
  // MARKETPLACE/LISTING ROUTES
  // ============================================

  app.get("/api/listings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const allListings = await db
        .select()
        .from(listings)
        .where(eq(listings.availabilityStatus, "active"))
        .orderBy(desc(listings.createdAt));

      res.json(allListings);
    } catch (error: any) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const listing = await db
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (listing.length === 0) {
        return res.status(404).json({ error: "Listing not found" });
      }

      res.json(listing[0]);
    } catch (error: any) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  app.get("/api/listings/nearby", authenticateToken, async (req: AuthRequest, res) => {
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

  app.get("/api/listings/my-listings", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/listings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const listingDataSchema = insertListingSchema.omit({ ownerUserId: true });
      const data = listingDataSchema.parse(req.body);
      
      const [newListing] = await db
        .insert(listings)
        .values({
          ...data,
          ownerUserId: req.userId!,
        })
        .returning();

      res.json(newListing);
    } catch (error: any) {
      console.error("Error creating listing:", error);
      res.status(400).json({ error: error.message || "Failed to create listing" });
    }
  });

  app.put("/api/listings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const listingDataSchema = insertListingSchema.omit({ ownerUserId: true });
      const data = listingDataSchema.parse(req.body);

      const existing = await db
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (existing[0].ownerUserId !== req.userId) {
        return res.status(403).json({ error: "Not authorized to edit this listing" });
      }

      const [updatedListing] = await db
        .update(listings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(listings.id, id))
        .returning();

      res.json(updatedListing);
    } catch (error: any) {
      console.error("Error updating listing:", error);
      res.status(400).json({ error: error.message || "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const existing = await db
        .select()
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if (existing[0].ownerUserId !== req.userId) {
        return res.status(403).json({ error: "Not authorized to delete this listing" });
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

  app.get("/api/vendors", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const allVendors = await db
        .select()
        .from(vendors)
        .orderBy(desc(vendors.createdAt));

      res.json(allVendors);
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // ============================================
  // FORAGING SPOT ROUTES
  // ============================================

  app.get("/api/foraging-spots", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const spots = await db
        .select()
        .from(foragingSpots)
        .orderBy(desc(foragingSpots.createdAt));

      res.json(spots);
    } catch (error: any) {
      console.error("Error fetching foraging spots:", error);
      res.status(500).json({ error: "Failed to fetch foraging spots" });
    }
  });

  app.get("/api/foraging-spots/recent", authenticateToken, async (req: AuthRequest, res) => {
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

  app.post("/api/foraging-spots", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const spotDataSchema = insertForagingSpotSchema.omit({ createdByUserId: true });
      const data = spotDataSchema.parse(req.body);
      
      const [newSpot] = await db
        .insert(foragingSpots)
        .values({
          ...data,
          createdByUserId: req.userId!,
        })
        .returning();

      res.json(newSpot);
    } catch (error: any) {
      console.error("Error creating foraging spot:", error);
      res.status(400).json({ error: error.message || "Failed to create foraging spot" });
    }
  });

  app.get("/api/foraging-spots/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      
      const spot = await db
        .select()
        .from(foragingSpots)
        .where(eq(foragingSpots.id, id))
        .limit(1);

      if (spot.length === 0) {
        return res.status(404).json({ error: "Foraging spot not found" });
      }

      res.json(spot[0]);
    } catch (error: any) {
      console.error("Error fetching foraging spot:", error);
      res.status(500).json({ error: "Failed to fetch foraging spot" });
    }
  });

  app.put("/api/foraging-spots/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const spotDataSchema = insertForagingSpotSchema.omit({ createdByUserId: true });
      const data = spotDataSchema.parse(req.body);

      const existing = await db
        .select()
        .from(foragingSpots)
        .where(eq(foragingSpots.id, id))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Foraging spot not found" });
      }

      if (existing[0].createdByUserId !== req.userId) {
        return res.status(403).json({ error: "Not authorized to edit this spot" });
      }

      const [updatedSpot] = await db
        .update(foragingSpots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(foragingSpots.id, id))
        .returning();

      res.json(updatedSpot);
    } catch (error: any) {
      console.error("Error updating foraging spot:", error);
      res.status(400).json({ error: error.message || "Failed to update foraging spot" });
    }
  });

  app.delete("/api/foraging-spots/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const existing = await db
        .select()
        .from(foragingSpots)
        .where(eq(foragingSpots.id, id))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Foraging spot not found" });
      }

      if (existing[0].createdByUserId !== req.userId) {
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

  app.get("/api/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const allEvents = await db
        .select()
        .from(events)
        .orderBy(desc(events.startDateTime));

      res.json(allEvents);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/upcoming", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const upcomingEvents = await db
        .select()
        .from(events)
        .where(sql`${events.startDateTime} >= NOW()`)
        .orderBy(events.startDateTime)
        .limit(10);

      res.json(upcomingEvents);
    } catch (error: any) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertEventSchema.omit({ hostUserId: true, hostClubId: true, imageUrl: true }).parse(req.body);
      
      const [newEvent] = await db
        .insert(events)
        .values({
          ...data,
          hostUserId: req.userId!,
        })
        .returning();

      res.json(newEvent);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ error: error.message || "Failed to create event" });
    }
  });

  app.get("/api/events/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const [event] = await db.select().from(events).where(eq(events.id, id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      res.json(event);
    } catch (error: any) {
      console.error("Error fetching event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.put("/api/events/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const [event] = await db.select().from(events).where(eq(events.id, id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.hostUserId !== req.userId) {
        return res.status(403).json({ error: "You can only edit your own events" });
      }

      const data = insertEventSchema.omit({ hostUserId: true, hostClubId: true, imageUrl: true }).parse(req.body);

      const [updatedEvent] = await db
        .update(events)
        .set(data)
        .where(eq(events.id, id))
        .returning();

      res.json(updatedEvent);
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(400).json({ error: error.message || "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const [event] = await db.select().from(events).where(eq(events.id, id));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.hostUserId !== req.userId) {
        return res.status(403).json({ error: "You can only delete your own events" });
      }

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

  app.get("/api/training-modules", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const modules = await db
        .select()
        .from(trainingModules)
        .orderBy(desc(trainingModules.createdAt));

      res.json(modules);
    } catch (error: any) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });

  // ============================================
  // JOB POST ROUTES
  // ============================================

  app.get("/api/jobs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const jobs = await db
        .select()
        .from(jobPosts)
        .orderBy(desc(jobPosts.createdAt));

      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching job posts:", error);
      res.status(500).json({ error: "Failed to fetch job posts" });
    }
  });

  app.post("/api/jobs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertJobPostSchema.parse(req.body);
      
      const [newJob] = await db
        .insert(jobPosts)
        .values({
          ...data,
          postedByUserId: req.userId!,
        })
        .returning();

      res.json(newJob);
    } catch (error: any) {
      console.error("Error creating job post:", error);
      res.status(400).json({ error: error.message || "Failed to create job post" });
    }
  });

  // ============================================
  // MESSAGING ROUTES
  // ============================================

  app.get("/api/conversations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const conversations = await db
        .selectDistinct({
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          city: users.city,
          country: users.country,
        })
        .from(users)
        .innerJoin(
          chatMessages,
          sql`${users.id} = ${chatMessages.senderUserId} OR ${users.id} = ${chatMessages.recipientUserId}`
        )
        .where(
          sql`(${chatMessages.senderUserId} = ${req.userId} OR ${chatMessages.recipientUserId} = ${req.userId}) AND ${users.id} != ${req.userId}`
        );

      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      const messages = await db
        .select()
        .from(chatMessages)
        .where(
          sql`(${chatMessages.senderUserId} = ${req.userId} AND ${chatMessages.recipientUserId} = ${userId}) OR (${chatMessages.senderUserId} = ${userId} AND ${chatMessages.recipientUserId} = ${req.userId})`
        )
        .orderBy(chatMessages.createdAt);

      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertChatMessageSchema.parse(req.body);
      
      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          ...data,
          senderUserId: req.userId!,
        })
        .returning();

      res.json(newMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: error.message || "Failed to send message" });
    }
  });

  // ============================================
  // REVIEWS ROUTES
  // ============================================

  app.get("/api/reviews/received", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.subjectId, req.userId!))
        .orderBy(desc(reviews.createdAt));

      res.json(userReviews);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // ============================================
  // WEBSOCKET FOR REAL-TIME CHAT
  // ============================================

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    let userId: string | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'authenticate') {
          userId = data.userId;
          if (userId) {
            clients.set(userId, ws);
          }
        } else if (data.type === 'message' && userId) {
          const recipientWs = clients.get(data.recipientUserId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              senderUserId: userId,
              content: data.content,
              createdAt: new Date().toISOString(),
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });

  return httpServer;
}
