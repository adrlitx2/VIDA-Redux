import { eq, and, gte, lte, desc, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Client } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

// Import the database connection from db.ts instead
import { db } from "./db";

// Add support for Replit authentication
export async function upsertUser(userData: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}): Promise<any> {
  try {
    console.log("Upserting user from Replit Auth:", userData.id, userData.email);
    
    // Check if user exists first
    const existingUser = await getUserById(userData.id);
    
    if (existingUser) {
      // Update existing user
      const [updated] = await db
        .update(schema.users)
        .set({
          email: userData.email || existingUser.email,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userData.id))
        .returning();
      return updated;
    } else {
      // Create new user with defaults
      const [newUser] = await db
        .insert(schema.users)
        .values({
          id: userData.id,
          email: userData.email || `user_${userData.id}@example.com`,
          username: `user_${userData.id}`,
          plan: "free",
          streamTimeRemaining: 300, // 5 min free
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newUser;
    }
  } catch (error) {
    console.error("Error upserting Replit user:", error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<schema.User | undefined> {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return undefined;
  }
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<schema.User | undefined>;
  getUserById(id: string): Promise<schema.User | undefined>; // Added for Supabase auth
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  getUserByUsername(username: string): Promise<schema.User | undefined>;
  getUserByTwitterId(twitterId: string): Promise<schema.User | undefined>;
  getUserByGoogleId(googleId: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;
  updateUser(id: string, data: Partial<schema.User>): Promise<schema.User | undefined>;
  updateUserStripeInfo(id: string, data: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<schema.User | undefined>;
  listUsers(options?: { limit?: number, offset?: number }): Promise<schema.User[]>;

  // Subscription operations
  getSubscription(userId: string): Promise<schema.UserSubscription | undefined>;
  createSubscription(subscription: schema.InsertUserSubscription): Promise<schema.UserSubscription>;
  updateSubscription(userId: string, data: Partial<schema.UserSubscription>): Promise<schema.UserSubscription | undefined>;
  cancelSubscription(userId: string): Promise<boolean>;
  
  // Subscription Plan operations
  listSubscriptionPlans(): Promise<schema.SubscriptionPlan[]>;
  createSubscriptionPlan(planData: schema.InsertSubscriptionPlan): Promise<schema.SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: Partial<schema.SubscriptionPlan>): Promise<schema.SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;
  getUsersBySubscriptionPlan(planId: string): Promise<any[]>;
  updateUserSubscriptionPlan(userId: string, planId: string): Promise<any>;
  
  // Add-on operations
  getUserAddOns(userId: string): Promise<schema.UserAddOn[]>;
  purchaseAddOn(userAddOn: schema.InsertUserAddOn): Promise<schema.UserAddOn>;
  useAddOn(id: number): Promise<schema.UserAddOn | undefined>;
  
  // Avatar operations
  getAvatar(id: number): Promise<schema.Avatar | undefined>;
  getUserAvatars(userId: string): Promise<schema.Avatar[]>;
  getAvatarsByUserId(userId: string): Promise<schema.Avatar[]>;
  createAvatar(avatar: schema.InsertAvatar): Promise<schema.Avatar>;
  updateAvatar(id: number, data: Partial<schema.Avatar>): Promise<schema.Avatar | undefined>;
  deleteAvatar(id: number): Promise<boolean>;
  
  // Streaming operations
  startStreamingSession(session: schema.InsertStreamingSession): Promise<schema.StreamingSession>;
  endStreamingSession(id: number, data: { endTime: Date, duration: number, viewers?: number }): Promise<schema.StreamingSession | undefined>;
  getActiveStreamingSessions(): Promise<schema.StreamingSession[]>;
  getUserStreamingHistory(userId: string, options?: { limit?: number, offset?: number }): Promise<schema.StreamingSession[]>;
  
  // Admin operations
  getSystemStats(timeRange?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
  logSystemEvent(log: schema.InsertSystemLog): Promise<schema.SystemLog>;
  logGpuUsage(log: schema.InsertGpuUsageLog): Promise<schema.GpuUsageLog>;
  blockUser(userId: string, blocked: boolean): Promise<schema.User | undefined>;
  
  // Background management operations
  getAllBackgrounds(): Promise<schema.StreamBackground[]>;
  getActiveBackgrounds(): Promise<schema.StreamBackground[]>;
  getBackgroundsByCategory(category: string): Promise<schema.StreamBackground[]>;
  createBackground(background: schema.InsertStreamBackground): Promise<schema.StreamBackground>;
  updateBackground(id: number, data: Partial<schema.StreamBackground>): Promise<schema.StreamBackground | undefined>;
  deleteBackground(id: number): Promise<boolean>;
  getAllCategories(): Promise<schema.BackgroundCategory[]>;
  createCategory(category: schema.InsertBackgroundCategory): Promise<schema.BackgroundCategory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<schema.User | undefined> {
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    
    return result[0];
  }
  
  async getUserById(id: string): Promise<schema.User | undefined> {
    // Same implementation as getUser, added for compatibility with Supabase auth
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    
    return result[0];
  }

  async getUserByTwitterId(twitterId: string): Promise<schema.User | undefined> {
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.twitterId, twitterId))
      .limit(1);
    
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<schema.User | undefined> {
    const result = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.googleId, googleId))
      .limit(1);
    
    return result[0];
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    if (user.password) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;
    }

    const result = await db
      .insert(schema.users)
      .values(user)
      .returning();
    
    return result[0];
  }

  async updateUser(id: string, data: Partial<schema.User>): Promise<schema.User | undefined> {
    try {
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      
      // Use raw SQL to handle the complex table structure
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      if (data.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        values.push(data.role);
      }
      if (data.plan !== undefined) {
        updateFields.push(`plan = $${paramIndex++}`);
        values.push(data.plan);
      }
      if (data.blocked !== undefined) {
        updateFields.push(`blocked = $${paramIndex++}`);
        values.push(data.blocked);
      }
      if (data.streamTimeRemaining !== undefined) {
        updateFields.push(`stream_time_remaining = $${paramIndex++}`);
        values.push(data.streamTimeRemaining);
      }
      if (data.username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        values.push(data.username);
      }
      
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      
      values.push(id);
      
      if (updateFields.length === 1) { // Only updated_at
        throw new Error('No fields to update');
      }
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, username, role, plan, blocked, "streamTimeRemaining", "createdAt", "updatedAt"
      `;
      
      console.log('Executing SQL query:', query);
      console.log('With values:', values);
      
      // Use sql template literal for better compatibility
      const sqlQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, username, role, plan, blocked, "streamTimeRemaining", "createdAt", "updatedAt"
      `;
      
      const result = await db.execute(sql.raw(sqlQuery, values));
      return result[0];
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  async updateUserStripeInfo(id: string, data: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<schema.User | undefined> {
    const result = await db
      .update(schema.users)
      .set({
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();
    
    return result[0];
  }

  // Subscription plan management methods
  async listSubscriptionPlans(): Promise<any[]> {
    try {
      // Use raw SQL query to fetch subscription plans
      const result = await db.execute(sql`
        SELECT 
          id, name, description, price, currency, billing_interval,
          stream_minutes_per_week, avatar_max_count, max_concurrent_streams,
          max_resolution, marketplace_access, custom_avatars, priority_support,
          white_label, api_access, is_popular, is_free, is_active, sort_order,
          stripe_product_id, stripe_price_id, created_at, updated_at,
          x_spaces_hosting, rigging_studio_access, max_morph_points,
          buddy_invite_access, is_coming_soon, max_bones, max_morph_targets,
          tracking_precision, animation_smoothness, rigging_features,
          bone_structure, animation_responsiveness, face_tracking,
          body_tracking, hand_tracking, finger_tracking, eye_tracking,
          expression_tracking, auto_rigging_enabled, max_file_size_mb
        FROM subscription_plans 
        ORDER BY sort_order ASC
      `);
      
      return result.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        price: parseFloat(row.price) || 0,
        streamMinutesPerWeek: row.stream_minutes_per_week || 0,
        avatarMaxCount: row.avatar_max_count || 1,
        maxConcurrentStreams: row.max_concurrent_streams || 1,
        maxResolution: row.max_resolution || '720p',
        marketplaceAccess: row.marketplace_access || false,
        customAvatars: row.custom_avatars || false,
        prioritySupport: row.priority_support || false,
        xSpacesHosting: row.x_spaces_hosting || false,
        riggingStudioAccess: row.rigging_studio_access || false,
        maxMorphPoints: row.max_morph_points || 0,
        buddyInviteAccess: row.buddy_invite_access || false,
        isPopular: row.is_popular || false,
        isFree: row.is_free || false,
        isActive: row.is_active || true,
        isComingSoon: row.is_coming_soon || false,
        sortOrder: row.sort_order || 0,
        autoRiggingEnabled: row.auto_rigging_enabled || false,
        // Rigging configuration fields
        maxBones: row.max_bones || 0,
        maxMorphTargets: row.max_morph_targets || 0,
        maxFileSizeMB: row.max_file_size_mb || 25,
        trackingPrecision: parseFloat(row.tracking_precision) || 0,
        animationSmoothness: parseFloat(row.animation_smoothness) || 0,
        animationResponsiveness: parseFloat(row.animation_responsiveness) || 0,
        faceTracking: row.face_tracking || false,
        bodyTracking: row.body_tracking || false,
        handTracking: row.hand_tracking || false,
        fingerTracking: row.finger_tracking || false,
        eyeTracking: row.eye_tracking || false,
        expressionTracking: row.expression_tracking || false,
        userCount: 0, // Calculated separately
        monthlyRevenue: 0, // Calculated separately
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error in listSubscriptionPlans:', error);
      throw error;
    }
  }

  async createSubscriptionPlan(plan: schema.InsertSubscriptionPlan): Promise<schema.SubscriptionPlan> {
    const [newPlan] = await db.insert(schema.subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async updateSubscriptionPlan(planId: string, data: Partial<schema.SubscriptionPlan>): Promise<schema.SubscriptionPlan | undefined> {
    try {
      // Use raw SQL to match the actual database schema
      const result = await db.execute(sql`
        UPDATE subscription_plans 
        SET updated_at = NOW()
        WHERE id = ${planId}
        RETURNING *
      `);
      return result[0] as schema.SubscriptionPlan;
    } catch (error) {
      console.error('Error in updateSubscriptionPlan:', error);
      throw error;
    }
  }

  async deleteSubscriptionPlan(planId: string): Promise<boolean> {
    try {
      // Use raw SQL to match the actual database schema
      await db.execute(sql`DELETE FROM subscription_plans WHERE id = ${planId}`);
      return true;
    } catch (error) {
      console.error('Error in deleteSubscriptionPlan:', error);
      return false;
    }
  }

  async getUsersBySubscriptionPlan(planId: string): Promise<schema.User[]> {
    const users = await db
      .select()
      .from(schema.users)
      .innerJoin(schema.userSubscriptions, eq(schema.users.id, schema.userSubscriptions.userId))
      .where(eq(schema.userSubscriptions.planId, planId));
    
    return users.map(row => row.users);
  }

  async updateUserSubscriptionPlan(userId: string, planId: string): Promise<schema.User | undefined> {
    try {
      // Check if user has an existing subscription
      const existingSubscription = await this.getSubscription(userId);
      
      if (existingSubscription) {
        // Update existing subscription
        await db
          .update(schema.userSubscriptions)
          .set({ 
            planId: planId,
            updatedAt: new Date()
          })
          .where(eq(schema.userSubscriptions.userId, userId));
      } else {
        // Create new subscription
        await db.insert(schema.userSubscriptions).values({
          userId: userId,
          planId: planId,
          status: 'active',
          startDate: new Date()
        });
      }
      
      // Return updated user
      const [updatedUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user subscription plan:', error);
      return undefined;
    }
  }

  async listUsers(options?: { limit?: number, offset?: number }): Promise<schema.User[]> {
    let query = db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<schema.UserSubscription | undefined> {
    const result = await db
      .select()
      .from(schema.userSubscriptions)
      .where(
        and(
          eq(schema.userSubscriptions.userId, userId),
          eq(schema.userSubscriptions.status, "active")
        )
      )
      .limit(1);
    
    return result[0];
  }

  async createSubscription(subscription: schema.InsertUserSubscription): Promise<schema.UserSubscription> {
    // Set stream time based on plan
    let streamTimeRemaining = 0;
    
    switch (subscription.planId) {
      case "free":
        streamTimeRemaining = 15; // 15 minutes
        break;
      case "reply_guy":
        streamTimeRemaining = 60; // 1 hour
        break;
      case "spartan":
        streamTimeRemaining = 20 * 60; // 20 hours
        break;
      case "zeus":
        streamTimeRemaining = 50 * 60; // 50 hours
        break;
      case "goat":
        streamTimeRemaining = 100 * 60; // 100 hours
        break;
    }
    
    // Cancel any existing subscriptions
    await db
      .update(schema.userSubscriptions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userSubscriptions.userId, subscription.userId),
          eq(schema.userSubscriptions.status, "active")
        )
      );
    
    const result = await db
      .insert(schema.userSubscriptions)
      .values({
        ...subscription,
        streamTimeRemaining,
      })
      .returning();
    
    return result[0];
  }

  async updateSubscription(userId: string, data: Partial<schema.UserSubscription>): Promise<schema.UserSubscription | undefined> {
    const result = await db
      .update(schema.userSubscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userSubscriptions.userId, userId),
          eq(schema.userSubscriptions.status, "active")
        )
      )
      .returning();
    
    return result[0];
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    const result = await db
      .update(schema.userSubscriptions)
      .set({
        status: "cancelled",
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userSubscriptions.userId, userId),
          eq(schema.userSubscriptions.status, "active")
        )
      )
      .returning();
    
    return result.length > 0;
  }

  // Add-on operations
  async getUserAddOns(userId: string): Promise<schema.UserAddOn[]> {
    return await db
      .select()
      .from(schema.userAddOns)
      .where(
        and(
          eq(schema.userAddOns.userId, userId),
          eq(schema.userAddOns.status, "active")
        )
      );
  }

  async purchaseAddOn(userAddOn: schema.InsertUserAddOn): Promise<schema.UserAddOn> {
    const result = await db
      .insert(schema.userAddOns)
      .values(userAddOn)
      .returning();
    
    // If this is a stream time add-on, update the user's subscription
    if (userAddOn.addonId === "stream_hours") {
      await this.updateSubscription(userAddOn.userId, {
        streamTimeRemaining: sql`stream_time_remaining + ${10 * 60 * userAddOn.quantity}`,
      });
    }
    
    return result[0];
  }

  async useAddOn(id: number): Promise<schema.UserAddOn | undefined> {
    const result = await db
      .update(schema.userAddOns)
      .set({
        status: "used",
        updatedAt: new Date(),
      })
      .where(eq(schema.userAddOns.id, id))
      .returning();
    
    return result[0];
  }

  // Subscription Plan operations - removed duplicate, using the fixed version above

  async createSubscriptionPlan(planData: schema.InsertSubscriptionPlan): Promise<schema.SubscriptionPlan> {
    const result = await db
      .insert(schema.subscriptionPlans)
      .values(planData)
      .returning();
    
    return result[0];
  }

  async updateSubscriptionPlan(planId: string, data: Partial<schema.SubscriptionPlan>): Promise<schema.SubscriptionPlan | undefined> {
    const result = await db
      .update(schema.subscriptionPlans)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptionPlans.id, planId))
      .returning();
    
    return result[0];
  }

  async deleteSubscriptionPlan(planId: string): Promise<boolean> {
    const result = await db
      .delete(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.id, planId))
      .returning();
    
    return result.length > 0;
  }

  async getUsersBySubscriptionPlan(planId: string): Promise<any[]> {
    return await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.plan, planId));
  }

  async updateUserSubscriptionPlan(userId: string, planId: string): Promise<any> {
    const result = await db
      .update(schema.users)
      .set({
        plan: planId,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    
    return result[0];
  }

  // Avatar operations
  async getAvatar(id: number): Promise<schema.Avatar | undefined> {
    const result = await db
      .select()
      .from(schema.avatars)
      .where(eq(schema.avatars.id, id))
      .limit(1);
    
    return result[0];
  }

  async getUserAvatars(userId: string): Promise<schema.Avatar[]> {
    return await db
      .select()
      .from(schema.avatars)
      .where(eq(schema.avatars.userId, userId))
      .orderBy(desc(schema.avatars.createdAt));
  }

  async createAvatar(avatar: schema.InsertAvatar): Promise<schema.Avatar> {
    const result = await db
      .insert(schema.avatars)
      .values(avatar)
      .returning();
    
    return result[0];
  }

  async updateAvatar(id: number, data: Partial<schema.Avatar>): Promise<schema.Avatar | undefined> {
    const result = await db
      .update(schema.avatars)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.avatars.id, id))
      .returning();
    
    return result[0];
  }

  async deleteAvatar(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.avatars)
      .where(eq(schema.avatars.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Streaming operations
  async startStreamingSession(session: schema.InsertStreamingSession): Promise<schema.StreamingSession> {
    // Reduce user's streaming time
    const subscription = await this.getSubscription(session.userId);
    
    if (subscription && subscription.streamTimeRemaining > 0) {
      await this.updateSubscription(session.userId, {
        streamTimeRemaining: subscription.streamTimeRemaining,
      });
    }
    
    const result = await db
      .insert(schema.streamingSessions)
      .values(session)
      .returning();
    
    return result[0];
  }

  async endStreamingSession(id: number, data: { endTime: Date, duration: number, viewers?: number }): Promise<schema.StreamingSession | undefined> {
    const result = await db
      .update(schema.streamingSessions)
      .set({
        endTime: data.endTime,
        duration: data.duration,
        viewers: data.viewers,
        status: "ended",
        updatedAt: new Date(),
      })
      .where(eq(schema.streamingSessions.id, id))
      .returning();
    
    return result[0];
  }

  async getActiveStreamingSessions(): Promise<schema.StreamingSession[]> {
    return await db
      .select()
      .from(schema.streamingSessions)
      .where(eq(schema.streamingSessions.status, "active"))
      .orderBy(desc(schema.streamingSessions.startTime));
  }

  async getUserStreamingHistory(userId: string, options?: { limit?: number, offset?: number }): Promise<schema.StreamingSession[]> {
    let query = db
      .select()
      .from(schema.streamingSessions)
      .where(eq(schema.streamingSessions.userId, userId))
      .orderBy(desc(schema.streamingSessions.startTime));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  // Avatar methods
  async getAvatar(avatarId: number): Promise<schema.Avatar | undefined> {
    const [avatar] = await db
      .select()
      .from(schema.avatars)
      .where(eq(schema.avatars.id, avatarId));
    return avatar;
  }

  async getAvatarsByUserId(userId: string): Promise<schema.Avatar[]> {
    return await db
      .select()
      .from(schema.avatars)
      .where(eq(schema.avatars.userId, userId))
      .orderBy(desc(schema.avatars.lastUsedAt), desc(schema.avatars.createdAt));
  }

  // Admin operations
  async getSystemStats(timeRange: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<any> {
    let date = new Date();
    
    // Calculate start date based on time range
    if (timeRange === 'day') {
      date.setDate(date.getDate() - 1);
    } else if (timeRange === 'week') {
      date.setDate(date.getDate() - 7);
    } else if (timeRange === 'month') {
      date.setMonth(date.getMonth() - 1);
    } else if (timeRange === 'year') {
      date.setFullYear(date.getFullYear() - 1);
    }
    
    // Get total users
    const totalUsersResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.users);
    
    const totalUsers = Number(totalUsersResult[0].count);
    
    // Get new users in time range
    const newUsersResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.users)
      .where(gte(schema.users.createdAt, date));
    
    const newUsers = Number(newUsersResult[0].count);
    
    // Get active streams
    const activeStreamsResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.streamingSessions)
      .where(eq(schema.streamingSessions.status, "active"));
    
    const activeStreams = Number(activeStreamsResult[0].count);
    
    // Get avatars generated in time range
    const avatarsGeneratedResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.avatars)
      .where(gte(schema.avatars.createdAt, date));
    
    const avatarsGenerated = Number(avatarsGeneratedResult[0].count);
    
    // Get subscription distributions
    const subscriptionDistribution = await db
      .select({
        planId: schema.userSubscriptions.planId,
        count: sql`count(*)`,
      })
      .from(schema.userSubscriptions)
      .where(eq(schema.userSubscriptions.status, "active"))
      .groupBy(schema.userSubscriptions.planId);
    
    // Calculate user growth percentage
    const previousPeriodUsersResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.users)
      .where(
        and(
          gte(schema.users.createdAt, (() => {
            const prevDate = new Date(date);
            if (timeRange === 'day') {
              prevDate.setDate(prevDate.getDate() - 1);
            } else if (timeRange === 'week') {
              prevDate.setDate(prevDate.getDate() - 7);
            } else if (timeRange === 'month') {
              prevDate.setMonth(prevDate.getMonth() - 1);
            } else if (timeRange === 'year') {
              prevDate.setFullYear(prevDate.getFullYear() - 1);
            }
            return prevDate;
          })()),
          lte(schema.users.createdAt, date)
        )
      );
    
    const previousPeriodUsers = Number(previousPeriodUsersResult[0].count);
    const userGrowth = previousPeriodUsers > 0 
      ? Math.round(((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100)
      : 100;
    
    // Calculate avatar growth percentage
    const previousPeriodAvatarsResult = await db
      .select({ count: sql`count(*)` })
      .from(schema.avatars)
      .where(
        and(
          gte(schema.avatars.createdAt, (() => {
            const prevDate = new Date(date);
            if (timeRange === 'day') {
              prevDate.setDate(prevDate.getDate() - 1);
            } else if (timeRange === 'week') {
              prevDate.setDate(prevDate.getDate() - 7);
            } else if (timeRange === 'month') {
              prevDate.setMonth(prevDate.getMonth() - 1);
            } else if (timeRange === 'year') {
              prevDate.setFullYear(prevDate.getFullYear() - 1);
            }
            return prevDate;
          })()),
          lte(schema.avatars.createdAt, date)
        )
      );
    
    const previousPeriodAvatars = Number(previousPeriodAvatarsResult[0].count);
    const avatarGrowth = previousPeriodAvatars > 0 
      ? Math.round(((avatarsGenerated - previousPeriodAvatars) / previousPeriodAvatars) * 100)
      : 100;
    
    // Calculate revenue (simplified - would need to integrate with Stripe in production)
    const revenue = subscriptionDistribution.reduce((total, sub) => {
      let price = 0;
      switch (sub.planId) {
        case "reply_guy": price = 20; break;
        case "spartan": price = 99; break;
        case "zeus": price = 149; break;
        case "goat": price = 200; break;
      }
      return total + (price * Number(sub.count));
    }, 0);
    
    // Fake revenue growth for demo purposes
    const revenueGrowth = 15;
    
    return {
      totalUsers,
      newUsers,
      activeStreams,
      avatarsGenerated,
      revenue,
      userGrowth,
      avatarGrowth,
      revenueGrowth,
      subscriptionDistribution: subscriptionDistribution.map(sub => ({
        name: sub.planId,
        value: Number(sub.count),
      })),
    };
  }

  async logSystemEvent(log: schema.InsertSystemLog): Promise<schema.SystemLog> {
    const result = await db
      .insert(schema.systemLogs)
      .values(log)
      .returning();
    
    return result[0];
  }

  async logGpuUsage(log: schema.InsertGpuUsageLog): Promise<schema.GpuUsageLog> {
    const result = await db
      .insert(schema.gpuUsageLogs)
      .values(log)
      .returning();
    
    return result[0];
  }

  async blockUser(userId: string, blocked: boolean): Promise<schema.User | undefined> {
    const result = await db
      .update(schema.users)
      .set({
        blocked,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    
    return result[0];
  }

  // Background management operations
  async getAllBackgrounds(): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .orderBy(schema.streamBackgrounds.createdAt);
  }

  async getActiveBackgrounds(): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .where(eq(schema.streamBackgrounds.isActive, true))
      .orderBy(schema.streamBackgrounds.createdAt);
  }

  async getBackgroundsByCategory(category: string): Promise<schema.StreamBackground[]> {
    return await db
      .select()
      .from(schema.streamBackgrounds)
      .where(eq(schema.streamBackgrounds.category, category))
      .orderBy(schema.streamBackgrounds.createdAt);
  }

  async createBackground(background: schema.InsertStreamBackground): Promise<schema.StreamBackground> {
    const result = await db
      .insert(schema.streamBackgrounds)
      .values(background)
      .returning();
    
    return result[0];
  }

  async updateBackground(id: number, data: Partial<schema.StreamBackground>): Promise<schema.StreamBackground | undefined> {
    const result = await db
      .update(schema.streamBackgrounds)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.streamBackgrounds.id, id))
      .returning();
    
    return result[0];
  }

  async deleteBackground(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.streamBackgrounds)
      .where(eq(schema.streamBackgrounds.id, id));
    
    return result.rowCount > 0;
  }

  async getAllCategories(): Promise<schema.BackgroundCategory[]> {
    return await db
      .select()
      .from(schema.backgroundCategories)
      .orderBy(schema.backgroundCategories.createdAt);
  }

  async createCategory(category: schema.InsertBackgroundCategory): Promise<schema.BackgroundCategory> {
    const result = await db
      .insert(schema.backgroundCategories)
      .values(category)
      .returning();
    
    return result[0];
  }
}

