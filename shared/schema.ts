import { pgTable, text, serial, integer, bigint, boolean, timestamp, json, uniqueIndex, varchar, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table for Replit authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [uniqueIndex("IDX_session_expire").on(table.expire)],
);

// Stream backgrounds table for admin management
export const streamBackgrounds = pgTable("stream_backgrounds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'bedroom', 'nature', 'urban', 'abstract', etc.
  imageUrl: text("image_url").notNull(), // URL or path to background image
  thumbnailUrl: text("thumbnail_url"), // Optional thumbnail for admin interface
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  requiredPlan: text("required_plan").default("free").notNull(), // free, pro, premium
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Background categories for organization
export const backgroundCategories = pgTable("background_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  twitterHandle: text("twitter_handle"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  twitterToken: text("twitter_token"),
  twitterTokenSecret: text("twitter_token_secret"),
  googleId: text("google_id"),
  twitterId: text("twitter_id"),
  plan: text("plan").default("free").notNull(),
  streamTimeRemaining: integer("stream_time_remaining").default(900).notNull(), // 15 minutes free streaming per week
  
  // Enhanced platform-specific fields for admin controls
  totalStreamTime: integer("total_stream_time").default(0).notNull(), // Total time streamed in seconds
  totalStreamSessions: integer("total_stream_sessions").default(0).notNull(), // Number of streaming sessions
  avatarsCreated: integer("avatars_created").default(0).notNull(), // Number of avatars created
  lastStreamAt: timestamp("last_stream_at"), // Last streaming session
  lastAvatarCreatedAt: timestamp("last_avatar_created_at"), // Last avatar creation
  subscriptionStartDate: timestamp("subscription_start_date"), // When current subscription started
  subscriptionEndDate: timestamp("subscription_end_date"), // When current subscription ends
  
  // Subscription management fields
  subscriptionPlanId: text("subscription_plan_id").default("free").notNull(),
  subscriptionStatus: text("subscription_status").default("active").notNull(),
  avatarCount: integer("avatar_count").default(0).notNull(),
});

