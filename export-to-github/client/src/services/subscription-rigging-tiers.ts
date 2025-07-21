/**
 * Subscription Tier Configuration for Avatar Rigging and Animation
 * Dynamically fetches configuration from database subscription plans
 */

export interface SubscriptionTierConfig {
  // Core rigging limits
  maxBones: number;
  maxMorphTargets: number;
  maxMorphPoints: number;
  
  // Animation quality settings (0.1 to 1.0)
  trackingPrecision: number;      // Motion tracking accuracy
  animationSmoothness: number;    // Animation interpolation quality
  animationResponsiveness: number; // Real-time response speed
  
  // Feature availability
  features: {
    faceTracking: boolean;
    bodyTracking: boolean;
    handTracking: boolean;
    fingerTracking: boolean;
    eyeTracking: boolean;
    expressionTracking: boolean;
  };
  
  // Performance limits
  maxFrameRate: number;
  priorityLevel: number;
  customAvatars: boolean;
  riggingStudioAccess: boolean;
}

// Cache for subscription plan data
let planCache: { [key: string]: SubscriptionTierConfig } = {};
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch subscription plans from the database API
 */
async function fetchSubscriptionPlans(): Promise<{ [key: string]: SubscriptionTierConfig }> {
  try {
    const response = await fetch('/api/subscription/plans');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const plans = await response.json();
    
    const tierConfigs: { [key: string]: SubscriptionTierConfig } = {};
    
    plans.forEach((plan: any) => {
      // Map plan tier based on price for frame rate calculation
      let maxFrameRate = 15;
      let priorityLevel = 1;
      
      if (plan.price === 0) {
        maxFrameRate = 15;
        priorityLevel = 1;
      } else if (plan.price < 30) {
        maxFrameRate = 24;
        priorityLevel = 2;
      } else if (plan.price < 75) {
        maxFrameRate = 30;
        priorityLevel = 3;
      } else if (plan.price < 150) {
        maxFrameRate = 60;
        priorityLevel = 4;
      } else {
        maxFrameRate = 120;
        priorityLevel = 5;
      }
      
      tierConfigs[plan.id] = {
        maxBones: plan.maxBones || 0,
        maxMorphTargets: plan.maxMorphTargets || 0,
        maxMorphPoints: plan.maxMorphPoints || 0,
        trackingPrecision: plan.trackingPrecision || 0.1,
        animationSmoothness: plan.animationSmoothness || 0.1,
        animationResponsiveness: plan.animationResponsiveness || 0.1,
        features: {
          faceTracking: plan.faceTracking || false,
          bodyTracking: plan.bodyTracking || false,
          handTracking: plan.handTracking || false,
          fingerTracking: plan.fingerTracking || false,
          eyeTracking: plan.eyeTracking || false,
          expressionTracking: plan.expressionTracking || false,
        },
        maxFrameRate,
        priorityLevel,
        customAvatars: plan.customAvatars || false,
        riggingStudioAccess: plan.riggingStudioAccess || false,
      };
    });
    
    return tierConfigs;
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
    // Return fallback configuration
    return {
      free: {
        maxBones: 0,
        maxMorphTargets: 0,
        maxMorphPoints: 0,
        trackingPrecision: 0.1,
        animationSmoothness: 0.1,
        animationResponsiveness: 0.1,
        features: {
          faceTracking: false,
          bodyTracking: false,
          handTracking: false,
          fingerTracking: false,
          eyeTracking: false,
          expressionTracking: false,
        },
        maxFrameRate: 15,
        priorityLevel: 1,
        customAvatars: false,
        riggingStudioAccess: false,
      }
    };
  }
}

/**
 * Get subscription tier configuration by plan ID (with caching)
 */
export async function getSubscriptionTierConfig(planId: string): Promise<SubscriptionTierConfig> {
  const now = Date.now();
  
  // Check if cache is still valid
  if (now < cacheExpiry && Object.keys(planCache).length > 0) {
    return planCache[planId] || planCache.free;
  }
  
  // Fetch fresh data
  planCache = await fetchSubscriptionPlans();
  cacheExpiry = now + CACHE_DURATION;
  
  return planCache[planId] || planCache.free;
}

/**
 * Get all subscription tier configurations
 */
export async function getAllSubscriptionTierConfigs(): Promise<{ [key: string]: SubscriptionTierConfig }> {
  const now = Date.now();
  
  // Check if cache is still valid
  if (now < cacheExpiry && Object.keys(planCache).length > 0) {
    return planCache;
  }
  
  // Fetch fresh data
  planCache = await fetchSubscriptionPlans();
  cacheExpiry = now + CACHE_DURATION;
  
  return planCache;
}

/**
 * Clear the subscription tier cache (useful for admin updates)
 */
export function clearSubscriptionTierCache(): void {
  planCache = {};
  cacheExpiry = 0;
}