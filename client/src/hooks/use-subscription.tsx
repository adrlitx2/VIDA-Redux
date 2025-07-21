import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  features: string[];
  isFree?: boolean;
  stripePriceId?: string;
  riggingStudioAccess?: boolean;
  customAvatars?: boolean;
  maxMorphPoints?: number;
  prioritySupport?: boolean;
};

interface SubscriptionContextType {
  plans: SubscriptionPlan[];
  currentPlan: SubscriptionPlan | null;
  isLoading: boolean;
  remainingStreamTime: number;
  subscribe: (planId: string) => Promise<string | null>; // returns checkout URL
  cancelSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  // Load subscription plans using React Query
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription/plans"],
    enabled: !isAuthLoading,
  });

  // Load stream time using React Query
  const { data: streamTimeData } = useQuery<{remainingMinutes: number}>({
    queryKey: ["/api/subscription/stream-time"],
    enabled: !isAuthLoading && !!user,
  });

  // Calculate derived values - prioritize Supabase user metadata plan
  const userPlan = user?.supabaseUser?.user_metadata?.plan || user?.plan;
  const currentPlan = userPlan ? plans.find((p: SubscriptionPlan) => p.id === userPlan) || null : plans.find((p: SubscriptionPlan) => p.isFree) || null;
  const remainingStreamTime = streamTimeData?.remainingMinutes || (currentPlan?.id === "free" ? 15 : currentPlan?.id === "reply-guy" ? 60 : currentPlan?.id === "spartan" ? 120 : currentPlan?.id === "zeus" ? 300 : currentPlan?.id === "goat" ? 999 : 0);
  const isLoading = isAuthLoading || plansLoading;
  
  // Function to subscribe to a plan
  const subscribe = async (planId: string): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to subscribe.",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      const plan = plans.find((p: SubscriptionPlan) => p.id === planId);
      if (!plan) {
        toast({
          title: "Error",
          description: "Invalid plan selected.",
          variant: "destructive",
        });
        return null;
      }
      
      return `/checkout?plan=${plan.id}&amount=${plan.price}`;
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again later.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  // Function to cancel subscription
  const cancelSubscription = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to manage your subscription.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      await apiRequest("POST", "/api/subscription/cancel");
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll still have access until the end of your billing period.",
      });
      return true;
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Function to refresh subscription data  
  const refreshSubscription = async (): Promise<void> => {
    // React Query handles refetching automatically
    // This is kept for API compatibility but does nothing
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plans,
        currentPlan,
        isLoading,
        remainingStreamTime,
        subscribe,
        cancelSubscription,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}