// Use memory storage for development if no DATABASE_URL is provided
export class MemStorage implements IStorage {
  private users: Map<string, schema.User>;
  private userIdCounter: number;
  private subscriptions: Map<number, schema.UserSubscription>;
  private subscriptionIdCounter: number;
  private userAddOns: Map<number, schema.UserAddOn>;
  private userAddOnIdCounter: number;
  private avatars: Map<number, schema.Avatar>;
  private avatarIdCounter: number;
  private streamingSessions: Map<number, schema.StreamingSession>;
  private streamingIdCounter: number;
  private systemLogs: Map<number, schema.SystemLog>;
  private systemLogIdCounter: number;
  private gpuUsageLogs: Map<number, schema.GpuUsageLog>;
  private gpuUsageLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.userIdCounter = 1;
    this.subscriptions = new Map();
    this.subscriptionIdCounter = 1;
    this.userAddOns = new Map();
    this.userAddOnIdCounter = 1;
    this.avatars = new Map();
    this.avatarIdCounter = 1;
    this.streamingSessions = new Map();
    this.streamingIdCounter = 1;
    this.systemLogs = new Map();
    this.systemLogIdCounter = 1;
    this.gpuUsageLogs = new Map();
    this.gpuUsageLogIdCounter = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create admin user with proper Supabase-compatible string ID
    this.createUser({
      id: "admin_user1",
      username: "admin",
      email: "admin@vidaaa.ai",
      password: "$2b$10$X8DxIFv7mSn5rW5aaLrsru/u2P7OHC.XxwJ6KPxANzxd5l4ZbRmPO", // password: admin123
      role: "superadmin",
      plan: "goat",
      streamTimeRemaining: 300,
      blocked: false,
      emailVerified: true
    });

