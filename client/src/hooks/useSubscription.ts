import { useQuery } from "@tanstack/react-query";
import type { SubscriptionPlan } from "@shared/schema";

export function useSubscription() {
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Find current plan based on user's plan ID
  const currentPlan = plans.find(plan => plan.id === (user as any)?.plan) || plans.find(plan => plan.id === 'free');

  return {
    plans,
    currentPlan,
    hasStudioAccess: currentPlan?.riggingStudioAccess || false,
    hasAutoRigging: currentPlan?.autoRiggingEnabled || false,
  };
}