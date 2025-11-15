import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - core authentication and user data
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  geographicRegion: text("geographic_region"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  interests: text("interests").array(),
  skills: text("skills").array(),
  offerings: text("offerings").array(),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  creditBalance: integer("credit_balance").notNull().default(0),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Member profiles (extended info)
export const memberProfiles = pgTable("member_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  website: text("website"),
  socialLinks: json("social_links").$type<{ [key: string]: string }>(),
});

// Marketplace listings
export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  images: text("images").array(),
  price: real("price"),
  currency: text("currency").default("USD"),
  locationText: text("location_text"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  availabilityStatus: text("availability_status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  linkedUserId: varchar("linked_user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  type: text("type").notNull(),
  website: text("website"),
  contactInfo: text("contact_info"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Coupons and deals
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: real("discount_value").notNull(),
  code: text("code").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Foraging spots
export const foragingSpots = pgTable("foraging_spots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  title: text("title").notNull(),
  plantType: text("plant_type").notNull(),
  species: text("species"),
  description: text("description").notNull(),
  images: text("images").array(),
  edibleParts: text("edible_parts"),
  seasonality: text("seasonality"),
  benefits: text("benefits"),
  accessNotes: text("access_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Garden clubs
export const gardenClubs = pgTable("garden_clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  city: text("city"),
  country: text("country"),
  region: text("region"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  contactInfo: text("contact_info"),
  meetingSchedule: text("meeting_schedule"),
  website: text("website"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Seed banks
export const seedBanks = pgTable("seed_banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  locationText: text("location_text").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  description: text("description").notNull(),
  managedByUserId: varchar("managed_by_user_id").references(() => users.id),
  seedsAvailable: text("seeds_available"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Water sources and energy hubs
export const resourceHubs = pgTable("resource_hubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  description: text("description").notNull(),
  accessRules: text("access_rules"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hostUserId: varchar("host_user_id").references(() => users.id),
  hostClubId: varchar("host_club_id").references(() => gardenClubs.id),
  type: text("type").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  timeZone: text("time_zone").notNull(),
  locationOnline: boolean("location_online").notNull().default(false),
  locationAddress: text("location_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  capacity: integer("capacity"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Training modules
export const trainingModules = pgTable("training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(),
  difficultyLevel: text("difficulty_level").notNull(),
  content: text("content").notNull(),
  videoUrl: text("video_url"),
  estimatedDuration: integer("estimated_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meal plans
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  dietaryPreference: text("dietary_preference"),
  days: integer("days").notNull().default(7),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Recipes
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  dietaryPreference: text("dietary_preference"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ingredients: json("ingredients").$type<Array<{ name: string; quantity: string; unit: string }>>().notNull(),
  instructions: text("instructions").notNull(),
  nutritionSummary: text("nutrition_summary"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shopping lists
export const shoppingLists = pgTable("shopping_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  linkedMealPlanId: varchar("linked_meal_plan_id").references(() => mealPlans.id),
  items: json("items").$type<Array<{ ingredientName: string; quantity: string; unit: string }>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderUserId: varchar("sender_user_id").notNull().references(() => users.id),
  recipientUserId: varchar("recipient_user_id").notNull().references(() => users.id),
  messageType: text("message_type").notNull().default("text"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewerUserId: varchar("reviewer_user_id").notNull().references(() => users.id),
  subjectType: text("subject_type").notNull(),
  subjectId: varchar("subject_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Job posts
export const jobPosts = pgTable("job_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postedByUserId: varchar("posted_by_user_id").references(() => users.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(),
  category: text("category").notNull(),
  locationText: text("location_text"),
  compensationInfo: text("compensation_info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  listings: many(listings),
  foragingSpots: many(foragingSpots),
  sentMessages: many(chatMessages, { relationName: "sender" }),
  receivedMessages: many(chatMessages, { relationName: "recipient" }),
  reviews: many(reviews),
  creditTransactions: many(creditTransactions),
  recipes: many(recipes),
  mealPlans: many(mealPlans),
  shoppingLists: many(shoppingLists),
  memberProfile: one(memberProfiles, {
    fields: [users.id],
    references: [memberProfiles.userId],
  }),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, {
    fields: [listings.ownerUserId],
    references: [users.id],
  }),
  reviews: many(reviews),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  linkedUser: one(users, {
    fields: [vendors.linkedUserId],
    references: [users.id],
  }),
  coupons: many(coupons),
  reviews: many(reviews),
  jobPosts: many(jobPosts),
}));

export const couponsRelations = relations(coupons, ({ one }) => ({
  vendor: one(vendors, {
    fields: [coupons.vendorId],
    references: [vendors.id],
  }),
}));

export const foragingSpotsRelations = relations(foragingSpots, ({ one }) => ({
  creator: one(users, {
    fields: [foragingSpots.createdByUserId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  hostUser: one(users, {
    fields: [events.hostUserId],
    references: [users.id],
  }),
  hostClub: one(gardenClubs, {
    fields: [events.hostClubId],
    references: [gardenClubs.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  creator: one(users, {
    fields: [recipes.createdByUserId],
    references: [users.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [mealPlans.userId],
    references: [users.id],
  }),
  shoppingLists: many(shoppingLists),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one }) => ({
  user: one(users, {
    fields: [shoppingLists.userId],
    references: [users.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [shoppingLists.linkedMealPlanId],
    references: [mealPlans.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderUserId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [chatMessages.recipientUserId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerUserId],
    references: [users.id],
  }),
}));

export const jobPostsRelations = relations(jobPosts, ({ one }) => ({
  postedByUser: one(users, {
    fields: [jobPosts.postedByUserId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [jobPosts.vendorId],
    references: [vendors.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  creditBalance: true,
  role: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
});

export const insertForagingSpotSchema = createInsertSchema(foragingSpots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGardenClubSchema = createInsertSchema(gardenClubs).omit({
  id: true,
  createdAt: true,
});

export const insertSeedBankSchema = createInsertSchema(seedBanks).omit({
  id: true,
  createdAt: true,
});

export const insertResourceHubSchema = createInsertSchema(resourceHubs).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events, {
  startDateTime: z.union([z.date(), z.string().datetime()]).transform((val) => 
    typeof val === "string" ? new Date(val) : val
  ),
  endDateTime: z.union([z.date(), z.string().datetime()]).transform((val) => 
    typeof val === "string" ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertJobPostSchema = createInsertSchema(jobPosts).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export type InsertForagingSpot = z.infer<typeof insertForagingSpotSchema>;
export type ForagingSpot = typeof foragingSpots.$inferSelect;

export type InsertGardenClub = z.infer<typeof insertGardenClubSchema>;
export type GardenClub = typeof gardenClubs.$inferSelect;

export type InsertSeedBank = z.infer<typeof insertSeedBankSchema>;
export type SeedBank = typeof seedBanks.$inferSelect;

export type InsertResourceHub = z.infer<typeof insertResourceHubSchema>;
export type ResourceHub = typeof resourceHubs.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingLists.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertJobPost = z.infer<typeof insertJobPostSchema>;
export type JobPost = typeof jobPosts.$inferSelect;

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
