import Stripe from "stripe";
import { storage } from "../storage";

export function setupStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  // Initialize Stripe with API key
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil" as any,
  });

  return stripe;
}

// Create a checkout session for a subscription
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  userId: number
): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil" as any,
  });
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.APP_URL || "http://localhost:5000"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || "http://localhost:5000"}/pricing`,
    metadata: {
      userId: userId.toString(),
    },
  });

  return session;
}

// Create a checkout session for an add-on
export async function createAddonCheckout(
  customerId: string,
  priceId: string,
  userId: number,
  addonId: string,
  quantity: number = 1
): Promise<Stripe.Checkout.Session> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil" as any,
  });
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    mode: "payment",
    success_url: `${process.env.APP_URL || "http://localhost:5000"}/addons/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || "http://localhost:5000"}/addons`,
    metadata: {
      userId: userId.toString(),
      addonId,
      quantity: quantity.toString(),
    },
  });

  return session;
}

// Create a payment intent for one-time payments
export async function createPaymentIntent(
  customerId: string,
  amount: number,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil" as any,
  });
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency: "usd",
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

// Handle Stripe webhook events
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || "0");
        
        if (!userId) {
          console.error("Missing userId in session metadata");
          return;
        }
        
        // Handle subscription purchase
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await storage.updateUserStripeInfo(userId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string
          });
          
          // Log the event
          await storage.logSystemEvent({
            level: "info",
            type: "payment",
            service: "stripe",
            message: `New subscription created for user ${userId}`,
            details: { subscription },
            timestamp: new Date()
          });
        }
        
        // Handle add-on purchase
        if (session.mode === "payment" && session.metadata?.addonId) {
          const addonId = session.metadata.addonId;
          const quantity = parseInt(session.metadata.quantity || "1");
          
          await storage.purchaseAddOn({
            userId,
            addonId,
            quantity,
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          });
          
          // Log the event
          await storage.logSystemEvent({
            level: "info",
            type: "payment",
            service: "stripe",
            message: `Add-on purchased for user ${userId}`,
            details: { addonId, quantity },
            timestamp: new Date()
          });
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const customerId = invoice.customer as string;
        
        // Find user by stripe customer ID
        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error(`No user found with stripe customer ID: ${customerId}`);
          return;
        }
        
        // Update subscription in our database
        await storage.updateSubscription(user.id, {
          status: "active",
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Extend by 30 days
        });
        
        // Log the event
        await storage.logSystemEvent({
          level: "info",
          type: "payment",
          service: "stripe",
          message: `Subscription payment succeeded for user ${user.id}`,
          details: { subscription: subscriptionId },
          timestamp: new Date()
        });
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const customerId = invoice.customer as string;
        
        // Find user by stripe customer ID
        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error(`No user found with stripe customer ID: ${customerId}`);
          return;
        }
        
        // Update subscription in our database
        await storage.updateSubscription(user.id, {
          status: "payment_failed",
        });
        
        // Log the event
        await storage.logSystemEvent({
          level: "warning",
          type: "payment",
          service: "stripe",
          message: `Subscription payment failed for user ${user.id}`,
          details: { subscription: subscriptionId },
          timestamp: new Date()
        });
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find user by stripe customer ID
        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error(`No user found with stripe customer ID: ${customerId}`);
          return;
        }
        
        // Cancel subscription in our database
        await storage.cancelSubscription(user.id);
        
        // Update user plan to free
        await storage.updateUser(user.id, {
          plan: "free",
          streamTimeRemaining: 5 // Reset to free tier (5 minutes)
        });
        
        // Log the event
        await storage.logSystemEvent({
          level: "info",
          type: "subscription",
          service: "stripe",
          message: `Subscription cancelled for user ${user.id}`,
          details: { subscription: subscription.id },
          timestamp: new Date()
        });
        break;
      }
    }
  } catch (error: any) {
    console.error("Error handling Stripe webhook:", error);
    
    // Log the error
    await storage.logSystemEvent({
      level: "error",
      type: "payment",
      service: "stripe",
      message: `Error handling Stripe webhook: ${error.message}`,
      details: { event: event.type, error: error.message },
      timestamp: new Date()
    });
  }
}

// Helper function to find a user by Stripe customer ID
async function getUserByStripeCustomerId(customerId: string): Promise<{ id: number } | null> {
  // This would typically query the database
  // For this example, we'll use our storage interface
  
  // Get all users (this is inefficient but works for demo)
  const users = await storage.listUsers();
  const user = users.find(u => u.stripeCustomerId === customerId);
  
  return user || null;
}