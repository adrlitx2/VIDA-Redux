/**
 * Server-side Subscription Tier Configuration for Avatar Rigging and Animation
 * Handles tier validation and configuration management
 */

export interface SubscriptionTierConfig {
  // Core rigging limits
  maxBones: number;
  maxMorphTargets: number;
  
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
}

export const SUBSCRIPTION_TIERS: { [key: string]: SubscriptionTierConfig } = {
  free: {
    maxBones: 9,
    maxMorphTargets: 5,
    trackingPrecision: 0.4,
    animationSmoothness: 0.3,
    animationResponsiveness: 0.5,
    features: {
      faceTracking: true,
      bodyTracking: false,
      handTracking: false,
      fingerTracking: false,
      eyeTracking: false,
      expressionTracking: false,
    },
    maxFrameRate: 15,
    priorityLevel: 1,
  },
  
  reply_guy: {
    maxBones: 15,
    maxMorphTargets: 12,
    trackingPrecision: 0.6,
    animationSmoothness: 0.5,
    animationResponsiveness: 0.7,
    features: {
      faceTracking: true,
      bodyTracking: true,
      handTracking: false,
      fingerTracking: false,
      eyeTracking: true,
      expressionTracking: true,
    },
    maxFrameRate: 24,
    priorityLevel: 2,
  },
  
  spartan: {
    maxBones: 25,
    maxMorphTargets: 20,
    trackingPrecision: 0.75,
    animationSmoothness: 0.7,
    animationResponsiveness: 0.8,
    features: {
      faceTracking: true,
      bodyTracking: true,
      handTracking: true,
      fingerTracking: false,
      eyeTracking: true,
      expressionTracking: true,
    },
    maxFrameRate: 30,
    priorityLevel: 3,
  },
  
  zeus: {
    maxBones: 45,
    maxMorphTargets: 35,
    trackingPrecision: 0.9,
    animationSmoothness: 0.85,
    animationResponsiveness: 0.9,
    features: {
      faceTracking: true,
      bodyTracking: true,
      handTracking: true,
      fingerTracking: true,
      eyeTracking: true,
      expressionTracking: true,
    },
    maxFrameRate: 60,
    priorityLevel: 4,
  },
  
  goat: {
    maxBones: 65,
    maxMorphTargets: 50,
    trackingPrecision: 1.0,
    animationSmoothness: 1.0,
    animationResponsiveness: 1.0,
    features: {
      faceTracking: true,
      bodyTracking: true,
      handTracking: true,
      fingerTracking: true,
      eyeTracking: true,
      expressionTracking: true,
    },
    maxFrameRate: 120,
    priorityLevel: 5,
  },
};

/**
 * Get subscription tier configuration by plan ID
 */
export function getSubscriptionTierConfig(planId: string): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[planId] || SUBSCRIPTION_TIERS.free;
}

/**
 * Validate tier configuration values
 */
export function validateTierConfig(config: Partial<SubscriptionTierConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxBones !== undefined) {
    if (config.maxBones < 1 || config.maxBones > 100) {
      errors.push('Max bones must be between 1 and 100');
    }
  }

  if (config.maxMorphTargets !== undefined) {
    if (config.maxMorphTargets < 1 || config.maxMorphTargets > 100) {
      errors.push('Max morph targets must be between 1 and 100');
    }
  }

  if (config.trackingPrecision !== undefined) {
    if (config.trackingPrecision < 0.1 || config.trackingPrecision > 1.0) {
      errors.push('Tracking precision must be between 0.1 and 1.0');
    }
  }

  if (config.animationSmoothness !== undefined) {
    if (config.animationSmoothness < 0.1 || config.animationSmoothness > 1.0) {
      errors.push('Animation smoothness must be between 0.1 and 1.0');
    }
  }

  if (config.animationResponsiveness !== undefined) {
    if (config.animationResponsiveness < 0.1 || config.animationResponsiveness > 1.0) {
      errors.push('Animation responsiveness must be between 0.1 and 1.0');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply subscription tier limits to animation settings
 */
export function applyTierLimits(userPlan: string, requestedSettings: any): any {
  const tierConfig = getSubscriptionTierConfig(userPlan);
  
  return {
    ...requestedSettings,
    maxBones: Math.min(requestedSettings.maxBones || tierConfig.maxBones, tierConfig.maxBones),
    maxMorphTargets: Math.min(requestedSettings.maxMorphTargets || tierConfig.maxMorphTargets, tierConfig.maxMorphTargets),
    trackingPrecision: Math.min(requestedSettings.trackingPrecision || tierConfig.trackingPrecision, tierConfig.trackingPrecision),
    animationSmoothness: Math.min(requestedSettings.animationSmoothness || tierConfig.animationSmoothness, tierConfig.animationSmoothness),
    animationResponsiveness: Math.min(requestedSettings.animationResponsiveness || tierConfig.animationResponsiveness, tierConfig.animationResponsiveness),
    features: {
      ...tierConfig.features,
      // Only allow features that are enabled for this tier
      faceTracking: requestedSettings.faceTracking && tierConfig.features.faceTracking,
      bodyTracking: requestedSettings.bodyTracking && tierConfig.features.bodyTracking,
      handTracking: requestedSettings.handTracking && tierConfig.features.handTracking,
      fingerTracking: requestedSettings.fingerTracking && tierConfig.features.fingerTracking,
      eyeTracking: requestedSettings.eyeTracking && tierConfig.features.eyeTracking,
      expressionTracking: requestedSettings.expressionTracking && tierConfig.features.expressionTracking,
    }
  };
}