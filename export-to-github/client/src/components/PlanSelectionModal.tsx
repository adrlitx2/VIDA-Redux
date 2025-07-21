import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PaymentModal } from "./PaymentModal";
import { supabase } from "@/lib/supabase";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for getting started",
    features: [
      "15 minutes streaming/week",
      "Basic avatar generation",
      "Standard quality",
      "Community support"
    ]
  },
  {
    id: "reply_guy",
    name: "Reply Guy",
    price: 9.99,
    description: "For casual creators",
    features: [
      "2 hours streaming/week",
      "HD avatar generation",
      "Custom backgrounds",
      "Priority support"
    ]
  },
  {
    id: "spartan",
    name: "Spartan",
    price: 29.99,
    description: "For serious streamers",
    popular: true,
    features: [
      "10 hours streaming/week",
      "4K avatar generation",
      "Advanced animations",
      "Real-time face tracking",
      "Custom emotes"
    ]
  },
  {
    id: "zeus",
    name: "Zeus",
    price: 79.99,
    description: "For professional creators",
    features: [
      "50 hours streaming/week",
      "Ultra HD generation",
      "Professional animations",
      "Multi-platform streaming",
      "Custom avatar store"
    ]
  },
  {
    id: "goat",
    name: "GOAT",
    price: 199.99,
    description: "For content empires",
    features: [
      "Unlimited streaming",
      "Enterprise features",
      "Custom integrations",
      "Dedicated support",
      "Revenue sharing program"
    ]
  }
];

interface PlanSelectionModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  registrationData?: {
    email: string;
    password: string;
    username: string;
  };
}

export function PlanSelectionModal({ open, onClose, userEmail, registrationData }: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  console.log('PlanSelectionModal render:', { open, userEmail });

  const handlePlanSelect = async (planId: string) => {
    setIsLoading(true);
    
    try {
      if (!registrationData) {
        throw new Error("Registration data is missing");
      }

      if (planId === "free") {
        // For free plan, complete registration immediately
        const { data, error } = await supabase.auth.signUp({
          email: registrationData.email,
          password: registrationData.password,
          options: {
            data: {
              username: registrationData.username
            },
            emailRedirectTo: undefined
          }
        });

        if (error) throw error;

        toast({
          title: "Welcome to VIDA³!",
          description: "Your free account has been created. Please check your email to verify your account.",
        });
        onClose();
        setLocation("/dashboard");
      } else {
        // For paid plans, show payment modal
        setShowPaymentModal(true);
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-blue-400 to-green-300 bg-clip-text text-transparent">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Select the perfect plan to start your avatar streaming journey
          </DialogDescription>
        </DialogHeader>

        <ScrollIndicator>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all duration-200 hover:scale-105 glass-card shadow-glow-sm ${
                  selectedPlan === plan.id && plan.popular ? "!border-[3px] !border-primary shadow-glow-md" :
                  selectedPlan === plan.id ? "!border !border-primary shadow-glow-md" :
                  plan.popular ? "!border-[3px] !border-primary/70" : ""
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground ml-1">/month</span>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <svg
                          className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => handlePlanSelect(selectedPlan)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              {isLoading ? "Processing..." : 
               selectedPlan === "free" ? "Start Free" : 
               `Get ${plans.find(p => p.id === selectedPlan)?.name}`}
            </Button>
          </div>
        </ScrollIndicator>
      </DialogContent>
      
      {/* Payment Modal for paid plans */}
      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            onClose();
          }}
          selectedPlan={plans.find(p => p.id === selectedPlan)!}
          userEmail={userEmail}
        />
      )}
    </Dialog>
  );
}