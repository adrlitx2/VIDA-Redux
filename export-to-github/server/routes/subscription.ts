import express from "express";
import { isAuthenticated } from "../routes";
import { storage } from "../storage";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil" as any,
});

const router = express.Router();

// Get subscription plans
router.get("/plans", async (req, res) => {
  try {
    // Mock plans for now - would come from database in production
    const plans = [
      {
        id: "free",
        name: "Free",
        price: 0,
        features: ["5 minutes streaming per month", "Basic avatar customization", "SD quality"],
        isFree: true
      },
      {
        id: "reply-guy",
        name: "Reply Guy",
        price: 5.99,
        features: ["1 hour streaming per month", "Advanced avatar customization", "HD quality"],
        stripePriceId: "price_reply_guy"
      },
      {
        id: "spartan",
        name: "Spartan",
        price: 9.99,
        features: ["5 hours streaming per month", "Premium avatar customization", "Full HD quality"],
        stripePriceId: "price_spartan"
      },
      {
        id: "zeus",
        name: "Zeus",
        price: 19.99,
        features: ["15 hours streaming per month", "Ultimate avatar customization", "4K quality", "Priority support"],
        stripePriceId: "price_zeus"
      },
      {
        id: "goat",
        name: "GOAT",
        price: 49.99,
        features: ["Unlimited streaming", "All avatar features", "8K quality", "Dedicated support", "Early access to new features"],
        stripePriceId: "price_goat"
      }
    ];
    
    res.json(plans);
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: "Error fetching subscription plans" });
  }
});

// Get current user's subscription
router.get("/current", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const subscription = await storage.getSubscription(userId);
    res.json(subscription || { plan: "free" });
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Error fetching subscription" });
  }
});

// Create a Stripe Checkout session for subscription
router.post("/create-checkout", isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    const user = req.user as any;
    
    // Create or get customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId: user.id.toString() }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await storage.updateUserStripeInfo(user.id, { 
        stripeCustomerId: customerId, 
        stripeSubscriptionId: '' 
      });
    }
    
    // Create subscription
    let priceId;
    switch (planId) {
      case "reply-guy":
        priceId = "price_reply_guy"; // These would be actual Stripe price IDs in production
        break;
      case "spartan":
        priceId = "price_spartan";
        break;
      case "zeus":
        priceId = "price_zeus";
        break;
      case "goat":
        priceId = "price_goat";
        break;
      default:
        return res.status(400).json({ message: "Invalid plan ID" });
    }
    
    // Create payment intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customerId,
      setup_future_usage: 'off_session',
      amount: getPlanPrice(planId) * 100, // Convert dollars to cents
      currency: 'usd',
      metadata: {
        userId: user.id.toString(),
        planId
      }
    });
    
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      customerId 
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: "Error creating checkout session" });
  }
});

// Create subscription
router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const { paymentIntentId, planId } = req.body;
    if (!paymentIntentId || !planId) {
      return res.status(400).json({ message: "Payment Intent ID and Plan ID are required" });
    }
    
    const user = req.user as any;
    
    // Verify payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: "Payment was not successful" });
    }
    
    // Create subscription record
    const subscription = await storage.createSubscription({
      userId: user.id,
      planId: planId,
      streamTimeRemaining: getPlanStreamingMinutes(planId),
      startDate: new Date(),
      endDate: getEndDate(planId),
      status: "active"
    });
    
    // Update user plan
    await storage.updateUser(user.id, { 
      plan: planId,
      streamTimeRemaining: getPlanStreamingMinutes(planId)
    });
    
    res.json(subscription);
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ message: "Error creating subscription" });
  }
});

// Cancel subscription
router.post("/cancel", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Cancel subscription
    const cancelled = await storage.cancelSubscription(user.id);
    if (!cancelled) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    
    // Update user plan to free
    await storage.updateUser(user.id, { plan: "free" });
    
    res.json({ message: "Subscription cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ message: "Error cancelling subscription" });
  }
});

// Helper function to get plan price
function getPlanPrice(planId: string): number {
  switch (planId) {
    case "reply-guy":
      return 5.99;
    case "spartan":
      return 9.99;
    case "zeus":
      return 19.99;
    case "goat":
      return 49.99;
    default:
      return 0;
  }
}

// Helper function to calculate subscription end date (30 days from now)
function getEndDate(planId: string): Date {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  return endDate;
}

// Helper function to get streaming minutes for each plan
function getPlanStreamingMinutes(planId: string): number {
  switch (planId) {
    case "reply-guy":
      return 60; // 1 hour in minutes
    case "spartan":
      return 300; // 5 hours in minutes
    case "zeus":
      return 900; // 15 hours in minutes
    case "goat":
      return 100000; // Practically unlimited
    default:
      return 5; // Free plan, 5 minutes
  }
}

export default router;