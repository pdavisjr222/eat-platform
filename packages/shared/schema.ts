import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Helper to generate UUID
const generateId = () => crypto.randomUUID();

// Users table - core authentication and user data
export const users = sqliteTable("users", {
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
  interests: text("interests", { mode: "json" }).$type<string[]>(),
  skills: text("skills", { mode: "json" }).$type<string[]>(),
  offerings: text("offerings", { mode: "json" }).$type<string[]>(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  creditBalance: integer("credit_balance").notNull().default(0),
  role: text("role").notNull().default("user"), // user, moderator, admin
  // Email verification
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: integer("email_verification_expires", { mode: "timestamp" }),
  // Password reset
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: integer("password_reset_expires", { mode: "timestamp" }),
  // Premium membership
  isPremium: integer("is_premium", { mode: "boolean" }).notNull().default(false),
  premiumExpiresAt: integer("premium_expires_at", { mode: "timestamp" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Account status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isBanned: integer("is_banned", { mode: "boolean" }).notNull().default(false),
  bannedReason: text("banned_reason"),
  bannedAt: integer("banned_at", { mode: "timestamp" }),
  bannedBy: text("banned_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"), // synced, pending, conflict
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Member profiles (extended info)
export const memberProfiles = sqliteTable("member_profiles", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  website: text("website"),
  socialLinks: text("social_links", { mode: "json" }).$type<{ [key: string]: string }>(),
  phoneNumber: text("phone_number"),
  address: text("address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Marketplace listings
export const listings = sqliteTable("listings", {
  id: text("id").primaryKey().$defaultFn(generateId),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // sell, buy, trade, barter, rent, lease
  category: text("category").notNull(), // food, seeds, plants, spices, handmade, realEstate, ecoTravel, service
  title: text("title").notNull(),
  description: text("description").notNull(),
  images: text("images", { mode: "json" }).$type<string[]>(),
  price: real("price"),
  currency: text("currency").default("USD"),
  locationText: text("location_text"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  availabilityStatus: text("availability_status").notNull().default("active"), // active, sold, expired, pending
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Vendors
export const vendors = sqliteTable("vendors", {
  id: text("id").primaryKey().$defaultFn(generateId),
  linkedUserId: text("linked_user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  type: text("type").notNull(), // ecoFriendly, indigenous, serviceProvider, accommodation
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  verifiedAt: integer("verified_at", { mode: "timestamp" }),
  verifiedBy: text("verified_by"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Coupons and deals
export const coupons = sqliteTable("coupons", {
  id: text("id").primaryKey().$defaultFn(generateId),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  discountValue: real("discount_value").notNull(),
  code: text("code").notNull(),
  validFrom: integer("valid_from", { mode: "timestamp" }).notNull(),
  validTo: integer("valid_to", { mode: "timestamp" }).notNull(),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  termsAndConditions: text("terms_and_conditions"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Foraging spots
export const foragingSpots = sqliteTable("foraging_spots", {
  id: text("id").primaryKey().$defaultFn(generateId),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  title: text("title").notNull(),
  plantType: text("plant_type").notNull(),
  species: text("species"),
  description: text("description").notNull(),
  images: text("images", { mode: "json" }).$type<string[]>(),
  edibleParts: text("edible_parts"),
  seasonality: text("seasonality"),
  benefits: text("benefits"),
  accessNotes: text("access_notes"),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  verifiedBy: text("verified_by"),
  country: text("country"),
  region: text("region"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Garden clubs
export const gardenClubs = sqliteTable("garden_clubs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  description: text("description").notNull(),
  city: text("city"),
  country: text("country"),
  region: text("region"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  contactInfo: text("contact_info"),
  email: text("email"),
  meetingSchedule: text("meeting_schedule"),
  website: text("website"),
  imageUrl: text("image_url"),
  memberCount: integer("member_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Seed banks
export const seedBanks = sqliteTable("seed_banks", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  locationText: text("location_text").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  description: text("description").notNull(),
  managedByUserId: text("managed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  seedsAvailable: text("seeds_available", { mode: "json" }).$type<string[]>(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Water sources and energy hubs
export const resourceHubs = sqliteTable("resource_hubs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  type: text("type").notNull(), // water, solar, wind, compost
  name: text("name"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  description: text("description").notNull(),
  accessRules: text("access_rules"),
  contactInfo: text("contact_info"),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Events
export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(generateId),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hostUserId: text("host_user_id").references(() => users.id, { onDelete: "set null" }),
  hostClubId: text("host_club_id").references(() => gardenClubs.id, { onDelete: "set null" }),
  type: text("type").notNull(), // workshop, meetup, market, tour, webinar
  startDateTime: integer("start_date_time", { mode: "timestamp" }).notNull(),
  endDateTime: integer("end_date_time", { mode: "timestamp" }).notNull(),
  timeZone: text("time_zone").notNull(),
  locationOnline: integer("location_online", { mode: "boolean" }).notNull().default(false),
  locationAddress: text("location_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  capacity: integer("capacity"),
  registeredCount: integer("registered_count").notNull().default(0),
  imageUrl: text("image_url"),
  price: real("price").default(0),
  currency: text("currency").default("USD"),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("upcoming"), // upcoming, ongoing, completed, cancelled
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Event registrations
export const eventRegistrations = sqliteTable("event_registrations", {
  id: text("id").primaryKey().$defaultFn(generateId),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("registered"), // registered, attended, cancelled
  registeredAt: integer("registered_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Training modules
export const trainingModules = sqliteTable("training_modules", {
  id: text("id").primaryKey().$defaultFn(generateId),
  title: text("title").notNull(),
  category: text("category").notNull(), // gardening, foraging, sustainability, cooking, business
  difficultyLevel: text("difficulty_level").notNull(), // beginner, intermediate, advanced
  description: text("description"),
  content: text("content").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  isPremium: integer("is_premium", { mode: "boolean" }).notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// User training progress
export const userTrainingProgress = sqliteTable("user_training_progress", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: text("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  progressPercent: integer("progress_percent").notNull().default(0),
  lastAccessedAt: integer("last_accessed_at", { mode: "timestamp" }),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Meal plans
export const mealPlans = sqliteTable("meal_plans", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  dietaryPreference: text("dietary_preference"), // vegan, vegetarian, pescatarian, omnivore
  days: integer("days").notNull().default(7),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Recipes
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey().$defaultFn(generateId),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dietaryPreference: text("dietary_preference"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  ingredients: text("ingredients", { mode: "json" }).$type<Array<{ name: string; quantity: string; unit: string }>>().notNull(),
  instructions: text("instructions").notNull(),
  prepTime: integer("prep_time"), // in minutes
  cookTime: integer("cook_time"), // in minutes
  servings: integer("servings"),
  nutritionSummary: text("nutrition_summary"),
  imageUrl: text("image_url"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Shopping lists
export const shoppingLists = sqliteTable("shopping_lists", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedMealPlanId: text("linked_meal_plan_id").references(() => mealPlans.id, { onDelete: "set null" }),
  name: text("name"),
  items: text("items", { mode: "json" }).$type<Array<{ ingredientName: string; quantity: string; unit: string; checked?: boolean }>>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Chat messages
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(generateId),
  senderUserId: text("sender_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageType: text("message_type").notNull().default("text"), // text, image, file
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Reviews
export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey().$defaultFn(generateId),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectType: text("subject_type").notNull(), // listing, vendor, user, recipe
  subjectId: text("subject_id").notNull(),
  rating: integer("rating").notNull(), // 1-5
  title: text("title"),
  comment: text("comment"),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Job posts
export const jobPosts = sqliteTable("job_posts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  postedByUserId: text("posted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(), // fullTime, partTime, contract, volunteer, internship
  category: text("category").notNull(), // farming, gardening, sales, education, management
  locationText: text("location_text"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  isRemote: integer("is_remote", { mode: "boolean" }).notNull().default(false),
  compensationInfo: text("compensation_info"),
  salaryMin: real("salary_min"),
  salaryMax: real("salary_max"),
  salaryCurrency: text("salary_currency").default("USD"),
  requirements: text("requirements", { mode: "json" }).$type<string[]>(),
  benefits: text("benefits", { mode: "json" }).$type<string[]>(),
  applicationUrl: text("application_url"),
  applicationEmail: text("application_email"),
  status: text("status").notNull().default("active"), // active, filled, expired, closed
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Job applications
export const jobApplications = sqliteTable("job_applications", {
  id: text("id").primaryKey().$defaultFn(generateId),
  jobId: text("job_id").notNull().references(() => jobPosts.id, { onDelete: "cascade" }),
  applicantUserId: text("applicant_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  resumeUrl: text("resume_url"),
  status: text("status").notNull().default("pending"), // pending, reviewed, interviewed, accepted, rejected
  notes: text("notes"),
  appliedAt: integer("applied_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Credit transactions
export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // earned, spent, purchased, refunded, referral_bonus, vendor_commission, recurring_commission
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"), // listing, event, subscription
  relatedEntityId: text("related_entity_id"),
  recurringSourceId: text("recurring_source_id"), // For tracking recurring commission sources
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Subscription plans
export const subscriptionPlans = sqliteTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  interval: text("interval").notNull(), // monthly, yearly
  features: text("features", { mode: "json" }).$type<string[]>().notNull(),
  stripePriceId: text("stripe_price_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Payment history
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(), // pending, completed, failed, refunded
  paymentMethod: text("payment_method").notNull(), // stripe, credits
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  description: text("description").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Notifications
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // message, event, listing, review, system
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Admin audit log
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // create, update, delete, ban, verify, etc.
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  oldValues: text("old_values", { mode: "json" }).$type<Record<string, any>>(),
  newValues: text("new_values", { mode: "json" }).$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// ============ SYNC INFRASTRUCTURE TABLES ============

// Sync queue for offline operations
export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  operation: text("operation").notNull(), // create, update, delete
  data: text("data", { mode: "json" }).$type<Record<string, any>>(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  processedAt: integer("processed_at", { mode: "timestamp" }),
});

// Device registry with FCM tokens
export const deviceRegistry = sqliteTable("device_registry", {
  id: text("id").primaryKey().$defaultFn(generateId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull().unique(),
  deviceName: text("device_name"),
  deviceType: text("device_type"), // ios, android, web
  fcmToken: text("fcm_token"),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Conflict log for sync conflicts
export const conflictLog = sqliteTable("conflict_log", {
  id: text("id").primaryKey().$defaultFn(generateId),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  serverVersion: integer("server_version").notNull(),
  clientVersion: integer("client_version").notNull(),
  serverData: text("server_data", { mode: "json" }).$type<Record<string, any>>(),
  clientData: text("client_data", { mode: "json" }).$type<Record<string, any>>(),
  resolution: text("resolution"), // server_wins, client_wins, manual, merged
  resolvedBy: text("resolved_by"),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ============ VENDOR REFERRALS TABLE ============

// Vendor referral tracking
export const vendorReferrals = sqliteTable("vendor_referrals", {
  id: text("id").primaryKey().$defaultFn(generateId),
  referrerVendorId: text("referrer_vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  referredVendorId: text("referred_vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  conversionDate: integer("conversion_date", { mode: "timestamp" }),
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  totalEarnings: real("total_earnings").notNull().default(0),
  recurringCommissionRate: real("recurring_commission_rate").notNull().default(0), // Percentage
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// ============ VIDEO CALL TABLES ============

// Video calls
export const videoCalls = sqliteTable("video_calls", {
  id: text("id").primaryKey().$defaultFn(generateId),
  callType: text("call_type").notNull(), // one_on_one, group
  hostUserId: text("host_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channelName: text("channel_name").notNull().unique(),
  agoraToken: text("agora_token"),
  status: text("status").notNull().default("initiated"), // initiated, active, ended, cancelled
  startedAt: integer("started_at", { mode: "timestamp" }),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  duration: integer("duration"), // in seconds
  recordingUrl: text("recording_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// Video call participants
export const videoCallParticipants = sqliteTable("video_call_participants", {
  id: text("id").primaryKey().$defaultFn(generateId),
  callId: text("call_id").notNull().references(() => videoCalls.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  leftAt: integer("left_at", { mode: "timestamp" }),
  isMuted: integer("is_muted", { mode: "boolean" }).notNull().default(false),
  isVideoOn: integer("is_video_on", { mode: "boolean" }).notNull().default(true),
  // Sync metadata
  version: integer("version").notNull().default(1),
  syncStatus: text("sync_status").notNull().default("synced"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  deviceId: text("device_id"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

// ============ RELATIONS ============

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
  eventRegistrations: many(eventRegistrations),
  jobApplications: many(jobApplications),
  notifications: many(notifications),
  payments: many(payments),
  trainingProgress: many(userTrainingProgress),
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

export const eventsRelations = relations(events, ({ one, many }) => ({
  hostUser: one(users, {
    fields: [events.hostUserId],
    references: [users.id],
  }),
  hostClub: one(gardenClubs, {
    fields: [events.hostClubId],
    references: [gardenClubs.id],
  }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const trainingModulesRelations = relations(trainingModules, ({ many }) => ({
  userProgress: many(userTrainingProgress),
}));

export const userTrainingProgressRelations = relations(userTrainingProgress, ({ one }) => ({
  user: one(users, {
    fields: [userTrainingProgress.userId],
    references: [users.id],
  }),
  module: one(trainingModules, {
    fields: [userTrainingProgress.moduleId],
    references: [trainingModules.id],
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

export const jobPostsRelations = relations(jobPosts, ({ one, many }) => ({
  postedByUser: one(users, {
    fields: [jobPosts.postedByUserId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [jobPosts.vendorId],
    references: [vendors.id],
  }),
  applications: many(jobApplications),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  job: one(jobPosts, {
    fields: [jobApplications.jobId],
    references: [jobPosts.id],
  }),
  applicant: one(users, {
    fields: [jobApplications.applicantUserId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const syncQueueRelations = relations(syncQueue, ({ one }) => ({
  user: one(users, {
    fields: [syncQueue.userId],
    references: [users.id],
  }),
}));

export const deviceRegistryRelations = relations(deviceRegistry, ({ one }) => ({
  user: one(users, {
    fields: [deviceRegistry.userId],
    references: [users.id],
  }),
}));

export const conflictLogRelations = relations(conflictLog, ({ one }) => ({
  user: one(users, {
    fields: [conflictLog.userId],
    references: [users.id],
  }),
}));

export const vendorReferralsRelations = relations(vendorReferrals, ({ one }) => ({
  referrerVendor: one(vendors, {
    fields: [vendorReferrals.referrerVendorId],
    references: [vendors.id],
    relationName: "referrer",
  }),
  referredVendor: one(vendors, {
    fields: [vendorReferrals.referredVendorId],
    references: [vendors.id],
    relationName: "referred",
  }),
}));

export const videoCallsRelations = relations(videoCalls, ({ one, many }) => ({
  host: one(users, {
    fields: [videoCalls.hostUserId],
    references: [users.id],
  }),
  participants: many(videoCallParticipants),
}));

export const videoCallParticipantsRelations = relations(videoCallParticipants, ({ one }) => ({
  call: one(videoCalls, {
    fields: [videoCallParticipants.callId],
    references: [videoCalls.id],
  }),
  user: one(users, {
    fields: [videoCallParticipants.userId],
    references: [users.id],
  }),
}));

// ============ INSERT SCHEMAS ============

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  creditBalance: true,
  role: true,
  passwordHash: true,
  emailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpires: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  isPremium: true,
  premiumExpiresAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  isActive: true,
  isBanned: true,
  bannedReason: true,
  bannedAt: true,
  bannedBy: true,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isFeatured: true,
  viewCount: true,
} as any);

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verified: true,
  verifiedAt: true,
  verifiedBy: true,
  rating: true,
  reviewCount: true,
} as any);

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  currentUses: true,
  isActive: true,
} as any);

export const insertForagingSpotSchema = createInsertSchema(foragingSpots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verifiedBy: true,
} as any);

export const insertGardenClubSchema = createInsertSchema(gardenClubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  memberCount: true,
} as any);

export const insertSeedBankSchema = createInsertSchema(seedBanks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertResourceHubSchema = createInsertSchema(resourceHubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertEventSchema = createInsertSchema(events, {
  startDateTime: z.union([z.date(), z.string()]).transform((val) =>
    typeof val === "string" ? new Date(val) : val
  ),
  endDateTime: z.union([z.date(), z.string()]).transform((val) =>
    typeof val === "string" ? new Date(val) : val
  ),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredCount: true,
  isFeatured: true,
  status: true,
} as any);

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
} as any);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
} as any);

export const insertJobPostSchema = createInsertSchema(jobPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} as any);

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
} as any);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
} as any);

export const insertSyncQueueSchema = createInsertSchema(syncQueue).omit({
  id: true,
  createdAt: true,
  status: true,
  retryCount: true,
  processedAt: true,
} as any);

export const insertDeviceRegistrySchema = createInsertSchema(deviceRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export const insertConflictLogSchema = createInsertSchema(conflictLog).omit({
  id: true,
  createdAt: true,
} as any);

export const insertVendorReferralSchema = createInsertSchema(vendorReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalEarnings: true,
  status: true,
  version: true,
  syncStatus: true,
  lastSyncedAt: true,
  isDeleted: true,
  deletedAt: true,
} as any);

export const insertVideoCallSchema = createInsertSchema(videoCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  version: true,
  syncStatus: true,
  lastSyncedAt: true,
  isDeleted: true,
  deletedAt: true,
} as any);

export const insertVideoCallParticipantSchema = createInsertSchema(videoCallParticipants).omit({
  id: true,
  joinedAt: true,
  version: true,
  syncStatus: true,
  lastSyncedAt: true,
  isDeleted: true,
  deletedAt: true,
} as any);

// ============ TYPES ============

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertListing = typeof listings.$inferInsert;
export type Listing = typeof listings.$inferSelect;

export type InsertVendor = typeof vendors.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;

export type InsertCoupon = typeof coupons.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;

export type InsertForagingSpot = typeof foragingSpots.$inferInsert;
export type ForagingSpot = typeof foragingSpots.$inferSelect;

export type InsertGardenClub = typeof gardenClubs.$inferInsert;
export type GardenClub = typeof gardenClubs.$inferSelect;

export type InsertSeedBank = typeof seedBanks.$inferInsert;
export type SeedBank = typeof seedBanks.$inferSelect;

export type InsertResourceHub = typeof resourceHubs.$inferInsert;
export type ResourceHub = typeof resourceHubs.$inferSelect;

export type InsertEvent = typeof events.$inferInsert;
export type Event = typeof events.$inferSelect;

export type InsertTrainingModule = typeof trainingModules.$inferInsert;
export type TrainingModule = typeof trainingModules.$inferSelect;

export type InsertMealPlan = typeof mealPlans.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertRecipe = typeof recipes.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;

export type InsertShoppingList = typeof shoppingLists.$inferInsert;
export type ShoppingList = typeof shoppingLists.$inferSelect;

export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertReview = typeof reviews.$inferInsert;
export type Review = typeof reviews.$inferSelect;

export type InsertJobPost = typeof jobPosts.$inferInsert;
export type JobPost = typeof jobPosts.$inferSelect;

export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type JobApplication = typeof jobApplications.$inferSelect;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertSyncQueue = typeof syncQueue.$inferInsert;
export type SyncQueue = typeof syncQueue.$inferSelect;

export type InsertDeviceRegistry = typeof deviceRegistry.$inferInsert;
export type DeviceRegistry = typeof deviceRegistry.$inferSelect;

export type InsertConflictLog = typeof conflictLog.$inferInsert;
export type ConflictLog = typeof conflictLog.$inferSelect;

export type InsertVendorReferral = typeof vendorReferrals.$inferInsert;
export type VendorReferral = typeof vendorReferrals.$inferSelect;

export type InsertVideoCall = typeof videoCalls.$inferInsert;
export type VideoCall = typeof videoCalls.$inferSelect;

export type InsertVideoCallParticipant = typeof videoCallParticipants.$inferInsert;
export type VideoCallParticipant = typeof videoCallParticipants.$inferSelect;
