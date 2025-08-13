import type { Express } from "express";
import { storage } from "../storage";
// Create middleware functions locally to avoid circular imports
const isAuthenticated = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "No auth token provided" });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin
    );
    
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    req.user = data.user;
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

const hasRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    const userRoles = user?.app_metadata?.roles || [];
    
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
};

const isAdmin = hasRole(["admin", "superadmin"]);
const isSuperAdmin = hasRole(["superadmin"]);
import { initializeSubscriptionPlans, migrateUsersToNewPlan, updatePlanPricing } from "../admin-tools/subscription-manager";

export function registerSubscriptionAdminRoutes(app: Express) {
  // Initialize database with default subscription plans
  app.post("/api/admin/init-subscription-plans", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const result = await initializeSubscriptionPlans();
      res.json(result);
    } catch (error) {
      console.error("Error initializing subscription plans:", error);
      res.status(500).json({ message: "Failed to initialize subscription plans" });
    }
  });

  // Get all subscription plans
  app.get("/api/admin/subscription-plans", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Create new subscription plan
  app.post("/api/admin/subscription-plans", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const planData = req.body;
      const newPlan = await storage.createSubscriptionPlan(planData);
      
      // Log the creation
      await storage.logSystemEvent({
        level: 'info',
        message: `New subscription plan created: ${newPlan.name}`,
        source: 'admin',
        userId: req.user?.claims?.sub,
        metadata: { 
          planId: newPlan.id,
          planName: newPlan.name,
          price: newPlan.price
        }
      });
      
      res.json(newPlan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update subscription plan
  app.put("/api/admin/subscription-plans/:planId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const planData = req.body;
      const updatedPlan = await storage.updateSubscriptionPlan(planId, planData);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Log the update (commented out until system_logs table is created)
      // await storage.logSystemEvent({
      //   level: 'info',
      //   message: `Subscription plan updated: ${updatedPlan.name}`,
      //   source: 'admin',
      //   userId: req.user?.claims?.sub,
      //   metadata: { 
      //     planId: updatedPlan.id,
      //     planName: updatedPlan.name,
      //     changes: planData
      //   }
      // });
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete subscription plan
  app.delete("/api/admin/subscription-plans/:planId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      
      // Check if any users are currently on this plan
      const usersOnPlan = await storage.getUsersBySubscriptionPlan(planId);
      
      if (usersOnPlan.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete plan with active subscribers", 
          activeUsers: usersOnPlan.length,
          users: usersOnPlan.map(u => ({ id: u.id, username: u.username, email: u.email }))
        });
      }
      
      const deleted = await storage.deleteSubscriptionPlan(planId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Log the deletion (commented out until system_logs table is created)
      // await storage.logSystemEvent({
      //   level: 'info',
      //   message: `Subscription plan deleted: ${planId}`,
      //   source: 'admin',
      //   userId: req.user?.claims?.sub,
      //   metadata: { planId }
      // });
      
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // Get users by subscription plan
  app.get("/api/admin/subscription-plans/:planId/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const users = await storage.getUsersBySubscriptionPlan(planId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by plan:", error);
      res.status(500).json({ message: "Failed to fetch users by plan" });
    }
  });

  // Bulk user subscription management - migrate all users from one plan to another
  app.post("/api/admin/users/bulk-migrate-subscription", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { fromPlanId, toPlanId, reason } = req.body;
      
      if (!fromPlanId || !toPlanId) {
        return res.status(400).json({ message: "Both fromPlanId and toPlanId are required" });
      }
      
      const result = await migrateUsersToNewPlan(fromPlanId, toPlanId, reason);
      
      // Log the bulk migration (commented out until system_logs table is created)
      // await storage.logSystemEvent({
      //   level: 'info',
      //   message: `Bulk user migration from ${fromPlanId} to ${toPlanId}`,
      //   source: 'admin',
      //   userId: req.user?.claims?.sub,
      //   metadata: { 
      //     fromPlanId,
      //     toPlanId,
      //     migratedCount: result.migratedCount,
      //     errors: result.errors,
      //     reason
      //   }
      // });
      
      res.json(result);
    } catch (error) {
      console.error("Error in bulk subscription migration:", error);
      res.status(500).json({ message: "Failed to migrate user subscriptions" });
    }
  });

  // Update individual user subscription
  app.put("/api/admin/users/:userId/subscription", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { planId, reason } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "planId is required" });
      }
      
      const updatedUser = await storage.updateUserSubscriptionPlan(userId, planId);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log the subscription change (commented out until system_logs table is created)
      // await storage.logSystemEvent({
      //   level: 'info',
      //   message: `Admin changed user subscription to ${planId}`,
      //   source: 'admin',
      //   userId: userId,
      //   metadata: { 
      //     adminUserId: req.user?.claims?.sub,
      //     newPlanId: planId,
      //     reason: reason || 'Admin update'
      //   }
      // });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user subscription:", error);
      res.status(500).json({ message: "Failed to update user subscription" });
    }
  });

  // Bulk pricing updates across multiple plans
  app.post("/api/admin/subscription-plans/bulk-update-pricing", isAuthenticated, isSuperAdmin, async (req, res) => {
    try {
      const { priceUpdates, reason } = req.body;
      
      if (!priceUpdates || !Array.isArray(priceUpdates)) {
        return res.status(400).json({ message: "priceUpdates array is required" });
      }
      
      const result = await updatePlanPricing(priceUpdates.map(update => ({
        ...update,
        reason
      })));
      
      // Log the bulk pricing update (commented out until system_logs table is created)
      // await storage.logSystemEvent({
      //   level: 'info',
      //   message: 'Bulk subscription plan pricing update',
      //   source: 'admin',
      //   userId: req.user?.claims?.sub,
      //   metadata: { 
      //     updates: result.updates,
      //     reason
      //   }
      // });
      
      res.json(result);
    } catch (error) {
      console.error("Error in bulk pricing update:", error);
      res.status(500).json({ message: "Failed to update subscription pricing" });
    }
  });

  // Get subscription analytics
  app.get("/api/admin/subscription-analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      const analytics = [];
      
      for (const plan of plans) {
        const users = await storage.getUsersBySubscriptionPlan(plan.id.toString());
        analytics.push({
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          userCount: users.length,
          monthlyRevenue: plan.price * users.length,
          users: users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            createdAt: u.createdAt
          }))
        });
      }
      
      const totalUsers = analytics.reduce((sum, plan) => sum + plan.userCount, 0);
      const totalRevenue = analytics.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
      
      res.json({
        plans: analytics,
        summary: {
          totalPlans: plans.length,
          totalUsers,
          totalMonthlyRevenue: totalRevenue,
          averageRevenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0
        }
      });
    } catch (error) {
      console.error("Error fetching subscription analytics:", error);
      res.status(500).json({ message: "Failed to fetch subscription analytics" });
    }
  });
}