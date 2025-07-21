/**
 * Avatar Rigging Service
 * Integrates subscription tier configurations with avatar animation and tracking systems
 */

import { getSubscriptionTierConfig, clearSubscriptionTierCache, type SubscriptionTierConfig } from './subscription-rigging-tiers';

export interface RiggingConfiguration {
  // Core rigging parameters
  maxBones: number;
  maxMorphTargets: number;
  maxMorphPoints: number;
  
  // Animation quality settings
  trackingPrecision: number;
  animationSmoothness: number;
  animationResponsiveness: number;
  
  // Tracking capabilities
  enabledFeatures: {
    faceTracking: boolean;
    bodyTracking: boolean;
    handTracking: boolean;
    fingerTracking: boolean;
    eyeTracking: boolean;
    expressionTracking: boolean;
  };
  
  // Performance settings
  maxFrameRate: number;
  processingPriority: number;
  
  // Avatar capabilities
  customAvatarUpload: boolean;
  riggingStudioAccess: boolean;
}

export class AvatarRiggingService {
  private currentConfig: RiggingConfiguration | null = null;
  private userPlan: string = 'free';
  private callbacks: Array<(config: RiggingConfiguration) => void> = [];

  /**
   * Initialize the rigging service with user's subscription plan
   */
  async initialize(userPlan: string): Promise<void> {
    this.userPlan = userPlan;
    await this.loadConfiguration();
  }

  /**
   * Load configuration from subscription tier settings
   */
  async loadConfiguration(): Promise<RiggingConfiguration> {
    try {
      const tierConfig = await getSubscriptionTierConfig(this.userPlan);
      
      this.currentConfig = {
        maxBones: tierConfig.maxBones,
        maxMorphTargets: tierConfig.maxMorphTargets,
        maxMorphPoints: tierConfig.maxMorphPoints,
        trackingPrecision: tierConfig.trackingPrecision,
        animationSmoothness: tierConfig.animationSmoothness,
        animationResponsiveness: tierConfig.animationResponsiveness,
        enabledFeatures: {
          faceTracking: tierConfig.features.faceTracking,
          bodyTracking: tierConfig.features.bodyTracking,
          handTracking: tierConfig.features.handTracking,
          fingerTracking: tierConfig.features.fingerTracking,
          eyeTracking: tierConfig.features.eyeTracking,
          expressionTracking: tierConfig.features.expressionTracking,
        },
        maxFrameRate: tierConfig.maxFrameRate,
        processingPriority: tierConfig.priorityLevel,
        customAvatarUpload: tierConfig.customAvatars,
        riggingStudioAccess: tierConfig.riggingStudioAccess,
      };

      // Notify all subscribers of configuration update
      this.notifyCallbacks();
      
      return this.currentConfig;
    } catch (error) {
      console.error('Failed to load rigging configuration:', error);
      throw error;
    }
  }

  /**
   * Get current rigging configuration
   */
  getCurrentConfig(): RiggingConfiguration | null {
    return this.currentConfig;
  }

  /**
   * Check if a specific tracking feature is enabled for the current plan
   */
  isFeatureEnabled(feature: keyof RiggingConfiguration['enabledFeatures']): boolean {
    return this.currentConfig?.enabledFeatures[feature] || false;
  }

  /**
   * Get bone count limit for current plan
   */
  getBoneLimit(): number {
    return this.currentConfig?.maxBones || 0;
  }

  /**
   * Get morph target limit for current plan
   */
  getMorphTargetLimit(): number {
    return this.currentConfig?.maxMorphTargets || 0;
  }

  /**
   * Get morph points limit for current plan
   */
  getMorphPointsLimit(): number {
    return this.currentConfig?.maxMorphPoints || 0;
  }

  /**
   * Get animation quality settings
   */
  getAnimationQuality(): {
    precision: number;
    smoothness: number;
    responsiveness: number;
  } {
    return {
      precision: this.currentConfig?.trackingPrecision || 0.1,
      smoothness: this.currentConfig?.animationSmoothness || 0.1,
      responsiveness: this.currentConfig?.animationResponsiveness || 0.1,
    };
  }

