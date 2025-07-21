/**
 * Automated Suspension System
 * Handles escalating suspension periods: 1 day, 3 days, 7 days, 14 days, 30 days, 180 days, permanent
 */
import { db } from "../db";
import { users, userSuspensions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Suspension levels and their durations in days
export const SUSPENSION_LEVELS = {
  1: { days: 1, label: "1 day" },
  2: { days: 3, label: "3 days" },
  3: { days: 7, label: "7 days" },
  4: { days: 14, label: "14 days" },
  5: { days: 30, label: "30 days" },
  6: { days: 180, label: "180 days" },
  7: { days: null, label: "permanent" }, // null = permanent
} as const;

/**
 * Automatically issue a suspension based on user's suspension history
 */
export async function issueAutomatedSuspension(
  userId: string,
  reason: string,
  issuedBy: string
): Promise<{ success: boolean; suspensionLevel: number; duration: string; autoReactivateAt?: Date }> {
  try {
    // Get user's current suspension count
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate next suspension level (max level 7 = permanent)
    const nextLevel = Math.min((user.suspensionCount || 0) + 1, 7);
    const suspensionConfig = SUSPENSION_LEVELS[nextLevel as keyof typeof SUSPENSION_LEVELS];
    
    // Calculate expiration date (null for permanent)
    let expiresAt: Date | null = null;
    let autoReactivateAt: Date | null = null;
    
    if (suspensionConfig.days !== null) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + suspensionConfig.days);
      autoReactivateAt = new Date(expiresAt);
    }

    // Create suspension record
    await db.insert(userSuspensions).values({
      userId,
      suspensionType: "automated",
      suspensionLevel: nextLevel,
      reason,
      description: `Automated suspension level ${nextLevel} (${suspensionConfig.label})`,
      issuedBy,
      expiresAt,
      isActive: true,
    });

    // Update user's suspension count and block status
    await db.update(users)
      .set({
        suspensionCount: nextLevel,
        blocked: true,
        currentSuspensionType: suspensionConfig.days === null ? "permanent" : `${suspensionConfig.days}day`,
        suspensionEndDate: expiresAt,
        suspensionReason: reason,
        lastSuspensionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`Automated suspension issued: User ${userId}, Level ${nextLevel} (${suspensionConfig.label})`);

    return {
      success: true,
      suspensionLevel: nextLevel,
      duration: suspensionConfig.label,
      autoReactivateAt: autoReactivateAt || undefined,
    };
  } catch (error) {
    console.error("Error issuing automated suspension:", error);
    return {
      success: false,
      suspensionLevel: 0,
      duration: "error",
    };
  }
}

/**
 * Check and process expired suspensions (to be called periodically)
 */
export async function processExpiredSuspensions(): Promise<{ reactivatedUsers: number; error?: string }> {
  try {
    const now = new Date();
    
    // Find users with expired suspensions that should be automatically reactivated
    const expiredSuspensions = await db
      .select({ userId: userSuspensions.userId })
      .from(userSuspensions)
      .where(
        and(
          eq(userSuspensions.isActive, true),
          eq(userSuspensions.suspensionType, "automated")
        )
      );

    let reactivatedCount = 0;

    for (const suspension of expiredSuspensions) {
      const [user] = await db.select().from(users).where(eq(users.id, suspension.userId));
      
      if (user && user.suspensionEndDate && user.suspensionEndDate <= now && user.blocked) {
        // Reactivate user
        await db.update(users)
          .set({
            blocked: false,
            currentSuspensionType: null,
            suspensionEndDate: null,
            suspensionReason: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, suspension.userId));

        // Mark suspension as inactive
        await db.update(userSuspensions)
          .set({
            isActive: false,
          })
          .where(
            and(
              eq(userSuspensions.userId, suspension.userId),
              eq(userSuspensions.isActive, true)
            )
          );

        reactivatedCount++;
        console.log(`Auto-reactivated user: ${suspension.userId}`);
      }
    }

    return { reactivatedUsers: reactivatedCount };
  } catch (error) {
    console.error("Error processing expired suspensions:", error);
    return { reactivatedUsers: 0, error: (error as Error).message };
  }
}

/**
 * Get user's suspension history and next level info
 */
export async function getUserSuspensionInfo(userId: string): Promise<{
  currentLevel: number;
  nextLevel: number;
  nextDuration: string;
  suspensionHistory: any[];
}> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const suspensionHistory = await db
      .select()
      .from(userSuspensions)
      .where(eq(userSuspensions.userId, userId));

    const currentLevel = user?.suspensionCount || 0;
    const nextLevel = Math.min(currentLevel + 1, 7);
    const nextDuration = SUSPENSION_LEVELS[nextLevel as keyof typeof SUSPENSION_LEVELS]?.label || "permanent";

    return {
      currentLevel,
      nextLevel,
      nextDuration,
      suspensionHistory,
    };
  } catch (error) {
    console.error("Error getting user suspension info:", error);
    return {
      currentLevel: 0,
      nextLevel: 1,
      nextDuration: "1 day",
      suspensionHistory: [],
    };
  }
}