// RTMP Sources table for user-specific streaming configurations
export const rtmpSources = pgTable("rtmp_sources", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  streamKey: text("stream_key").notNull(),
  bitrate: integer("bitrate").default(2500).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RTMP source types
export type RtmpSource = typeof rtmpSources.$inferSelect;
export type InsertRtmpSource = typeof rtmpSources.$inferInsert;

// Subscription plans table with auto-rigging tier limits
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), // free, reply_guy, spartan, zeus, goat
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  currency: text("currency").default("USD"),
  billingInterval: text("billing_interval").default("month"),
  streamMinutesPerWeek: integer("stream_minutes_per_week").default(0),
  avatarMaxCount: integer("avatar_max_count").default(1),
  maxConcurrentStreams: integer("max_concurrent_streams").default(1),
  maxResolution: text("max_resolution").default("720p"),
  marketplaceAccess: boolean("marketplace_access").default(false),
  customAvatars: boolean("custom_avatars").default(false),
  prioritySupport: boolean("priority_support").default(false),
  whiteLabelAccess: boolean("white_label").default(false),
  apiAccess: boolean("api_access").default(false),
  isPopular: boolean("is_popular").default(false),
  isFree: boolean("is_free").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  xSpacesHosting: boolean("x_spaces_hosting").default(false),
  riggingStudioAccess: boolean("rigging_studio_access").default(false),
  maxMorphPoints: integer("max_morph_points").default(0),
  buddyInviteAccess: boolean("buddy_invite_access").default(false),
  isComingSoon: boolean("is_coming_soon").default(false),
  
  // Auto-rigging tier limits for progressive optimization
  maxBones: integer("max_bones").notNull().default(0),
  maxMorphTargets: integer("max_morph_targets").notNull().default(0),
  trackingPrecision: numeric("tracking_precision").default("0.5"),
  animationSmoothness: numeric("animation_smoothness").default("0.5"),
  riggingFeatures: json("rigging_features"),
  boneStructure: json("bone_structure"),
  animationResponsiveness: numeric("animation_responsiveness").default("0.5"),
  faceTracking: boolean("face_tracking").default(false),
  bodyTracking: boolean("body_tracking").default(false),
  handTracking: boolean("hand_tracking").default(false),
  fingerTracking: boolean("finger_tracking").default(false),
  eyeTracking: boolean("eye_tracking").default(false),
  expressionTracking: boolean("expression_tracking").default(false),
  autoRiggingEnabled: boolean("auto_rigging_enabled").default(false),
  maxFileSizeMb: integer("max_file_size_mb").default(25),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => subscriptionPlans.id),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  status: text("status").notNull().default("active"), // active, cancelled, expired
  streamTimeRemaining: integer("stream_time_remaining").notNull(), // in minutes
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Add-ons table
export const addOns = pgTable("add_ons", {
  id: serial("id").primaryKey(),
  addonId: text("addon_id").notNull().unique(), // stream_hours, voice_clone, etc.
  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
  description: text("description").notNull(),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User add-ons purchases table
export const userAddOns = pgTable("user_add_ons", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addonId: text("addon_id").notNull().references(() => addOns.addonId),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("active"), // active, used, expired
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Avatars table with IPFS and auto-rigging support
export const avatars = pgTable("avatars", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 2d-generated, glb-upload, preset, built-in
  category: text("category").default("custom").notNull(), // custom, fantasy, modern, business, etc.
  thumbnailUrl: text("thumbnail_url").notNull(),
  previewUrl: text("preview_url").notNull(),
  modelUrl: text("model_url").notNull(),
  fileUrl: text("file_url").notNull(), // Path to the actual file (GLB, etc.)
  ipfsHash: text("ipfs_hash"), // IPFS hash for decentralized storage
  supabaseUrl: text("supabase_url"), // Backup Supabase storage URL
  
  vertices: integer("vertices").notNull(),
  controlPoints: integer("control_points").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  
  // Auto-rigging and AI recognition
  isRigged: boolean("is_rigged").default(false).notNull(),
  riggedModelUrl: text("rigged_model_url"), // URL to auto-rigged version
  riggedIpfsHash: text("rigged_ipfs_hash"), // IPFS hash for rigged model
  faceTrackingEnabled: boolean("face_tracking_enabled").default(true).notNull(),
  bodyTrackingEnabled: boolean("body_tracking_enabled").default(true).notNull(),
  handTrackingEnabled: boolean("hand_tracking_enabled").default(false).notNull(),
  
  // Model quality and optimization
  lodLevels: json("lod_levels"), // Level of detail configurations
  animations: json("animations"), // Available animations
  blendShapes: json("blend_shapes"), // Facial expression blend shapes
  
  // Access control
  isPremium: boolean("is_premium").default(false).notNull(),
  isPublic: boolean("is_public").default(false).notNull(), // Can be used by others
  requiredPlan: text("required_plan").default("free").notNull(),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  
  // Auto-rigging and studio session tracking stored in metadata
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Avatar categories for organization
export const avatarCategories = pgTable("avatar_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Built-in preset avatars
export const presetAvatars = pgTable("preset_avatars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => avatarCategories.id),
  thumbnailUrl: text("thumbnail_url").notNull(),
  previewUrl: text("preview_url").notNull(),
  modelUrl: text("model_url").notNull(),
  ipfsHash: text("ipfs_hash"),
  
  vertices: integer("vertices").notNull(),
  fileSize: integer("file_size").notNull(),
  
  // Pre-configured settings
  isRigged: boolean("is_rigged").default(true).notNull(),
  faceTrackingEnabled: boolean("face_tracking_enabled").default(true).notNull(),
  bodyTrackingEnabled: boolean("body_tracking_enabled").default(true).notNull(),
  animations: json("animations"),
  blendShapes: json("blend_shapes"),
  
  // Access control
  requiredPlan: text("required_plan").default("free").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0).notNull(),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Streaming sessions table
export const streamingSessions = pgTable("streaming_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  avatarId: integer("avatar_id").references(() => avatars.id),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  platform: text("platform"), // twitter_spaces, other
  viewers: integer("viewers").default(0),
  status: text("status").notNull().default("active"), // active, ended, failed
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System logs table
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // info, warning, error
  type: text("type").notNull(), // info, warning, error
  service: text("service").notNull(), // auth, avatar, stream, subscription
  message: text("message").notNull(),
  details: json("details"),
  userId: varchar("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// GPU usage logs table
export const gpuUsageLogs = pgTable("gpu_usage_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  operation: text("operation").notNull(), // avatar_generation, streaming, tracking
  usage: integer("usage").notNull(), // percentage usage 0-100
  memoryUsed: integer("memory_used").notNull(), // in MB
  serviceId: text("service_id").notNull(), // identifier for the service
  resourceUsage: integer("resource_usage").notNull(), // in milliseconds
  cost: integer("cost"), // in cents
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// DMCA complaints tracking
export const dmcaComplaints = pgTable("dmca_complaints", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  complainantName: text("complainant_name").notNull(),
  complainantEmail: text("complainant_email").notNull(),
  contentUrl: text("content_url").notNull(),
  claimedWork: text("claimed_work").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, investigating, resolved, dismissed
  actionTaken: text("action_taken"), // content_removed, user_warned, user_suspended, etc.
  adminNotes: text("admin_notes"),
  filedAt: timestamp("filed_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"), // admin user ID
});

// User suspensions tracking with automated escalation
export const userSuspensions = pgTable("user_suspensions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  suspensionType: text("suspension_type").notNull(), // 'manual', 'automated', 'dmca'
  suspensionLevel: integer("suspension_level").notNull(), // 1-7 (1day, 3day, 7day, 14day, 30day, 180day, permanent)
  reason: text("reason").notNull(),
  description: text("description"),
  issuedBy: text("issued_by").notNull(), // admin user ID
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  autoReactivateAt: timestamp("auto_reactivate_at"), // When to automatically unblock
  appealSubmitted: boolean("appeal_submitted").default(false).notNull(),
  appealNotes: text("appeal_notes"),
  relatedDmcaId: integer("related_dmca_id"), // Link to DMCA complaint if applicable
});

// User warnings tracking
export const userWarnings = pgTable("user_warnings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  warningType: text("warning_type").notNull(), // dmca, community_guidelines, tos_violation
  reason: text("reason").notNull(),
  description: text("description"),
  issuedBy: text("issued_by").notNull(), // admin user ID
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
});

// Coming soon email notifications
export const comingSoonEmails = pgTable("coming_soon_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  planName: text("plan_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users, {
  id: z.string().optional(), // Make ID optional to allow Supabase to provide it
  plan: z.string().default("free"),
  streamTimeRemaining: z.number().default(300),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  blocked: z.boolean().optional().default(false),
  emailVerified: z.boolean().optional().default(false)
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAddOnSchema = createInsertSchema(addOns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAddOnSchema = createInsertSchema(userAddOns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvatarSchema = createInsertSchema(avatars, {
  createdAt: z.date().optional()
}).omit({
  id: true,
  updatedAt: true,
});

export const insertStreamingSessionSchema = createInsertSchema(streamingSessions, {
  endTime: z.date().nullable().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  duration: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs, {
  timestamp: z.date().optional(),
  service: z.string().default("general"),
  type: z.string().default("info")
}).omit({
  id: true,
  createdAt: true,
});

export const insertGpuUsageLogSchema = createInsertSchema(gpuUsageLogs, {
  timestamp: z.date().optional()
}).omit({
  id: true,
  createdAt: true,
});

export const insertComingSoonEmailSchema = createInsertSchema(comingSoonEmails).omit({
  id: true,
  createdAt: true,
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type InsertAddOn = z.infer<typeof insertAddOnSchema>;
export type InsertUserAddOn = z.infer<typeof insertUserAddOnSchema>;
export type InsertAvatar = z.infer<typeof insertAvatarSchema>;
export type InsertStreamingSession = z.infer<typeof insertStreamingSessionSchema>;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type InsertGpuUsageLog = z.infer<typeof insertGpuUsageLogSchema>;
export type InsertComingSoonEmail = z.infer<typeof insertComingSoonEmailSchema>;

// Background insert schemas
export const insertStreamBackgroundSchema = createInsertSchema(streamBackgrounds);
export const insertBackgroundCategorySchema = createInsertSchema(backgroundCategories);

// Background insert types
export type InsertStreamBackground = z.infer<typeof insertStreamBackgroundSchema>;
export type InsertBackgroundCategory = z.infer<typeof insertBackgroundCategorySchema>;

// Select types
export type User = typeof users.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type AddOn = typeof addOns.$inferSelect;
export type UserAddOn = typeof userAddOns.$inferSelect;
export type Avatar = typeof avatars.$inferSelect;
export type StreamingSession = typeof streamingSessions.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type GpuUsageLog = typeof gpuUsageLogs.$inferSelect;
export type ComingSoonEmail = typeof comingSoonEmails.$inferSelect;
export type StreamBackground = typeof streamBackgrounds.$inferSelect;
export type BackgroundCategory = typeof backgroundCategories.$inferSelect;
export type AvatarCategory = typeof avatarCategories.$inferSelect;
export type PresetAvatar = typeof presetAvatars.$inferSelect;

// Avatar insert schemas
export const insertAvatarCategorySchema = createInsertSchema(avatarCategories);
export const insertPresetAvatarSchema = createInsertSchema(presetAvatars);

// Avatar insert types
export type InsertAvatarCategory = z.infer<typeof insertAvatarCategorySchema>;
export type InsertPresetAvatar = z.infer<typeof insertPresetAvatarSchema>;
