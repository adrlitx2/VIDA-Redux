import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { ScrollIndicator } from "@/components/ui/scroll-indicator";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  currentPlan?: string;
  missingFeatures: string[];
}

export default function ComingSoonModal({ 
  isOpen, 
  onClose, 
  planName, 
  currentPlan = "Free",
  missingFeatures 
}: ComingSoonModalProps) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const emailOptInMutation = useMutation({
    mutationFn: async (emailData: { email: string; planName: string }) => {
      return await apiRequest("POST", "/api/email-opt-in", emailData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `You'll be notified when ${planName} launches!`,
      });
      setEmail("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to sign up for updates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    emailOptInMutation.mutate({ email, planName });
  };

  const getUpgradeInfo = () => {
    if (missingFeatures.length === 0) return "";
    
    const featureList = missingFeatures.slice(0, 3).join(", ");
    const remaining = missingFeatures.length - 3;
    
    return `You'll automatically get ${featureList}${remaining > 0 ? ` and ${remaining} more features` : ""} when ${planName} launches.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50">
        <DialogHeader className="text-center pb-1 sm:pb-2">
          <DialogTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {planName} - Coming Soon!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            Be the first to know when this plan launches
          </DialogDescription>
        </DialogHeader>

        <ScrollIndicator>
          <div className="space-y-3 sm:space-y-4">
            {/* Current vs Coming Soon Plan */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Current Plan:</span>
                <span className="font-medium text-sm">{currentPlan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Upgrading to:</span>
                <span className="font-bold text-primary text-sm">{planName}</span>
              </div>
            </div>

            {/* Upgrade Benefits */}
            {missingFeatures.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-purple-400 text-xs sm:text-sm">What you'll get when {planName} launches:</h4>
                <ul className="space-y-1">
                  {missingFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2 text-xs">
                      <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
                      <span className="text-muted-foreground leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Email Opt-in Form */}
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 modal-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll notify you when {planName} becomes available
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  type="submit"
                  disabled={emailOptInMutation.isPending || !email}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {emailOptInMutation.isPending ? "Signing Up..." : "Notify Me"}
                </Button>
              </div>
            </form>
          </div>
        </ScrollIndicator>
      </DialogContent>
    </Dialog>
  );
}