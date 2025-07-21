import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import Footer from "@/components/Footer";

export default function SubscriptionSuccess() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const { user } = useAuth();
  const { currentPlan, refreshSubscription } = useSubscription();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  // Get plan ID from URL parameters
  const planId = searchParams.get('plan');

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const updateSubscription = async () => {
      try {
        setIsLoading(true);
        await refreshSubscription();
      } catch (error) {
        console.error("Error refreshing subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    updateSubscription();
  }, [user, refreshSubscription, setLocation]);

  const getFeaturesByPlan = () => {
    switch(planId) {
      case "reply-guy":
        return [
          "30 minutes of streaming time per month",
          "Basic avatar customization",
          "Standard tracking precision",
          "720p streaming quality"
        ];
      case "spartan":
        return [
          "120 minutes of streaming time per month",
          "Advanced avatar customization",
          "Enhanced tracking precision",
          "1080p streaming quality",
          "Priority support"
        ];
      case "zeus":
        return [
          "360 minutes of streaming time per month",
          "Full avatar customization",
          "Premium tracking precision",
          "1080p streaming quality",
          "Priority support",
          "Custom backgrounds"
        ];
      case "goat":
        return [
          "Unlimited streaming time",
          "Full avatar customization",
          "Ultra-precise tracking",
          "4K streaming quality",
          "Priority support",
          "Custom backgrounds",
          "API access for developers"
        ];
      default:
        return [
          "Basic features",
          "5 minutes of streaming per month"
        ];
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNavbar />

      <section className="py-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <div className="inline-block mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <i className="ri-check-line text-4xl text-green-500"></i>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Subscription <span className="text-primary">Successful!</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Thank you for subscribing to VIDA³. Your journey to amazing avatar streaming begins now!
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-surface/40 backdrop-blur-lg border-surface-light/20 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-primary to-blue-500"></div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <i className="ri-vip-crown-fill text-primary"></i>
                  {currentPlan?.name || "Premium"} Plan Activated
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Your Benefits:</h3>
                    <ul className="space-y-2">
                      {getFeaturesByPlan().map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <i className="ri-check-line text-primary mt-1 mr-3"></i>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-surface-light/10 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Next Steps:</h3>
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Create your custom avatar using our creator tools</li>
                      <li>Set up your streaming preferences</li>
                      <li>Go live and engage with your audience!</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-surface-light/5 border-t border-surface-light/10 flex justify-center gap-4 pt-6 pb-6">
                <Button asChild className="shadow-neon-purple">
                  <Link href="/avatars">Create Avatar</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/stream">Start Streaming</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}