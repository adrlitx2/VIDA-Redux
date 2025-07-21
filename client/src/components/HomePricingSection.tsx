import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ComingSoonModal from "@/components/ComingSoonModal";
import { apiRequest } from "@/lib/queryClient";

export function HomePricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [comingSoonModal, setComingSoonModal] = useState({
    isOpen: false,
    planName: "",
    missingFeatures: [] as string[]
  });

  // Fetch subscription plans from the database
  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch current user data to get their plan
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform the database response to match frontend expectations
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
    isComingSoon: plan.is_coming_soon,
    sortOrder: plan.sort_order,
  });

  // Calculate missing features between current plan and target plan
  const calculateMissingFeatures = (currentPlanId: string, targetPlan: any) => {
    if (!plans) return [];
    const allPlans = plans.filter((plan: any) => plan.is_active).map(transformPlan);
    const currentPlan = allPlans.find((p: any) => p.id === currentPlanId);
    if (!currentPlan || !targetPlan) return [];

    const missingFeatures = [];
    
    // Compare stream time
    if (targetPlan.streamMinutesPerWeek > currentPlan.streamMinutesPerWeek || targetPlan.streamMinutesPerWeek === -1) {
      if (targetPlan.streamMinutesPerWeek === -1) {
        missingFeatures.push("Unlimited streaming time");
      } else {
        missingFeatures.push(`${targetPlan.streamMinutesPerWeek - currentPlan.streamMinutesPerWeek} extra minutes/week streaming`);
      }
    }
    
    // Compare avatar count
    if (targetPlan.avatarMaxCount > currentPlan.avatarMaxCount || targetPlan.avatarMaxCount === -1) {
      if (targetPlan.avatarMaxCount === -1) {
        missingFeatures.push("Unlimited avatars");
      } else {
        missingFeatures.push(`${targetPlan.avatarMaxCount - currentPlan.avatarMaxCount} more avatar slots`);
      }
    }
    
    // Compare resolution
    const resolutionValues = { "720p": 1, "1080p": 2, "4K": 3 };
    if (resolutionValues[targetPlan.maxResolution] > resolutionValues[currentPlan.maxResolution]) {
      missingFeatures.push(`${targetPlan.maxResolution} streaming quality`);
    }
    
    // Check new features
    if (targetPlan.marketplaceAccess && !currentPlan.marketplaceAccess) {
      missingFeatures.push("Marketplace access");
    }
    if (targetPlan.customAvatars && !currentPlan.customAvatars) {
      missingFeatures.push("Custom avatar creation");
    }
    if (targetPlan.xSpacesHosting && !currentPlan.xSpacesHosting) {
      missingFeatures.push("X Spaces hosting");
    }
    if (targetPlan.riggingStudioAccess && !currentPlan.riggingStudioAccess) {
      missingFeatures.push("Rigging studio access");
    }
    if (targetPlan.prioritySupport && !currentPlan.prioritySupport) {
      missingFeatures.push("Priority support");
    }
    if (targetPlan.maxMorphPoints > currentPlan.maxMorphPoints) {
      missingFeatures.push(`${targetPlan.maxMorphPoints - currentPlan.maxMorphPoints} more morph points`);
    }
    
    return missingFeatures;
  };

  // Process active plans data
  const allActivePlans = plans?.filter((plan: any) => plan.is_active)
    .map(transformPlan)
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder) || [];

  const handlePlanClick = (plan: any) => {
    if (plan.isComingSoon) {
      const userPlanId = currentUser?.plan || "free";
      const currentPlanData = allActivePlans.find((p: any) => p.id === userPlanId);
      const missingFeatures = calculateMissingFeatures(userPlanId, plan);
      
      setComingSoonModal({
        isOpen: true,
        planName: plan.name,
        missingFeatures
      });
      return;
    }
    // Navigate to pricing page for normal plans
    window.location.href = `/pricing?plan=${plan.id}`;
  };

  // Select featured plans for home display
  const freePlan = allActivePlans.find((plan: any) => plan.isFree);
  const premiumPlans = allActivePlans.filter((plan: any) => !plan.isFree).slice(-3); // Top 3 most expensive
  
  // Always include Reply Guy "for the culture" + free + top premium plans
  const replyGuyPlan = allActivePlans.find((plan: any) => plan.name.toLowerCase().includes('reply'));
  const otherPremiumPlans = allActivePlans.filter((plan: any) => !plan.isFree && !plan.name.toLowerCase().includes('reply')).slice(-2); // Top 2 most expensive
  
  // Combine free + Reply Guy + top premium plans
  const highlightedTiers = [
    ...(freePlan ? [freePlan] : []),
    ...(replyGuyPlan ? [replyGuyPlan] : []),
    ...otherPremiumPlans
  ].slice(0, 4);
    
  // Progressive visual styling for home page
  const getHomePlanStyling = (plan: any, index: number) => {
    if (plan.isFree) {
      return {
        cardClass: "relative border border-gray-300 dark:border-gray-600 bg-card/50 backdrop-blur-sm",
        badge: null,
        badgeClass: "",
        isHighlighted: false
      };
    }
    
    // Special styling for Reply Guy "for the culture"
    if (plan.name.toLowerCase().includes('reply')) {
      return {
        cardClass: "relative border-2 border-purple-400 shadow-[0_0_20px_rgba(128,0,255,0.4)] bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg",
        badge: "FOR THE CULTURE",
        badgeClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_10px_rgba(128,0,255,0.5)]",
        isHighlighted: true
      };
    }
    
    const nonFreeIndex = highlightedTiers.filter((p: any) => !p.isFree && !p.name.toLowerCase().includes('reply')).indexOf(plan);
    const totalNonFree = highlightedTiers.filter((p: any) => !p.isFree && !p.name.toLowerCase().includes('reply')).length;
    
    if (nonFreeIndex >= totalNonFree - 1) { // Most expensive
      return {
        cardClass: "relative border-2 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.4)] bg-gradient-to-br from-yellow-50/30 to-orange-50/30 dark:from-yellow-900/20 dark:to-orange-900/20 shadow-xl",
        badge: "BEST VALUE",
        badgeClass: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-[0_0_10px_rgba(255,255,0,0.5)]",
        isHighlighted: true
      };
    } else if (nonFreeIndex >= totalNonFree - 2) { // Second most expensive
      return {
        cardClass: "relative border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.4)] bg-gradient-to-br from-cyan-50/30 to-blue-50/30 dark:from-cyan-900/20 dark:to-blue-900/20 shadow-lg",
        badge: "POPULAR",
        badgeClass: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_10px_rgba(0,255,255,0.5)]",
        isHighlighted: true
      };
    } else if (nonFreeIndex >= totalNonFree - 3) { // Third most expensive
      return {
        cardClass: "relative border-2 border-emerald-400 shadow-[0_0_15px_rgba(0,255,128,0.3)] bg-gradient-to-br from-emerald-50/30 to-green-50/30 dark:from-emerald-900/20 dark:to-green-900/20 shadow-md",
        badge: "POPULAR",
        badgeClass: "bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-[0_0_10px_rgba(0,255,128,0.5)]",
        isHighlighted: true
      };
    } else {
      return {
        cardClass: "relative border border-border bg-card",
        badge: null,
        badgeClass: "",
        isHighlighted: false
      };
    }
  };
  
  return (
    <div className="w-full py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Find Your Perfect Plan
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the tier that fits your streaming needs, from casual creators to professional streamers
        </p>
      </div>
      
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
      
      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          highlightedTiers.map((plan: any, index: number) => {
            const price = billingInterval === "yearly" 
              ? (plan.price * 0.8 * 12) 
              : plan.price;
              
            const styling = getHomePlanStyling(plan, index);
            
            return (
              <div 
                key={plan.id} 
                className={`glass-card rounded-2xl overflow-hidden ${styling.cardClass}`}
              >
                {/* Coming Soon Badge */}
                {plan.isComingSoon && (
                  <div className="absolute top-0 right-0 left-0 text-center text-sm py-1 flex items-center justify-center gap-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_0_10px_rgba(128,0,255,0.5)]">
                    <Clock className="w-3 h-3" />
                    COMING SOON!
                  </div>
                )}
                {/* Regular Badge */}
                {!plan.isComingSoon && styling.badge && (
                  <div className={`absolute top-0 right-0 left-0 text-center text-sm py-1 flex items-center justify-center gap-1 ${styling.badgeClass}`}>
                    <Star className="w-3 h-3" />
                    {styling.badge}
                  </div>
                )}
                <div className={`p-6 ${(styling.badge || plan.isComingSoon) ? "pt-10" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    {plan.isComingSoon && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 flex items-end">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-gray-400 ml-2">/{billingInterval === "yearly" ? "year" : "month"}</span>
                  </div>
                  {billingInterval === "yearly" && plan.price > 0 && (
                    <div className="mt-1 text-sm">
                      <span className="text-green-400">${(plan.price * 0.8).toFixed(0)}/mo</span>
                      <span className="text-green-500 ml-2">Save ${(plan.price * 0.2).toFixed(0)}/mo</span>
                    </div>
                  )}
                  <p className="mt-4 text-sm text-gray-300">
                    {plan.description}
                  </p>
                  <Button
                    onClick={() => handlePlanClick(plan)}
                    className={`mt-6 w-full ${
                      plan.isComingSoon 
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-neon-purple"
                        : styling.isHighlighted 
                          ? "bg-primary text-white shadow-neon-purple hover:bg-primary-dark" 
                          : "bg-primary/20 text-white hover:bg-primary/30"
                    }`}
                  >
                    {plan.isComingSoon 
                      ? "Get Notified" 
                      : plan.price === 0 
                        ? "Get Started" 
                        : "Subscribe"
                    }
                    {plan.isComingSoon ? (
                      <Clock className="ml-2 h-4 w-4" />
                    ) : (
                      <ArrowRight className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Features - matching PricingTable structure */}
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
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* View All Plans CTA */}
      <div className="text-center mt-12">
        <Link href="/pricing">
          <Button variant="outline" size="lg" className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-white">
            View All Plans
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={comingSoonModal.isOpen}
        onClose={() => setComingSoonModal(prev => ({ ...prev, isOpen: false }))}
        planName={comingSoonModal.planName}
        currentPlan={allActivePlans.find(p => p.id === (currentUser?.plan || "free"))?.name || "Free"}
        missingFeatures={comingSoonModal.missingFeatures}
      />
    </div>
  );
}

export default HomePricingSection;