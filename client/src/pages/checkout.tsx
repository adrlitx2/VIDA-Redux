import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import MobileNavbar from '@/components/MobileNavbar';
import Footer from '@/components/Footer';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ planId, amount }: { planId: string, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success?plan=${planId}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PaymentElement />
      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={!stripe || isLoading} className="w-full shadow-neon-purple">
          {isLoading ? "Processing..." : `Pay $${amount}`}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/pricing")} type="button">
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function Checkout() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [planDetails, setPlanDetails] = useState<{name: string, price: number, features: string[]} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Get plan ID and amount from URL parameters
  const planId = searchParams.get('plan');
  const amount = parseFloat(searchParams.get('amount') || "0");

  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to subscribe to a plan.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    if (!planId || !amount) {
      toast({
        title: "Invalid Request",
        description: "Missing plan information. Please select a plan from the pricing page.",
        variant: "destructive",
      });
      setLocation("/pricing");
      return;
    }

    // Fetch plan details
    const fetchPlanDetails = async () => {
      try {
        const response = await apiRequest("GET", `/api/subscription/plans/${planId}`);
        const data = await response.json();
        setPlanDetails(data);
      } catch (error) {
        console.error("Error fetching plan details:", error);
      }
    };

    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          planId, 
          amount: amount * 100 // Convert to cents for Stripe
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to create payment intent");
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to initialize checkout. Please try again.",
          variant: "destructive",
        });
        console.error("Error creating payment intent:", error);
        setLocation("/pricing");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanDetails();
    createPaymentIntent();
  }, [planId, amount, user, toast, setLocation]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNavbar />

      <div className="container max-w-4xl mx-auto py-20 px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Complete Your <span className="text-primary">Subscription</span></h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Summary */}
          <Card className="bg-surface/40 backdrop-blur-lg border-surface-light/20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Review your subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading || !planDetails ? (
                <>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-10 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-gray-400">Plan</div>
                    <div className="text-xl font-bold">{planDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Price</div>
                    <div className="text-xl font-bold">${amount}/month</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-2">What's included:</div>
                    <ul className="space-y-1">
                      {planDetails.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <i className="ri-check-line text-primary mt-1 mr-2"></i>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-surface-light/20 pt-4">
              <div className="text-sm text-gray-400">Billed monthly</div>
              <div className="font-bold">${amount}/month</div>
            </CardFooter>
          </Card>
          
          {/* Payment Form */}
          <Card className="bg-surface/40 backdrop-blur-lg border-surface-light/20">
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Secure payment via Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                  <CheckoutForm planId={planId || ""} amount={amount} />
                </Elements>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}