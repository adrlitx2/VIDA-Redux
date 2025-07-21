import { db } from "../db";
import { users, subscriptionPlans, subscriptionChanges, streamUsage, avatarUsage } from "../../shared/schema";
import { eq, and, gte, desc, sum } from "drizzle-orm";

/**
 * Subscription Management Service
 * Handles plan changes, limit enforcement, and usage tracking
 */

export interface PlanLimits {
  streamMinutesPerWeek: number;
  avatarMaxCount: number;
  maxConcurrentStreams: number;
  maxResolution: string;
  marketplaceAccess: boolean;
  customAvatars: boolean;
  prioritySupport: boolean;
}

export interface UsageCheck {
  canStream: boolean;
  canCreateAvatar: boolean;
  remainingStreamTime: number;
  currentAvatarCount: number;
  maxAvatars: number;
  message?: string;
}

/**
 * Change user subscription plan
 */
export async function changeUserPlan(
  userId: string,
  newPlanId: string,
  changedBy: string,
  reason?: string
): Promise<{ success: boolean; message: string; oldPlan?: string; newPlan?: string }> {
  try {
    // Get current user and plan data
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!currentUser) {
      return { success: false, message: "User not found" };
    }

    const [newPlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, newPlanId));
    if (!newPlan) {
      return { success: false, message: "Subscription plan not found" };
    }

    const oldPlanId = currentUser.subscriptionPlanId || 'free';

    // Log the subscription change
    await db.insert(subscriptionChanges).values({
      userId,
      oldPlanId,
      newPlanId,
      changeType: getChangeType(oldPlanId, newPlanId),
      changedBy,
      reason: reason || 'Admin change',
    });

    // Update user's subscription
    await db.update(users)
      .set({
        subscriptionPlanId: newPlanId,
        streamTimeRemaining: newPlan.streamMinutesPerWeek === -1 ? 9999 : newPlan.streamMinutesPerWeek,
        avatarMaxLimit: newPlan.avatarMaxCount === -1 ? 999 : newPlan.avatarMaxCount,
        weeklyStreamResetDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: `Successfully changed plan from ${oldPlanId} to ${newPlanId}`,
      oldPlan: oldPlanId,
      newPlan: newPlanId
    };
  } catch (error) {
    console.error('Error changing user plan:', error);
    return { success: false, message: 'Failed to change subscription plan' };
  }
}

/**
 * Check if user can perform actions based on plan limits
 */
export async function checkUserLimits(userId: string): Promise<UsageCheck> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return {
        canStream: false,
        canCreateAvatar: false,
        remainingStreamTime: 0,
        currentAvatarCount: 0,
        maxAvatars: 0,
        message: "User not found"
      };
    }

    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId || 'free'));
    if (!plan) {
      return {
        canStream: false,
        canCreateAvatar: false,
        remainingStreamTime: 0,
        currentAvatarCount: 0,
        maxAvatars: 0,
        message: "Plan not found"
      };
    }

    // Check if weekly reset is needed
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let streamTimeRemaining = user.streamTimeRemaining || 0;
    if (user.weeklyStreamResetDate && user.weeklyStreamResetDate < weekAgo) {
      streamTimeRemaining = plan.streamMinutesPerWeek === -1 ? 9999 : plan.streamMinutesPerWeek;
      await db.update(users)
        .set({
          streamTimeRemaining,
          weeklyStreamResetDate: new Date()
        })
        .where(eq(users.id, userId));
    }

    const currentAvatarCount = user.avatarCount || 0;
    const maxAvatars = plan.avatarMaxCount === -1 ? 999 : plan.avatarMaxCount;

    return {
      canStream: plan.streamMinutesPerWeek === -1 || streamTimeRemaining > 0,
      canCreateAvatar: plan.avatarMaxCount === -1 || currentAvatarCount < maxAvatars,
      remainingStreamTime: streamTimeRemaining,
      currentAvatarCount,
      maxAvatars,
    };
  } catch (error) {
    console.error('Error checking user limits:', error);
    return {
      canStream: false,
      canCreateAvatar: false,
      remainingStreamTime: 0,
      currentAvatarCount: 0,
      maxAvatars: 0,
      message: "Error checking limits"
    };
  }
}