  /**
   * Get performance settings
   */
  getPerformanceSettings(): {
    maxFrameRate: number;
    priority: number;
  } {
    return {
      maxFrameRate: this.currentConfig?.maxFrameRate || 15,
      priority: this.currentConfig?.processingPriority || 1,
    };
  }

  /**
   * Check if custom avatar upload is allowed
   */
  canUploadCustomAvatar(): boolean {
    return this.currentConfig?.customAvatarUpload || false;
  }

  /**
   * Check if rigging studio access is available
   */
  hasRiggingStudioAccess(): boolean {
    return this.currentConfig?.riggingStudioAccess || false;
  }

  /**
   * Refresh configuration from database (useful after plan updates)
   */
  async refreshConfiguration(): Promise<void> {
    clearSubscriptionTierCache();
    await this.loadConfiguration();
  }

  /**
   * Subscribe to configuration changes
   */
  onConfigurationChange(callback: (config: RiggingConfiguration) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  removeConfigurationListener(callback: (config: RiggingConfiguration) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all subscribers of configuration changes
   */
  private notifyCallbacks(): void {
    if (this.currentConfig) {
      this.callbacks.forEach(callback => callback(this.currentConfig!));
    }
  }

  /**
   * Update user plan and reload configuration
   */
  async updateUserPlan(newPlan: string): Promise<void> {
    this.userPlan = newPlan;
    await this.refreshConfiguration();
  }

  /**
   * Apply rigging configuration to avatar system
   */
  applyToAvatarSystem(avatarSystem: any): void {
    if (!this.currentConfig) return;

    // Apply bone limitations
    if (avatarSystem.setBoneLimit) {
      avatarSystem.setBoneLimit(this.currentConfig.maxBones);
    }

    // Apply morph target limitations
    if (avatarSystem.setMorphTargetLimit) {
      avatarSystem.setMorphTargetLimit(this.currentConfig.maxMorphTargets);
    }

    // Apply morph points limitations
    if (avatarSystem.setMorphPointsLimit) {
      avatarSystem.setMorphPointsLimit(this.currentConfig.maxMorphPoints);
    }

    // Apply animation quality settings
    if (avatarSystem.setAnimationQuality) {
      avatarSystem.setAnimationQuality({
        precision: this.currentConfig.trackingPrecision,
        smoothness: this.currentConfig.animationSmoothness,
        responsiveness: this.currentConfig.animationResponsiveness,
      });
    }

    // Apply tracking feature settings
    if (avatarSystem.setTrackingFeatures) {
      avatarSystem.setTrackingFeatures(this.currentConfig.enabledFeatures);
    }

    // Apply performance settings
    if (avatarSystem.setPerformanceSettings) {
      avatarSystem.setPerformanceSettings({
        maxFrameRate: this.currentConfig.maxFrameRate,
        priority: this.currentConfig.processingPriority,
      });
    }
  }
}

// Create singleton instance
export const avatarRiggingService = new AvatarRiggingService();

// Export convenience functions for direct use
export async function initializeRiggingForUser(userPlan: string): Promise<RiggingConfiguration> {
  await avatarRiggingService.initialize(userPlan);
  return avatarRiggingService.getCurrentConfig()!;
}

export function isTrackingFeatureEnabled(feature: keyof RiggingConfiguration['enabledFeatures']): boolean {
  return avatarRiggingService.isFeatureEnabled(feature);
}

export function getRiggingLimits(): {
  bones: number;
  morphTargets: number;
  morphPoints: number;
} {
  return {
    bones: avatarRiggingService.getBoneLimit(),
    morphTargets: avatarRiggingService.getMorphTargetLimit(),
    morphPoints: avatarRiggingService.getMorphPointsLimit(),
  };
}

export function getAnimationQualitySettings(): {
  precision: number;
  smoothness: number;
  responsiveness: number;
} {
  return avatarRiggingService.getAnimationQuality();
}