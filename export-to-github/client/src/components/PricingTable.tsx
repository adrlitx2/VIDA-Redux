import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Clock } from "lucide-react";
import ComingSoonModal from "@/components/ComingSoonModal";
import { apiRequest } from "@/lib/queryClient";

export function PricingTable() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [comingSoonModal, setComingSoonModal] = useState({
    isOpen: false,
    planName: "",
    missingFeatures: [] as string[]
  });
  const { subscribe, currentPlan } = useSubscription();
  const { toast } = useToast();

  // Fetch subscription plans from the database
  const { data: plans, isLoading, error } = useQuery({
    queryKey: ["/api/subscription/plans"],
    staleTime: 0, // Always fetch fresh data to reflect database changes
    gcTime: 0, // Don't cache data to ensure updates are visible
    queryFn: async () => {
      const response = await fetch("/api/subscription/plans", {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Subscription plans loaded with coming soon check:", data);
      console.log("Zeus plan specifically:", data.find((p: any) => p.id === 'zeus'));
      console.log("GOAT plan specifically:", data.find((p: any) => p.id === 'goat'));
      console.log("Plans with coming soon flag:", data.filter((p: any) => p.is_coming_soon));
      return data;
    },
  });

  // Fetch current user data to get their plan
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate missing features between current plan and target plan
  const calculateMissingFeatures = (currentPlanId: string, targetPlan: any) => {
    if (!plans) return [];
    const currentPlan = plans.find((p: any) => p.id === currentPlanId);
    if (!currentPlan || !targetPlan) return [];

    const missingFeatures = [];
    
    // Compare stream time
    if (targetPlan.stream_minutes_per_week > currentPlan.stream_minutes_per_week || targetPlan.stream_minutes_per_week === -1) {
      if (targetPlan.stream_minutes_per_week === -1) {
        missingFeatures.push("Unlimited streaming time");
      } else {
        missingFeatures.push(`${targetPlan.stream_minutes_per_week - currentPlan.stream_minutes_per_week} extra minutes/week streaming`);
      }
    }
    
    // Compare avatar count
    if (targetPlan.avatar_max_count > currentPlan.avatar_max_count || targetPlan.avatar_max_count === -1) {
      if (targetPlan.avatar_max_count === -1) {
        missingFeatures.push("Unlimited avatars");
      } else {
        missingFeatures.push(`${targetPlan.avatar_max_count - currentPlan.avatar_max_count} more avatar slots`);
      }
    }
    
    // Compare resolution
    const resolutionValues: Record<string, number> = { "720p": 1, "1080p": 2, "4K": 3 };
    if (resolutionValues[targetPlan.max_resolution] > resolutionValues[currentPlan.max_resolution]) {
      missingFeatures.push(`${targetPlan.max_resolution} streaming quality`);
    }
    
    // Check new features
    if (targetPlan.marketplace_access && !currentPlan.marketplace_access) {
      missingFeatures.push("Marketplace access");
    }
    if (targetPlan.custom_avatars && !currentPlan.custom_avatars) {
      missingFeatures.push("Custom avatar creation");
    }
    if (targetPlan.x_spaces_hosting && !currentPlan.x_spaces_hosting) {
      missingFeatures.push("X Spaces hosting");
    }
    if (targetPlan.rigging_studio_access && !currentPlan.rigging_studio_access) {
      missingFeatures.push("Rigging studio access");
    }
    if (targetPlan.priority_support && !currentPlan.priority_support) {
      missingFeatures.push("Priority support");
    }
    if (targetPlan.auto_rigging_enabled && !currentPlan.auto_rigging_enabled) {
      missingFeatures.push("Auto-rigging for custom avatars");
    }
    if (targetPlan.max_morph_points > currentPlan.max_morph_points) {
      missingFeatures.push(`${targetPlan.max_morph_points - currentPlan.max_morph_points} more morph points`);
    }
    
    return missingFeatures;
  };

  const handleSubscribe = async (planId: string) => {
    const plan = plans?.find((p: any) => p.id === planId);
    
    // Check if plan is coming soon
    if (plan?.is_coming_soon) {
      const userPlanId = currentUser?.plan || "free";
      const missingFeatures = calculateMissingFeatures(userPlanId, plan);
      setComingSoonModal({
        isOpen: true,
        planName: plan.name,
        missingFeatures
      });
      return;
    }

    if (currentPlan && currentPlan.id === planId) {
      toast({
        title: "Already subscribed",
        description: `You're already on the ${currentPlan.name} plan.`,
      });
      return;
    }

    const checkoutUrl = await subscribe(planId);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  const getMissingFeatures = (current: any, target: any): string[] => {
    const features: string[] = [];
    
    if (!current) return features;
    
    if (target.stream_minutes_per_week > current.stream_minutes_per_week) {
      features.push(`${target.stream_minutes_per_week - current.stream_minutes_per_week} more streaming minutes/week`);
    }
    if (target.avatar_max_count > current.avatar_max_count) {
      features.push(`${target.avatar_max_count - current.avatar_max_count} more avatars`);
    }
    if (target.marketplace_access && !current.marketplace_access) {
      features.push("Marketplace access");
    }
    if (target.custom_avatars && !current.custom_avatars) {
      features.push("Custom avatars");
    }
    if (target.x_spaces_hosting && !current.x_spaces_hosting) {
      features.push("X Spaces hosting");
    }
    if (target.rigging_studio_access && !current.rigging_studio_access) {
      features.push("Rigging studio access");
    }
    if (target.buddy_invite_access && !current.buddy_invite_access) {
      features.push("Buddy invite access");
    }
    
    return features;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !plans || !Array.isArray(plans)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load pricing plans. Please try again later.</p>
        {error && <p className="text-sm text-red-500 mt-2">Error: {error.message}</p>}
      </div>
    );
  }

  // Transform the database response to match frontend expectations and filter active plans
  const transformPlan = (plan: any) => ({
    ...plan,
    streamMinutesPerWeek: plan.stream_minutes_per_week,
    avatarMaxCount: plan.avatar_max_count,
    maxConcurrentStreams: plan.max_concurrent_streams,
    maxResolution: plan.max_resolution,
    marketplaceAccess: plan.marketplace_access,
    customAvatars: plan.custom_avatars,
    prioritySupport: plan.priority_support,
    xSpacesHosting: plan.x_spaces_hosting,
    riggingStudioAccess: plan.rigging_studio_access,
    maxMorphPoints: plan.max_morph_points,
    maxBones: plan.max_bones,
    maxFileSizeMB: plan.max_file_size_mb,
    autoRiggingEnabled: plan.auto_rigging_enabled,
    buddyInviteAccess: plan.buddy_invite_access,
    isPopular: plan.is_popular,
    isFree: plan.is_free,
    isActive: plan.is_active,
    sortOrder: plan.sort_order,
  });

  const activePlans = plans?.filter((plan: any) => plan.is_active)
    .map(transformPlan)
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder) || [];



  // Count popular plans to determine highlighting strategy
  const popularCount = activePlans.filter(plan => plan.isPopular).length;
  
  // Get plan pricing tiers for progressive visual incentives
  const getPlanTier = (plan: any, index: number) => {
    const totalPlans = activePlans.length;
    if (plan.isFree) return 'free';
    if (index >= totalPlans - 2) return 'premium'; // Top 2 most expensive
    if (index >= totalPlans - 3) return 'pro'; // Third most expensive
    return 'basic';
  };

  // Get plan styling based on tier and popularity
  const getPlanStyling = (plan: any, index: number) => {
    const tier = getPlanTier(plan, index);
    const isPopularUnique = plan.isPopular && popularCount === 1;
    
    switch (tier) {
      case 'premium':
        return {
          cardClass: "relative glass-card bg-gradient-to-br from-yellow-50/20 to-orange-50/20 dark:from-yellow-900/20 dark:to-orange-900/20 shadow-glow-lg border-0",
          badge: "BEST VALUE",
          badgeClass: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
          isHighlighted: true
        };
      case 'pro':
        return {
          cardClass: "relative glass-card bg-gradient-to-br from-blue-50/20 to-purple-50/20 dark:from-blue-900/20 dark:to-purple-900/20 shadow-glow-md border-0",
          badge: "POPULAR",
          badgeClass: "bg-gradient-to-r from-blue-400 to-purple-500 text-white",
          isHighlighted: true
        };
      case 'basic':
        return {
          cardClass: isPopularUnique ? "relative glass-card bg-green-50/20 dark:bg-green-900/20 shadow-glow-md border-0" : "relative glass-card shadow-glow-sm border-0",
          badge: isPopularUnique ? "POPULAR" : null,
          badgeClass: "bg-gradient-to-r from-green-400 to-emerald-500 text-white",
          isHighlighted: isPopularUnique
        };
      default: // free
        return {
          cardClass: "relative glass-card shadow-glow-sm border-0",
          badge: null,
          badgeClass: "",
          isHighlighted: false
        };
    }
  };

  return (
    <div className="w-full">
      {/* Pricing Toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-surface rounded-xl p-1 inline-flex">
          <button 
            className={`py-2 px-6 rounded-lg ${billingInterval === "monthly" 
              ? "bg-primary text-white font-medium" 
              : "text-gray-300 font-medium"}`}
            onClick={() => setBillingInterval("monthly")}
          >
            Monthly
          </button>
          <button 
            className={`py-2 px-6 rounded-lg ${billingInterval === "yearly" 
              ? "bg-primary text-white font-medium" 
              : "text-gray-300 font-medium"}`}
            onClick={() => setBillingInterval("yearly")}
          >
            Annual (Save 20%)
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {activePlans.map((plan: any, index: number) => {
          const planPrice = Number(plan.price) || 0;
          const price = billingInterval === "yearly" 
            ? Math.ceil(planPrice * 0.8 * 12 * 100) / 100 
            : planPrice;
            
          const isCurrentPlan = currentPlan?.id === plan.id;
          const styling = getPlanStyling(plan, index);
          
          return (
            <div 
              key={plan.id} 
              className={`glass-card rounded-2xl overflow-hidden ${styling.cardClass}`}
            >
              {(styling.badge || plan.is_coming_soon) && (
                <div className={`absolute top-0 right-0 left-0 text-white text-center text-sm py-1 flex items-center justify-center gap-1 ${
                  plan.is_coming_soon 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                    : styling.badgeClass
                }`}>
                  {plan.is_coming_soon ? (
                    <>
                      <Clock className="w-3 h-3" />
                      COMING SOON!
                    </>
                  ) : (
                    <>
                      <Star className="w-3 h-3" />
                      {styling.badge}
                    </>
                  )}
                </div>
              )}
              <div className={`p-6 ${(styling.badge || plan.is_coming_soon) ? "pt-10" : ""}`}>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-end">
                  <span className="text-4xl font-bold">${plan.isFree ? "0" : price.toFixed(2)}</span>
                  <span className="text-gray-400 ml-2">/{billingInterval === "yearly" ? "year" : "month"}</span>
                </div>
                {billingInterval === "yearly" && plan.price > 0 && (
                  <div className="mt-1 text-sm">
                    <span className="text-green-400">${(plan.price * 0.8).toFixed(0)}/mo</span>
                    <span className="text-green-500 ml-2"><strong>Save ${(plan.price * 0.2 * 12).toFixed(2)}/year</strong></span>
                  </div>
                )}
                <p className="mt-4 text-sm text-gray-300">
                  {plan.description}
                </p>
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`mt-6 w-full ${
                    plan.is_coming_soon
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      : isCurrentPlan 
                        ? "bg-green-600 hover:bg-green-700" 
                        : styling.isHighlighted 
                          ? "bg-primary text-white shadow-neon-purple hover:bg-primary-dark" 
                          : "bg-primary/20 text-white hover:bg-primary/30"
                  }`}
                  disabled={isCurrentPlan && !plan.is_coming_soon}
                >
                  {plan.is_coming_soon 
                    ? "Get Notified" 
                    : isCurrentPlan 
                      ? "Current Plan" 
                      : plan.isFree 
                        ? "Get Started" 
                        : "Subscribe"}
                </Button>
                
                {/* Features */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-primary" />
                    <span>
                      {plan.streamMinutesPerWeek === -1 ? "Unlimited" : `${plan.streamMinutesPerWeek} min/week`} streaming
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-primary" />
                    <span>
                      {plan.avatarMaxCount === -1 ? "Unlimited" : plan.avatarMaxCount} avatar{plan.avatarMaxCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Up to {plan.maxResolution} streaming</span>
                  </div>
                  {plan.marketplaceAccess && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Marketplace access</span>
                    </div>
                  )}
                  {plan.customAvatars && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Custom avatars</span>
                    </div>
                  )}
                  {plan.prioritySupport && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Priority support</span>
                    </div>
                  )}
                  {plan.xSpacesHosting && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>X Spaces hosting</span>
                    </div>
                  )}
                  {plan.riggingStudioAccess && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Rigging studio access</span>
                    </div>
                  )}
                  {plan.autoRiggingEnabled && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>🤖 Auto-rigging for custom avatars</span>
                    </div>
                  )}
                  {plan.maxMorphPoints > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{plan.maxMorphPoints} morph points</span>
                    </div>
                  )}
                  {plan.maxBones > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>{plan.maxBones} bones for rigging</span>
                    </div>
                  )}
                  {plan.maxFileSizeMB && plan.maxFileSizeMB > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Up to {plan.maxFileSizeMB}MB file uploads</span>
                    </div>
                  )}
                  {plan.buddyInviteAccess && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Buddy invite access</span>
                    </div>
                  )}
                  
                  {/* Preset avatar access for all plans */}
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-primary" />
                    <span>
                      10 preset avatars (select {plan.avatarMaxCount === -1 ? 'unlimited' : plan.avatarMaxCount})
                    </span>
                  </div>
                  
                  {/* Additional plan-specific features */}
                  {plan.id === 'free' && (
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Limited streaming time</span>
                    </div>
                  )}
                  
                  {plan.id === 'reply_guy' && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Enhanced avatar quality</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Priority support</span>
                      </div>
                    </>
                  )}
                  
                  {(plan.id === 'spartan' || plan.id === 'zeus' || plan.id === 'goat') && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Professional rigging quality</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Advanced animation features</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Extended streaming time</span>
                      </div>
                    </>
                  )}
                  
                  {plan.id === 'goat' && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Ultimate avatar experience</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Unlimited streaming</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={comingSoonModal.isOpen}
        onClose={() => setComingSoonModal(prev => ({ ...prev, isOpen: false }))}
        planName={comingSoonModal.planName}
        currentPlan={plans?.find((p: any) => p.id === (currentUser?.plan || "free"))?.name || "Free"}
        missingFeatures={comingSoonModal.missingFeatures}
      />
    </div>
  );
}

export default PricingTable;