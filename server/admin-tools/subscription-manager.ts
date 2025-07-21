import { storage } from '../storage';
import type { InsertSubscriptionPlan } from '@shared/schema';

// VIDA³ Subscription Plan Definitions
export const defaultSubscriptionPlans: InsertSubscriptionPlan[] = [
  {
    name: 'Free',
    description: 'Basic avatar creation and limited streaming',
    price: 0,
    duration: 'monthly',
    features: {
      streamTimeMinutes: 15,
      avatarSlots: 1,
      maxResolution: '720p',
      supportLevel: 'community',
      voicePacks: 0,
      customization: 'basic',
      marketplace: false
    },
    limits: {
      weeklyStreamTime: 15,
      monthlyStreamTime: 60,
      avatarStorage: 100, // MB
      concurrentStreams: 1
    },
    priority: 1,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null
  },
  {
    name: 'Reply Guy',
    description: 'Enhanced features for content creators',
    price: 9.99,
    duration: 'monthly',
    features: {
      streamTimeMinutes: 300,
      avatarSlots: 3,
      maxResolution: '1080p',
      supportLevel: 'email',
      voicePacks: 2,
      customization: 'advanced',
      marketplace: true
    },
    limits: {
      weeklyStreamTime: 300,
      monthlyStreamTime: 1200,
      avatarStorage: 500,
      concurrentStreams: 2
    },
    priority: 2,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null
  },
  {
    name: 'Spartan',
    description: 'Professional streaming with premium features',
    price: 29.99,
    duration: 'monthly',
    features: {
      streamTimeMinutes: 1000,
      avatarSlots: 10,
      maxResolution: '4K',
      supportLevel: 'priority',
      voicePacks: 5,
      customization: 'premium',
      marketplace: true
    },
    limits: {
      weeklyStreamTime: 1000,
      monthlyStreamTime: 4000,
      avatarStorage: 2000,
      concurrentStreams: 5
    },
    priority: 3,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null
  },
  {
    name: 'Zeus',
    description: 'Enterprise-level features for serious creators',
    price: 79.99,
    duration: 'monthly',
    features: {
      streamTimeMinutes: -1, // unlimited
      avatarSlots: 25,
      maxResolution: '4K',
      supportLevel: 'dedicated',
      voicePacks: 15,
      customization: 'enterprise',
      marketplace: true
    },
    limits: {
      weeklyStreamTime: -1,
      monthlyStreamTime: -1,
      avatarStorage: 10000,
      concurrentStreams: 10
    },
    priority: 4,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null
  },
  {
    name: 'GOAT',
    description: 'Ultimate plan with all features unlocked',
    price: 199.99,
    duration: 'monthly',
    features: {
      streamTimeMinutes: -1,
      avatarSlots: -1, // unlimited
      maxResolution: '8K',
      supportLevel: 'white-glove',
      voicePacks: -1,
      customization: 'unlimited',
      marketplace: true
    },
    limits: {
      weeklyStreamTime: -1,
      monthlyStreamTime: -1,
      avatarStorage: -1,
      concurrentStreams: -1
    },
    priority: 5,
    isActive: true,
    stripeProductId: null,
    stripePriceId: null
  }
];

/**
 * Initialize subscription plans in the database
 */
export async function initializeSubscriptionPlans(): Promise<{ success: boolean; plans: any[]; error?: string }> {
  try {
    const createdPlans = [];
    
    for (const planData of defaultSubscriptionPlans) {
      try {
        const existingPlans = await storage.listSubscriptionPlans();
        const planExists = existingPlans.find(p => p.name === planData.name);
        
        if (!planExists) {
          const newPlan = await storage.createSubscriptionPlan(planData);
          createdPlans.push(newPlan);
        }
      } catch (error) {
        console.error(`Error creating plan ${planData.name}:`, error);
      }
    }
    
    return {
      success: true,
      plans: createdPlans
    };
  } catch (error) {
    return {
      success: false,
      plans: [],
      error: error.message
    };
  }
}

/**
 * Migrate users from one plan to another
 */
export async function migrateUsersToNewPlan(
  fromPlanId: string, 
  toPlanId: string, 
  reason: string = 'Plan migration'
): Promise<{ success: boolean; migratedCount: number; errors: any[] }> {
  try {
    const usersOnOldPlan = await storage.getUsersBySubscriptionPlan(fromPlanId);
    const errors = [];
    let migratedCount = 0;
    
    for (const user of usersOnOldPlan) {
      try {
        await storage.updateUserSubscriptionPlan(user.id, toPlanId);
        
        // Log the migration
        await storage.logSystemEvent({
          level: 'info',
          message: `User migrated from plan ${fromPlanId} to ${toPlanId}`,
          source: 'subscription-manager',
          userId: user.id,
          metadata: { 
            fromPlanId,
            toPlanId,
            reason,
            migratedAt: new Date()
          }
        });
        
        migratedCount++;
      } catch (error) {
        errors.push({ userId: user.id, error: error.message });
      }
    }
    
    return {
      success: true,
      migratedCount,
      errors
    };
  } catch (error) {
    return {
      success: false,
      migratedCount: 0,
      errors: [{ error: error.message }]
    };
  }
}

/**
 * Update plan pricing across all tiers
 */
export async function updatePlanPricing(
  priceUpdates: Array<{ planId: string; newPrice: number; reason?: string }>
): Promise<{ success: boolean; updates: any[] }> {
  try {
    const updates = [];
    
    for (const update of priceUpdates) {
      try {
        const updatedPlan = await storage.updateSubscriptionPlan(update.planId, {
          price: update.newPrice,
          updatedAt: new Date()
        });
        
        if (updatedPlan) {
          updates.push({
            planId: update.planId,
            planName: updatedPlan.name,
            oldPrice: updatedPlan.price,
            newPrice: update.newPrice,
            success: true
          });
          
          // Log the price change
          await storage.logSystemEvent({
            level: 'info',
            message: `Plan pricing updated for ${updatedPlan.name}`,
            source: 'subscription-manager',
            metadata: {
              planId: update.planId,
              oldPrice: updatedPlan.price,
              newPrice: update.newPrice,
              reason: update.reason || 'Price adjustment'
            }
          });
        }
      } catch (error) {
        updates.push({
          planId: update.planId,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      updates
    };
  } catch (error) {
    return {
      success: false,
      updates: []
    };
  }
}