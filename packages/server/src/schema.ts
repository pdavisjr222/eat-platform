/**
 * PostgreSQL schema for the E.A.T. server.
 * Mirrors packages/shared/schema.ts but uses pgTable instead of sqliteTable.
 * The shared schema (SQLite) is kept for mobile offline storage.
 *
 * Type conversions:
 *   sqliteTable                       → pgTable
 *   integer({ mode: "boolean" })      → boolean()
 *   integer({ mode: "timestamp" })    → timestamp()
 *   text({ mode: "json" }).$type<T>() → jsonb().$type<T>()
 *   real()                            → doublePrecision()
 *   integer()                         → integer()
 *   text()                            → text()
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  doublePrecision,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Re-export Zod insert schemas and TypeScript types from the shared package.
// These are database-adapter-agnostic and safe to reuse.
export {
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
  insertNotificationSchema,
  insertSyncQueueSchema,
  insertDeviceRegistrySchema,
  insertConflictLogSchema,
  insertVendorReferralSchema,
  insertVideoCallSchema,
  insertVideoCallParticipantSchema,
  type InsertUser,
  type User,
  type InsertListing,
  type Listing,
  type InsertVendor,
  type Vendor,
  type InsertCoupon,
  type Coupon,
  type InsertForagingSpot,
  type ForagingSpot,
  type InsertGardenClub,
  type GardenClub,
  type InsertSeedBank,
  type SeedBank,
  type InsertResourceHub,
  type ResourceHub,
  type InsertEvent,
  type Event,
  type InsertTrainingModule,
  type TrainingModule,
  type InsertMealPlan,
  type MealPlan,
  type InsertRecipe,
  type Recipe,
  type InsertShoppingList,
  type ShoppingList,
  type InsertChatMessage,
  type ChatMessage,
  type InsertReview,
  type Review,
  type InsertJobPost,
  type JobPost,
  type InsertCreditTransaction,
  type CreditTransaction,
  type EventRegistration,
  type JobApplication,
  type UserTrainingProgress,
  type SubscriptionPlan,
  type Payment,
  type Notification,
  type AuditLog,
  type InsertSyncQueue,
  type SyncQueue,
  type InsertDeviceRegistry,
  type DeviceRegistry,
  type InsertConflictLog,
  type ConflictLog,
  type InsertVendorReferral,
  type VendorReferral,
  type InsertVideoCall,
  type VideoCall,
  type InsertVideoCallParticipant,
  type VideoCallParticipant,
} from "@eat/shared/schema";

const generateId = () => crypto.randomUUID();

// ============ SYNC METADATA (shared column set) ============
// Inlined per table — Drizzle doesn't support column spreading

// ============ USERS ============

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  geographicRegion: text("geographic_region"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  interests: jsonb("interests").$type<string[]>(),
  skills: jsonb("skills").$type<string[]>(),
  offerings: jsonb("offerings").$type<string[]>(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  creditBalance: integer("credit_balance").notNull().default(0),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isActive: boolean("is_active").notNull().default(true),
  isBanned: boolean("is_banned").notNull().default(false),
  bannedReason: text("banned_reason"),
  bannedAt: timestamp("banned_at"),
  bannedBy: text("banned_by"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ MEMBER PROFILES ============

export const memberProfiles = pgTable("member_profiles", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  website: text("website"),
  socialLinks: jsonb("social_links").$type<{ [key: string]: string }>(),
  phoneNumber: text("phone_number"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ LISTINGS ============

export const listings = pgTable("listings", {
  id: text("id").primaryKey().$defaultFn(generateId),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  images: jsonb("images").$type<string[]>(),
  price: doublePrecision("price"),
  currency: text("currency").default("USD"),
  locationText: text("location_text"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  availabilityStatus: text("availability_status").notNull().default("active"),
  isFeatured: boolean("is_featured").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ VENDORS ============

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey().$defaultFn(generateId),
  linkedUserId: text("linked_user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  type: text("type").notNull(),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  rating: doublePrecision("rating").default(0),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ COUPONS ============

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey().$defaultFn(generateId),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: doublePrecision("discount_value").notNull(),
  code: text("code").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  termsAndConditions: text("terms_and_conditions"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ FORAGING SPOTS ============

export const foragingSpots = pgTable("foraging_spots", {
  id: text("id").primaryKey().$defaultFn(generateId),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  title: text("title").notNull(),
  plantType: text("plant_type").notNull(),
  species: text("species"),
  description: text("description").notNull(),
  images: jsonb("images").$type<string[]>(),
  edibleParts: text("edible_parts"),
  seasonality: text("seasonality"),
  benefits: text("benefits"),
  accessNotes: text("access_notes"),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedBy: text("verified_by"),
  country: text("country"),
  region: text("region"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ GARDEN CLUBS ============

export const gardenClubs = pgTable("garden_clubs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  description: text("description").notNull(),
  city: text("city"),
  country: text("country"),
  region: text("region"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  contactInfo: text("contact_info"),
  email: text("email"),
  meetingSchedule: text("meeting_schedule"),
  website: text("website"),
  imageUrl: text("image_url"),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ SEED BANKS ============

export const seedBanks = pgTable("seed_banks", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  locationText: text("location_text").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  description: text("description").notNull(),
  managedByUserId: text("managed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  seedsAvailable: jsonb("seeds_available").$type<string[]>(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ RESOURCE HUBS ============

export const resourceHubs = pgTable("resource_hubs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  type: text("type").notNull(),
  name: text("name"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  description: text("description").notNull(),
  accessRules: text("access_rules"),
  contactInfo: text("contact_info"),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ EVENTS ============

export const events = pgTable("events", {
  id: text("id").primaryKey().$defaultFn(generateId),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hostUserId: text("host_user_id").references(() => users.id, { onDelete: "set null" }),
  hostClubId: text("host_club_id").references(() => gardenClubs.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  timeZone: text("time_zone").notNull(),
  locationOnline: boolean("location_online").notNull().default(false),
  locationAddress: text("location_address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  capacity: integer("capacity"),
  registeredCount: integer("registered_count").notNull().default(0),
  imageUrl: text("image_url"),
  images: jsonb("images").$type<string[]>(),
  price: doublePrecision("price").default(0),
  currency: text("currency").default("USD"),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ EVENT REGISTRATIONS ============

export const eventRegistrations = pgTable("event_registrations", {
  id: text("id").primaryKey().$defaultFn(generateId),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("registered"),
  registeredAt: timestamp("registered_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ TRAINING MODULES ============

export const trainingModules = pgTable("training_modules", {
  id: text("id").primaryKey().$defaultFn(generateId),
  title: text("title").notNull(),
  category: text("category").notNull(),
  difficultyLevel: text("difficulty_level").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  estimatedDuration: integer("estimated_duration"),
  isPremium: boolean("is_premium").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ USER TRAINING PROGRESS ============

export const userTrainingProgress = pgTable("user_training_progress", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  progressPercent: integer("progress_percent").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ MEAL PLANS ============

export const mealPlans = pgTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  dietaryPreference: text("dietary_preference"),
  days: integer("days").notNull().default(7),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ RECIPES ============

export const recipes = pgTable("recipes", {
  id: text("id").primaryKey().$defaultFn(generateId),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dietaryPreference: text("dietary_preference"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ingredients: jsonb("ingredients").$type<Array<{ name: string; quantity: string; unit: string }>>().notNull(),
  instructions: text("instructions").notNull(),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings"),
  nutritionSummary: text("nutrition_summary"),
  imageUrl: text("image_url"),
  isPublic: boolean("is_public").notNull().default(true),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ SHOPPING LISTS ============

export const shoppingLists = pgTable("shopping_lists", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedMealPlanId: text("linked_meal_plan_id").references(() => mealPlans.id, { onDelete: "set null" }),
  name: text("name"),
  items: jsonb("items").$type<Array<{ ingredientName: string; quantity: string; unit: string; checked?: boolean }>>().notNull(),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ CHAT MESSAGES ============

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(generateId),
  senderUserId: text("sender_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageType: text("message_type").notNull().default("text"),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ COMMUNITY POSTS ============

export const communityPosts = pgTable("community_posts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  authorUserId: text("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ REVIEWS ============

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(generateId),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ JOB POSTS ============

export const jobPosts = pgTable("job_posts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  postedByUserId: text("posted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(),
  category: text("category").notNull(),
  locationText: text("location_text"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isRemote: boolean("is_remote").notNull().default(false),
  compensationInfo: text("compensation_info"),
  salaryMin: doublePrecision("salary_min"),
  salaryMax: doublePrecision("salary_max"),
  salaryCurrency: text("salary_currency").default("USD"),
  requirements: jsonb("requirements").$type<string[]>(),
  benefits: jsonb("benefits").$type<string[]>(),
  applicationUrl: text("application_url"),
  applicationEmail: text("application_email"),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ JOB APPLICATIONS ============

export const jobApplications = pgTable("job_applications", {
  id: text("id").primaryKey().$defaultFn(generateId),
  jobId: text("job_id").notNull().references(() => jobPosts.id, { onDelete: "cascade" }),
  applicantUserId: text("applicant_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  resumeUrl: text("resume_url"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  appliedAt: timestamp("applied_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ CREDIT TRANSACTIONS ============

export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  recurringSourceId: text("recurring_source_id"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ SUBSCRIPTION PLANS ============

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  interval: text("interval").notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  stripePriceId: text("stripe_price_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ PAYMENTS ============

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(),
  paymentMethod: text("payment_method").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  description: text("description").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ NOTIFICATIONS ============

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ AUDIT LOGS ============

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
  newValues: jsonb("new_values").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ SYNC INFRASTRUCTURE ============

export const syncQueue = pgTable("sync_queue", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  operation: text("operation").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  status: text("status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  processedAt: timestamp("processed_at"),
});

export const deviceRegistry = pgTable("device_registry", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull().unique(),
  deviceName: text("device_name"),
  deviceType: text("device_type"),
  fcmToken: text("fcm_token"),
  lastActiveAt: timestamp("last_active_at").notNull().$defaultFn(() => new Date()),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

export const conflictLog = pgTable("conflict_log", {
  id: text("id").primaryKey().$defaultFn(generateId),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  serverVersion: integer("server_version").notNull(),
  clientVersion: integer("client_version").notNull(),
  serverData: jsonb("server_data").$type<Record<string, unknown>>(),
  clientData: jsonb("client_data").$type<Record<string, unknown>>(),
  resolution: text("resolution"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
});

// ============ VENDOR REFERRALS ============

export const vendorReferrals = pgTable("vendor_referrals", {
  id: text("id").primaryKey().$defaultFn(generateId),
  referrerVendorId: text("referrer_vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  referredVendorId: text("referred_vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  conversionDate: timestamp("conversion_date"),
  status: text("status").notNull().default("pending"),
  totalEarnings: doublePrecision("total_earnings").notNull().default(0),
  recurringCommissionRate: doublePrecision("recurring_commission_rate").notNull().default(0),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ VIDEO CALLS ============

export const videoCalls = pgTable("video_calls", {
  id: text("id").primaryKey().$defaultFn(generateId),
  callType: text("call_type").notNull(),
  hostUserId: text("host_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelName: text("channel_name").notNull().unique(),
  agoraToken: text("agora_token"),
  status: text("status").notNull().default("initiated"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

export const videoCallParticipants = pgTable("video_call_participants", {
  id: text("id").primaryKey().$defaultFn(generateId),
  callId: text("call_id").notNull().references(() => videoCalls.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().$defaultFn(() => new Date()),
  leftAt: timestamp("left_at"),
  isMuted: boolean("is_muted").notNull().default(false),
  isVideoOn: boolean("is_video_on").notNull().default(true),
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: timestamp("last_synced_at"),
  deviceId: text("device_id"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
});

// ============ RELATIONS ============
// Mirror of shared/schema.ts relations — same structure, PG table references.

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
  memberProfile: one(memberProfiles, { fields: [users.id], references: [memberProfiles.userId] }),
  referrer: one(users, { fields: [users.referredBy], references: [users.id] }),
  eventRegistrations: many(eventRegistrations),
  jobApplications: many(jobApplications),
  notifications: many(notifications),
  payments: many(payments),
  trainingProgress: many(userTrainingProgress),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, { fields: [listings.ownerUserId], references: [users.id] }),
  reviews: many(reviews),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  linkedUser: one(users, { fields: [vendors.linkedUserId], references: [users.id] }),
  coupons: many(coupons),
  reviews: many(reviews),
  jobPosts: many(jobPosts),
}));

export const couponsRelations = relations(coupons, ({ one }) => ({
  vendor: one(vendors, { fields: [coupons.vendorId], references: [vendors.id] }),
}));

export const foragingSpotsRelations = relations(foragingSpots, ({ one }) => ({
  creator: one(users, { fields: [foragingSpots.createdByUserId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  hostUser: one(users, { fields: [events.hostUserId], references: [users.id] }),
  hostClub: one(gardenClubs, { fields: [events.hostClubId], references: [gardenClubs.id] }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  user: one(users, { fields: [eventRegistrations.userId], references: [users.id] }),
}));

export const trainingModulesRelations = relations(trainingModules, ({ many }) => ({
  userProgress: many(userTrainingProgress),
}));

export const userTrainingProgressRelations = relations(userTrainingProgress, ({ one }) => ({
  user: one(users, { fields: [userTrainingProgress.userId], references: [users.id] }),
  module: one(trainingModules, { fields: [userTrainingProgress.moduleId], references: [trainingModules.id] }),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
  creator: one(users, { fields: [recipes.createdByUserId], references: [users.id] }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  user: one(users, { fields: [mealPlans.userId], references: [users.id] }),
  shoppingLists: many(shoppingLists),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one }) => ({
  user: one(users, { fields: [shoppingLists.userId], references: [users.id] }),
  mealPlan: one(mealPlans, { fields: [shoppingLists.linkedMealPlanId], references: [mealPlans.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, { fields: [chatMessages.senderUserId], references: [users.id], relationName: "sender" }),
  recipient: one(users, { fields: [chatMessages.recipientUserId], references: [users.id], relationName: "recipient" }),
}));

export const communityPostsRelations = relations(communityPosts, ({ one }) => ({
  author: one(users, { fields: [communityPosts.authorUserId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, { fields: [reviews.reviewerUserId], references: [users.id] }),
}));

export const jobPostsRelations = relations(jobPosts, ({ one, many }) => ({
  postedByUser: one(users, { fields: [jobPosts.postedByUserId], references: [users.id] }),
  vendor: one(vendors, { fields: [jobPosts.vendorId], references: [vendors.id] }),
  applications: many(jobApplications),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  job: one(jobPosts, { fields: [jobApplications.jobId], references: [jobPosts.id] }),
  applicant: one(users, { fields: [jobApplications.applicantUserId], references: [users.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const syncQueueRelations = relations(syncQueue, ({ one }) => ({
  user: one(users, { fields: [syncQueue.userId], references: [users.id] }),
}));

export const deviceRegistryRelations = relations(deviceRegistry, ({ one }) => ({
  user: one(users, { fields: [deviceRegistry.userId], references: [users.id] }),
}));

export const conflictLogRelations = relations(conflictLog, ({ one }) => ({
  user: one(users, { fields: [conflictLog.userId], references: [users.id] }),
}));

export const vendorReferralsRelations = relations(vendorReferrals, ({ one }) => ({
  referrerVendor: one(vendors, { fields: [vendorReferrals.referrerVendorId], references: [vendors.id], relationName: "referrer" }),
  referredVendor: one(vendors, { fields: [vendorReferrals.referredVendorId], references: [vendors.id], relationName: "referred" }),
}));

export const videoCallsRelations = relations(videoCalls, ({ one, many }) => ({
  host: one(users, { fields: [videoCalls.hostUserId], references: [users.id] }),
  participants: many(videoCallParticipants),
}));

export const videoCallParticipantsRelations = relations(videoCallParticipants, ({ one }) => ({
  call: one(videoCalls, { fields: [videoCallParticipants.callId], references: [videoCalls.id] }),
  user: one(users, { fields: [videoCallParticipants.userId], references: [users.id] }),
}));