    // Create sample users with proper Supabase-compatible string IDs
    this.createUser({
      id: "user_johndoe",
      username: "johndoe",
      email: "john@example.com",
      password: "$2b$10$X8DxIFv7mSn5rW5aaLrsru/u2P7OHC.XxwJ6KPxANzxd5l4ZbRmPO", // password: admin123
      role: "user",
      plan: "spartan",
      streamTimeRemaining: 120,
      blocked: false,
      emailVerified: true
    });

    this.createUser({
      id: "user_janedoe",
      username: "janedoe",
      email: "jane@example.com",
      password: "$2b$10$X8DxIFv7mSn5rW5aaLrsru/u2P7OHC.XxwJ6KPxANzxd5l4ZbRmPO", // password: admin123
      role: "user",
      twitterHandle: "@janedoe",
      plan: "free",
      streamTimeRemaining: 30,
      blocked: false,
      emailVerified: true
    });
  }

  // User operations
  async getUser(id: string): Promise<schema.User | undefined> {
    return this.users.get(id);
  }
  
  async getUserById(id: string): Promise<schema.User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByTwitterId(twitterId: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find(user => user.twitterId === twitterId);
  }

  async getUserByGoogleId(googleId: string): Promise<schema.User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(user: schema.InsertUser): Promise<schema.User> {
    if (user.password && !user.password.startsWith("$2b$")) {
      user.password = await bcrypt.hash(user.password, 10);
    }

    // Use provided ID from Supabase
    const userId = user.id || `user_${this.userIdCounter++}`;
    console.log("Creating user with ID:", userId);
    
    const now = new Date();
    const newUser: schema.User = {
      id: userId,
      username: user.username,
      email: user.email,
      password: user.password || null,
      role: user.role || "user",
      plan: user.plan || "free",
      streamTimeRemaining: user.streamTimeRemaining || 60,
      createdAt: now,
      updatedAt: now,
      blocked: user.blocked !== undefined ? user.blocked : false,
      emailVerified: user.emailVerified !== undefined ? user.emailVerified : false,
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      avatarUrl: user.avatarUrl || null,
      twitterHandle: user.twitterHandle || null,
      twitterToken: null,
      twitterTokenSecret: null,
      googleId: user.googleId || null,
      twitterId: user.twitterId || null,
    };

    this.users.set(userId, newUser);
    
    // Create a free subscription
    await this.createSubscription({
      userId: userId,
      planId: "free",
      streamTimeRemaining: 15, // 15 minutes
      status: "active",
      autoRenew: true,
    });

    return newUser;
  }

  async updateUser(id: string, data: Partial<schema.User>): Promise<schema.User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    if (data.password && !data.password.startsWith("$2b$")) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: string, data: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<schema.User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async listUsers(options?: { limit?: number, offset?: number }): Promise<schema.User[]> {
    const users = Array.from(this.users.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (options?.offset && options?.limit) {
      return users.slice(options.offset, options.offset + options.limit);
    }
    
    if (options?.offset) {
      return users.slice(options.offset);
    }
    
    if (options?.limit) {
      return users.slice(0, options.limit);
    }
    
    return users;
  }

  // Subscription operations
  async getSubscription(userId: string): Promise<schema.UserSubscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      sub => sub.userId === userId && sub.status === "active"
    );
  }

  async createSubscription(subscription: schema.InsertUserSubscription): Promise<schema.UserSubscription> {
    // Cancel any existing subscriptions
    for (const [id, sub] of this.subscriptions.entries()) {
      if (sub.userId === subscription.userId && sub.status === "active") {
        this.subscriptions.set(id, {
          ...sub,
          status: "cancelled",
          updatedAt: new Date(),
        });
      }
    }

    const id = this.subscriptionIdCounter++;
    const now = new Date();
    const newSubscription: schema.UserSubscription = {
      id,
      ...subscription,
      startDate: now,
      endDate: undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(userId: string, data: Partial<schema.UserSubscription>): Promise<schema.UserSubscription | undefined> {
    const subscription = Array.from(this.subscriptions.values()).find(
      sub => sub.userId === userId && sub.status === "active"
    );
    
    if (!subscription) return undefined;

    const updatedSubscription = {
      ...subscription,
      ...data,
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscription.id, updatedSubscription);
    return updatedSubscription;
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    const subscription = Array.from(this.subscriptions.values()).find(
      sub => sub.userId === userId && sub.status === "active"
    );
    
    if (!subscription) return false;

    const updatedSubscription = {
      ...subscription,
      status: "cancelled",
      autoRenew: false,
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscription.id, updatedSubscription);
    return true;
  }

  // Add-on operations
  async getUserAddOns(userId: string): Promise<schema.UserAddOn[]> {
    return Array.from(this.userAddOns.values()).filter(
      addon => addon.userId === userId && addon.status === "active"
    );
  }

  async purchaseAddOn(userAddOn: schema.InsertUserAddOn): Promise<schema.UserAddOn> {
    const id = this.userAddOnIdCounter++;
    const now = new Date();
    const newUserAddOn: schema.UserAddOn = {
      id,
      ...userAddOn,
      createdAt: now,
      updatedAt: now,
    };

    this.userAddOns.set(id, newUserAddOn);
    
    // If this is a stream time add-on, update the user's subscription
    if (userAddOn.addonId === "stream_hours") {
      const subscription = await this.getSubscription(userAddOn.userId);
      if (subscription) {
        const updatedStreamTime = subscription.streamTimeRemaining + (10 * 60 * userAddOn.quantity);
        await this.updateSubscription(userAddOn.userId, {
          streamTimeRemaining: updatedStreamTime,
        });
      }
    }
    
    return newUserAddOn;
  }

  async useAddOn(id: number): Promise<schema.UserAddOn | undefined> {
    const userAddOn = this.userAddOns.get(id);
    if (!userAddOn) return undefined;

    const updatedUserAddOn = {
      ...userAddOn,
      status: "used",
      updatedAt: new Date(),
    };

    this.userAddOns.set(id, updatedUserAddOn);
    return updatedUserAddOn;
  }

  // Avatar operations
  async getAvatar(id: number): Promise<schema.Avatar | undefined> {
    return this.avatars.get(id);
  }

  async getUserAvatars(userId: string): Promise<schema.Avatar[]> {
    return Array.from(this.avatars.values())
      .filter(avatar => avatar.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAvatar(avatar: schema.InsertAvatar): Promise<schema.Avatar> {
    const id = this.avatarIdCounter++;
    const now = new Date();
    const newAvatar: schema.Avatar = {
      id,
      ...avatar,
      createdAt: now,
      updatedAt: now,
    };

    this.avatars.set(id, newAvatar);
    return newAvatar;
  }

  async updateAvatar(id: number, data: Partial<schema.Avatar>): Promise<schema.Avatar | undefined> {
    const avatar = this.avatars.get(id);
    if (!avatar) return undefined;

    const updatedAvatar = {
      ...avatar,
      ...data,
      updatedAt: new Date(),
    };

    this.avatars.set(id, updatedAvatar);
    return updatedAvatar;
  }

  async deleteAvatar(id: number): Promise<boolean> {
    return this.avatars.delete(id);
  }

  // Streaming operations
  async startStreamingSession(session: schema.InsertStreamingSession): Promise<schema.StreamingSession> {
    // Reduce user's streaming time
    const subscription = await this.getSubscription(session.userId);
    if (subscription && subscription.streamTimeRemaining > 0) {
      await this.updateSubscription(session.userId, {
        streamTimeRemaining: subscription.streamTimeRemaining,
      });
    }
    
    const id = this.streamingIdCounter++;
    const now = new Date();
    const newSession: schema.StreamingSession = {
      id,
      ...session,
      startTime: now,
      endTime: undefined,
      duration: undefined,
      viewers: 0,
      status: "active",
      metadata: undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.streamingSessions.set(id, newSession);
    return newSession;
  }

  async endStreamingSession(id: number, data: { endTime: Date, duration: number, viewers?: number }): Promise<schema.StreamingSession | undefined> {
    const session = this.streamingSessions.get(id);
    if (!session) return undefined;

    const updatedSession = {
      ...session,
      endTime: data.endTime,
      duration: data.duration,
      viewers: data.viewers || session.viewers,
      status: "ended",
      updatedAt: new Date(),
    };

    this.streamingSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getActiveStreamingSessions(): Promise<schema.StreamingSession[]> {
    return Array.from(this.streamingSessions.values())
      .filter(session => session.status === "active")
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async getUserStreamingHistory(userId: string, options?: { limit?: number, offset?: number }): Promise<schema.StreamingSession[]> {
    const sessions = Array.from(this.streamingSessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    if (options?.offset && options?.limit) {
      return sessions.slice(options.offset, options.offset + options.limit);
    }
    
    if (options?.offset) {
      return sessions.slice(options.offset);
    }
    
    if (options?.limit) {
      return sessions.slice(0, options.limit);
    }
    
    return sessions;
  }

  // Admin operations
  async getSystemStats(timeRange: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<any> {
    // Mock data for system stats
    return {
      totalUsers: this.users.size,
      newUsers: Math.floor(this.users.size * 0.1),
      activeStreams: Array.from(this.streamingSessions.values()).filter(session => session.status === "active").length,
      avatarsGenerated: this.avatars.size,
      revenue: 5000,
      userGrowth: 15,
      avatarGrowth: 25,
      revenueGrowth: 10,
      subscriptionDistribution: [
        { name: "free", value: 50 },
        { name: "reply_guy", value: 20 },
        { name: "spartan", value: 15 },
        { name: "zeus", value: 10 },
        { name: "goat", value: 5 },
      ],
    };
  }

  async logSystemEvent(log: schema.InsertSystemLog): Promise<schema.SystemLog> {
    const id = this.systemLogIdCounter++;
    const now = new Date();
    const newLog: schema.SystemLog = {
      id,
      ...log,
      createdAt: now,
    };

    this.systemLogs.set(id, newLog);
    return newLog;
  }

  async logGpuUsage(log: schema.InsertGpuUsageLog): Promise<schema.GpuUsageLog> {
    const id = this.gpuUsageLogIdCounter++;
    const now = new Date();
    const newLog: schema.GpuUsageLog = {
      id,
      ...log,
      createdAt: now,
    };

    this.gpuUsageLogs.set(id, newLog);
    return newLog;
  }

  async blockUser(userId: string, blocked: boolean): Promise<schema.User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      blocked,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Subscription Plan operations for MemStorage
  async listSubscriptionPlans(): Promise<any[]> {
    // Return hardcoded subscription plans for memory storage
    return [
      {
        id: "free",
        name: "Free",
        description: "Basic avatar streaming",
        price: 0,
        streamMinutesPerWeek: 300,
        avatarMaxCount: 1,
        maxConcurrentStreams: 1,
        maxResolution: "720p",
        marketplaceAccess: false,
        customAvatars: false,
        prioritySupport: false,
        xSpacesHosting: false,
        riggingStudioAccess: false,
        maxMorphPoints: 10,
        buddyInviteAccess: false,
        isPopular: false,
        isFree: true,
        isActive: true,
        isComingSoon: false,
        sortOrder: 1,
        autoRiggingEnabled: true,
        maxBones: 20,
        maxMorphTargets: 10,
        maxFileSizeMB: 25,
        trackingPrecision: 0.5,
        animationSmoothness: 0.5,
        animationResponsiveness: 0.5,
        faceTracking: true,
        bodyTracking: false,
        handTracking: false,
        fingerTracking: false,
        eyeTracking: false,
        expressionTracking: false,
        userCount: 0,
        monthlyRevenue: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  async createSubscriptionPlan(planData: schema.InsertSubscriptionPlan): Promise<schema.SubscriptionPlan> {
    const now = new Date();
    const newPlan: schema.SubscriptionPlan = {
      ...planData,
      userCount: 0,
      monthlyRevenue: 0,
      createdAt: now,
      updatedAt: now,
    } as schema.SubscriptionPlan;
    
    return newPlan;
  }

  async updateSubscriptionPlan(id: string, data: Partial<schema.SubscriptionPlan>): Promise<schema.SubscriptionPlan | undefined> {
    // For memory storage, just return updated data
    return { ...data, updatedAt: new Date() } as schema.SubscriptionPlan;
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    return true;
  }

  async getUsersBySubscriptionPlan(planId: string): Promise<any[]> {
    return Array.from(this.users.values()).filter(user => user.plan === planId);
  }

  async updateUserSubscriptionPlan(userId: string, planId: string): Promise<any> {
    return this.updateUser(userId, { plan: planId });
  }

  // Background management operations (stub implementations)
  async getAllBackgrounds(): Promise<schema.StreamBackground[]> {
    return [];
  }

  async getActiveBackgrounds(): Promise<schema.StreamBackground[]> {
    return [];
  }

  async getBackgroundsByCategory(category: string): Promise<schema.StreamBackground[]> {
    return [];
  }

  async createBackground(background: schema.InsertStreamBackground): Promise<schema.StreamBackground> {
    const now = new Date();
    return { ...background, id: 1, createdAt: now, updatedAt: now } as schema.StreamBackground;
  }

  async updateBackground(id: number, data: Partial<schema.StreamBackground>): Promise<schema.StreamBackground | undefined> {
    return { ...data, updatedAt: new Date() } as schema.StreamBackground;
  }

  async deleteBackground(id: number): Promise<boolean> {
    return true;
  }

  async getAllCategories(): Promise<schema.BackgroundCategory[]> {
    return [];
  }

  async createCategory(category: schema.InsertBackgroundCategory): Promise<schema.BackgroundCategory> {
    const now = new Date();
    return { ...category, id: 1, createdAt: now, updatedAt: now } as schema.BackgroundCategory;
  }
}

// Choose the appropriate storage implementation based on environment
export const storage: IStorage = process.env.DATABASE_URL 
  ? new DatabaseStorage()
  : new MemStorage();
