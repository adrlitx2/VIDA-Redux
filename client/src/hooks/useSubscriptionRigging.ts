/**
 * React Hook for Subscription-Based Avatar Rigging
 * Automatically manages rigging configuration based on user's subscription plan
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { avatarRiggingService, type RiggingConfiguration } from '@/services/avatar-rigging-service';
import { useAuth } from '@/hooks/useAuth';

export function useSubscriptionRigging() {
  const { user } = useAuth();
  const [riggingConfig, setRiggingConfig] = useState<RiggingConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user's current subscription plan
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/stream-time'],
    enabled: !!user,
  });

  const userPlan = user?.plan || 'free';

  // Initialize and manage rigging configuration
  useEffect(() => {
    const initializeRigging = async () => {
      if (!userPlan) return;

      try {
        setIsLoading(true);
        await avatarRiggingService.initialize(userPlan);
        const config = avatarRiggingService.getCurrentConfig();
        setRiggingConfig(config);
      } catch (error) {
        console.error('Failed to initialize rigging configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRigging();

    // Subscribe to configuration changes
    const handleConfigChange = (config: RiggingConfiguration) => {
      setRiggingConfig(config);
    };

    avatarRiggingService.onConfigurationChange(handleConfigChange);

    return () => {
      avatarRiggingService.removeConfigurationListener(handleConfigChange);
    };
  }, [userPlan]);

  // Refresh configuration when subscription data changes
  useEffect(() => {
    if (subscriptionData && riggingConfig) {
      avatarRiggingService.refreshConfiguration();
    }
  }, [subscriptionData]);

  return {
    riggingConfig,
    isLoading,
    userPlan,
    
    // Convenience methods
    isFeatureEnabled: (feature: keyof RiggingConfiguration['enabledFeatures']) => 
      riggingConfig?.enabledFeatures[feature] || false,
    
    getBoneLimit: () => riggingConfig?.maxBones || 0,
    getMorphTargetLimit: () => riggingConfig?.maxMorphTargets || 0,
    getMorphPointsLimit: () => riggingConfig?.maxMorphPoints || 0,
    
    getAnimationQuality: () => ({
      precision: riggingConfig?.trackingPrecision || 0.1,
      smoothness: riggingConfig?.animationSmoothness || 0.1,
      responsiveness: riggingConfig?.animationResponsiveness || 0.1,
    }),
    
    canUploadCustomAvatar: () => riggingConfig?.customAvatarUpload || false,
    hasRiggingStudioAccess: () => riggingConfig?.riggingStudioAccess || false,
    
    // Manual refresh for admin updates
    refreshConfiguration: () => avatarRiggingService.refreshConfiguration(),
  };
}

export default useSubscriptionRigging;