/**
 * Record stream usage
 */
export async function recordStreamUsage(
  userId: string,
  durationMinutes: number
): Promise<{ success: boolean; remainingTime: number }> {
  try {
    const weekStart = getWeekStart(new Date());
    
    await db.insert(streamUsage).values({
      userId,
      durationMinutes,
      weekStartDate: weekStart,
    });

    // Update user's remaining stream time
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const newRemainingTime = Math.max(0, (user?.streamTimeRemaining || 0) - durationMinutes);
    
    await db.update(users)
      .set({ streamTimeRemaining: newRemainingTime })
      .where(eq(users.id, userId));

    return { success: true, remainingTime: newRemainingTime };
  } catch (error) {
    console.error('Error recording stream usage:', error);
    return { success: false, remainingTime: 0 };
  }
}

/**
 * Record avatar creation/deletion
 */
export async function recordAvatarAction(
  userId: string,
  avatarId: number,
  action: 'created' | 'deleted' | 'updated'
): Promise<{ success: boolean; currentCount: number }> {
  try {
    await db.insert(avatarUsage).values({
      userId,
      avatarId,
      actionType: action,
    });

    // Update user avatar count
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    let newCount = user?.avatarCount || 0;
    
    if (action === 'created') {
      newCount += 1;
    } else if (action === 'deleted') {
      newCount = Math.max(0, newCount - 1);
    }

    await db.update(users)
      .set({ avatarCount: newCount })
      .where(eq(users.id, userId));

    return { success: true, currentCount: newCount };
  } catch (error) {
    console.error('Error recording avatar action:', error);
    return { success: false, currentCount: 0 };
  }
}

/**
 * Get user's plan details and usage
 */
export async function getUserPlanDetails(userId: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId || 'free'));
    if (!plan) return null;

    const limits = await checkUserLimits(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        currentPlan: user.subscriptionPlanId,
        subscriptionStatus: user.subscriptionStatus,
        streamTimeRemaining: limits.remainingStreamTime,
        avatarCount: limits.currentAvatarCount,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        streamMinutesPerWeek: plan.streamMinutesPerWeek,
        avatarMaxCount: plan.avatarMaxCount,
        maxConcurrentStreams: plan.maxConcurrentStreams,
        maxResolution: plan.maxResolution,
        marketplaceAccess: plan.marketplaceAccess,
        customAvatars: plan.customAvatars,
        prioritySupport: plan.prioritySupport,
      },
      limits
    };
  } catch (error) {
    console.error('Error getting user plan details:', error);
    return null;
  }
}

/**
 * Reset weekly stream time for all users
 */
export async function resetWeeklyStreamTime(): Promise<{ success: boolean; usersReset: number }> {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const usersToReset = await db
      .select({ id: users.id, planId: users.subscriptionPlanId })
      .from(users)
      .where(gte(users.weeklyStreamResetDate, weekAgo));

    let resetCount = 0;
    for (const user of usersToReset) {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.planId || 'free'));
      if (plan) {
        const newStreamTime = plan.streamMinutesPerWeek === -1 ? 9999 : plan.streamMinutesPerWeek;
        await db.update(users)
          .set({
            streamTimeRemaining: newStreamTime,
            weeklyStreamResetDate: new Date()
          })
          .where(eq(users.id, user.id));
        resetCount++;
      }
    }

    return { success: true, usersReset: resetCount };
  } catch (error) {
    console.error('Error resetting weekly stream time:', error);
    return { success: false, usersReset: 0 };
  }
}

// Helper functions
function getChangeType(oldPlan: string, newPlan: string): string {
  const planHierarchy = { 'free': 0, 'reply-guy': 1, 'spartan': 2, 'zeus': 3, 'goat': 4 };
  const oldLevel = planHierarchy[oldPlan as keyof typeof planHierarchy] || 0;
  const newLevel = planHierarchy[newPlan as keyof typeof planHierarchy] || 0;
  
  if (newLevel > oldLevel) return 'upgrade';
  if (newLevel < oldLevel) return 'downgrade';
  return 'change';
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}