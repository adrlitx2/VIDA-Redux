import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CreditCard, Wallet, ArrowLeft } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
  };
  userEmail?: string;
}

export function PaymentModal({ open, onClose, selectedPlan, userEmail }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "crypto">("stripe");
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleStripePayment = async () => {
    setIsLoading(true);
    
    try {
      // Create Stripe checkout session
      const response = await fetch("/api/payments/create-stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment session");
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initialize Stripe payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCryptoPayment = async () => {
    setIsLoading(true);
    
    try {
      // Create Coinbase Commerce charge
      const response = await fetch("/api/payments/create-crypto-charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create crypto payment");
      }

      const { hosted_url } = await response.json();
      
      if (hosted_url) {
        window.location.href = hosted_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error: any) {
      toast({
        title: "Crypto Payment Failed",
        description: error.message || "Failed to initialize crypto payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="glass-card shadow-glow-md" hideCloseButton>
        <DialogHeader className="relative pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute left-0 top-0 h-8 w-8 p-0 hover:bg-background/20"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-purple-500 via-blue-400 to-green-300 bg-clip-text text-transparent pr-8">
            Complete Your Subscription
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm">
            Choose your preferred payment method for the {selectedPlan.name} plan
          </DialogDescription>
        </DialogHeader>

        {/* Plan Summary */}
        <Card className="glass-card shadow-glow-sm !border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">{selectedPlan.name}</CardTitle>
                <CardDescription className="text-sm">{selectedPlan.description}</CardDescription>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-bold">${selectedPlan.price}</div>
                <div className="text-muted-foreground text-sm">/month</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedPlan.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start text-sm">
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "stripe" | "crypto")}>
          <TabsList className="grid w-full grid-cols-2 bg-surface">
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Payment
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cryptocurrency
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stripe" className="space-y-4 mt-4">
            <Card className="glass-card shadow-glow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Secure Card Payment
                </CardTitle>
                <CardDescription className="text-sm">
                  Pay securely with your credit or debit card via Stripe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">Visa</Badge>
                  <Badge variant="outline" className="text-xs">Mastercard</Badge>
                  <Badge variant="outline" className="text-xs">Amex</Badge>
                  <Badge variant="outline" className="text-xs">PayPal</Badge>
                </div>
                <Button 
                  onClick={handleStripePayment}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {isLoading ? "Processing..." : `Pay $${selectedPlan.price}/month`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 mt-4">
            <Card className="glass-card shadow-glow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Cryptocurrency Payment
                </CardTitle>
                <CardDescription className="text-sm">
                  Pay with Bitcoin, Ethereum, and other cryptocurrencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">Bitcoin</Badge>
                  <Badge variant="outline" className="text-xs">Ethereum</Badge>
                  <Badge variant="outline" className="text-xs">USDC</Badge>
                  <Badge variant="outline" className="text-xs">USDT</Badge>
                </div>
                <Button 
                  onClick={handleCryptoPayment}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {isLoading ? "Processing..." : `Pay $${selectedPlan.price} in Crypto`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-muted-foreground mt-4">
          <p>Your subscription will automatically renew monthly. Cancel anytime from your account settings.</p>
          <p className="mt-1">All payments are processed securely and encrypted.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}