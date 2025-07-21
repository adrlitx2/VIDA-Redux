import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { setupStripe } from "./services/stripe";
import { setupAvatarService } from "./services/avatar";
import * as supabaseAuth from "./auth/supabase";
import { createClient } from '@supabase/supabase-js';

// Create supabaseAdmin client for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Remove unused reference that was causing issues

// Import and set up routes
import authRoutes from "./routes/auth";

// Import other routes if they exist
let subscriptionRoutes: any;
let avatarRoutes: any;
let streamRoutes: any;
let adminRoutes: any;

// Skip dynamic imports for now - these are optional routes
console.warn("Subscription routes not available");
console.warn("Avatar routes not available"); 
console.warn("Stream routes not available");
console.warn("Admin routes not available");
console.warn("Subscription admin routes not available");

import { updateUserToSuperAdmin, updateUserSubscription } from "./routes/admin-functions";
import { updateUserRoleHandler, getUsersWithRolesHandler, createDefaultSuperadmin } from "./routes/admin-user-management";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session store
  const PgStore = connectPgSimple(session);
  
  // Create session store with database connection
  const sessionMiddleware = session({
    store: process.env.DATABASE_URL 
      ? new PgStore({
          conString: process.env.DATABASE_URL,
          createTableIfMissing: true,
        }) 
      : new MemoryStore({ 
          checkPeriod: 86400000 // 24 hours (prune expired entries)
        }),
    secret: process.env.SESSION_SECRET || "vida-streaming-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  });

  app.use(sessionMiddleware);

  // With Supabase, we don't need passport for authentication
  // We'll use Supabase's built-in auth features instead

  // Configure services
  const stripe = setupStripe();
  const avatarService = setupAvatarService();

  // API routes - prefix all routes with /api
  app.use("/api/auth", authRoutes);
  
  // Conditionally set up other API routes if they're available
  if (subscriptionRoutes) app.use("/api/subscription", subscriptionRoutes);
  if (avatarRoutes) app.use("/api/avatars", avatarRoutes);
  if (streamRoutes) app.use("/api/stream", streamRoutes);
  if (adminRoutes) app.use("/api/admin", adminRoutes);
  
  // Admin subscription management endpoint (priority routing)
  app.post("/api/admin/users/subscription", async (req, res) => {
    console.log('Subscription update request received:', req.body);
    
    try {
      const { userId, planId, status } = req.body;
      
      if (!userId || !planId) {
        console.log('Missing required fields:', { userId, planId });
        return res.status(400).json({ message: "User ID and plan ID are required" });
      }
      
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.log('Missing Supabase credentials');
        return res.status(500).json({ message: "Supabase credentials not configured" });
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Update user's subscription plan in database
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
          plan: planId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error updating user subscription:', error);
        return res.status(500).json({ message: "Failed to update subscription: " + error.message });
      }
      
      console.log('Subscription updated successfully:', updatedUser);
      return res.json({ 
        success: true, 
        message: `User subscription updated to ${planId}`,
        user: updatedUser 
      });
    } catch (error) {
      console.error("Admin subscription update error:", error);
      return res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Admin dashboard routes
  try {
    const adminDashboardRoutes = await import("./routes/admin-dashboard");
    
    // Dashboard stats and data
    app.get("/api/admin/dashboard/stats", isAuthenticated, adminDashboardRoutes.getDashboardStats);
    app.get("/api/admin/dashboard/users", isAuthenticated, adminDashboardRoutes.getUsers);
    // Direct admin users endpoint with proper Supabase connection
    app.get("/api/admin/users", async (req, res) => {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Missing Supabase credentials:', { 
            hasUrl: !!supabaseUrl, 
            hasKey: !!supabaseServiceKey 
          });
          return res.status(500).json({ message: "Supabase credentials not configured" });
        }
        
        console.log('Creating Supabase client...');
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        console.log('Querying auth users via admin API...');
        // Query the actual Supabase auth users using admin API
        const { data: authData, error } = await supabase.auth.admin.listUsers();
          
        if (error) {
          console.error('Supabase query error:', error);
          return res.status(500).json({ 
            message: "Database query failed", 
            error: error.message,
            details: error.details,
            hint: error.hint 
          });
        }
        
        const users = authData?.users || [];
        console.log('Auth users fetched successfully:', users.length);
        
        if (users.length === 0) {
          return res.json([]); // Return empty array if no users found
        }
        
        // Format auth users for admin dashboard
        const formattedUsers = users.map(user => ({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
          role: user.app_metadata?.roles?.[0] || 'user',
          plan: user.user_metadata?.plan || 'free',
          stream_time_remaining: user.user_metadata?.stream_time_remaining || 300,
          email_verified: user.email_confirmed_at ? true : false,
          blocked: user.banned_until ? true : false,
          created_at: user.created_at,
          updated_at: user.updated_at,
          dmca_complaint_count: 0,
          suspension_count: 0,
          current_suspension_type: null,
          suspension_end_date: null,
          suspension_reason: null,
          last_dmca_date: null,
          last_suspension_date: null,
          status: user.banned_until ? 'blocked' : 'active',
          lastLoginAt: user.last_sign_in_at || user.updated_at,
          subscription: {
            planId: user.user_metadata?.plan || 'free',
            status: 'active'
          }
        }));
        
        return res.json(formattedUsers);
      } catch (error) {
        console.error("Admin users error - full details:", error);
        return res.status(500).json({ 
          message: "Failed to fetch users", 
          error: error?.message || 'Unknown error' 
        });
      }
    });

    // Admin endpoint to update user role with hierarchy checks
    app.patch("/api/admin/users/:userId/role", isAuthenticated, async (req, res) => {
      try {
        const { userId } = req.params;
        const { role } = req.body;
        const currentUser = req.user;

        // Get current user's role from Supabase
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Check permissions
        const currentUserRoles = currentUser?.supabaseUser?.app_metadata?.roles || [];
        const isSuperAdmin = currentUserRoles.includes('superadmin');
        const isAdmin = currentUserRoles.includes('admin');

        if (role === 'superadmin' && !isSuperAdmin) {
          return res.status(403).json({ message: "Only superadmins can assign superadmin roles" });
        }

        if (role === 'admin' && !isSuperAdmin && !isAdmin) {
          return res.status(403).json({ message: "Insufficient permissions to assign admin roles" });
        }

        // Update user role in Supabase auth metadata
        const { data, error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: { roles: [role] }
        });

        if (error) {
          console.error('Error updating user role:', error);
          return res.status(500).json({ message: "Failed to update user role" });
        }

        // Also update in users table if needed
        await supabase
          .from('users')
          .update({ role })
          .eq('id', userId);

        res.json({ success: true, message: "User role updated successfully" });
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }
    });

    // Admin endpoint to update user status (block/unblock)
    app.patch("/api/admin/users/:userId/status", isAuthenticated, async (req, res) => {
      try {
        const { userId } = req.params;
        const { blocked } = req.body;
        
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Update user status in database
        const { error } = await supabase
          .from('users')
          .update({ blocked })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user status:', error);
          return res.status(500).json({ message: "Failed to update user status" });
        }

        res.json({ success: true, message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status" });
      }
    });

    // Middleware to handle Supabase JWT authentication for admin operations
    const supabaseAuth = async (req: any, res: any, next: any) => {
      try {
        console.log('Supabase auth middleware - checking request:', {
          method: req.method,
          url: req.url,
          hasAuthHeader: !!req.headers.authorization
        });

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          console.log('No auth token provided in request');
          return res.status(401).json({ message: "No auth token provided" });
        }

        const token = authHeader.substring(7);
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          console.log('Invalid auth token:', error);
          return res.status(401).json({ message: "Invalid auth token" });
        }

        // Check if user has admin privileges
        const userRoles = user.app_metadata?.roles || [];
        console.log('User roles:', userRoles);
        if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
          console.log('User lacks admin privileges');
          return res.status(403).json({ message: "Admin access required" });
        }

        console.log('Supabase auth successful for user:', user.email);
        req.user = user;
        next();
      } catch (error) {
        console.log('Authentication failed with error:', error);
        return res.status(401).json({ message: "Authentication failed" });
      }
    };

    // Admin endpoint to update user profile
    app.patch("/api/admin/users/:userId", supabaseAuth, async (req, res) => {
      try {
        const { userId } = req.params;
        const updateData = req.body;
        
        // Use the already imported createClient and supabaseAdmin
        const supabase = supabaseAdmin;

        // If updating role, update Supabase auth metadata
        if (updateData.role) {
          const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            app_metadata: { roles: [updateData.role] }
          });

          if (authError) {
            console.error('Error updating user auth metadata:', authError);
            return res.status(500).json({ message: "Failed to update user role" });
          }
        }

        // For other metadata updates, we can update user_metadata
        if (updateData.plan || updateData.stream_time_remaining) {
          const metadataUpdate: any = {};
          if (updateData.plan) metadataUpdate.plan = updateData.plan;
          if (updateData.stream_time_remaining) metadataUpdate.stream_time_remaining = updateData.stream_time_remaining;

          const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: metadataUpdate
          });

          if (metaError) {
            console.error('Error updating user metadata:', metaError);
            return res.status(500).json({ message: "Failed to update user metadata" });
          }
        }

        res.json({ success: true, message: "User updated successfully" });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    });

    // Admin endpoint to update user subscription - working version
    app.post("/api/admin/users/subscription", async (req, res) => {
      console.log('Subscription update request received:', req.body);
      
      try {
        const { userId, planId, status } = req.body;
        
        if (!userId || !planId) {
          console.log('Missing required fields:', { userId, planId });
          return res.status(400).json({ message: "User ID and plan ID are required" });
        }
        
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.log('Missing Supabase credentials');
          return res.status(500).json({ message: "Supabase credentials not configured" });
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Update user's subscription plan in database
        const { data: updatedUser, error } = await supabase
          .from('users')
          .update({ 
            plan: planId,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
          
        if (error) {
          console.error('Supabase error updating user subscription:', error);
          return res.status(500).json({ message: "Failed to update subscription: " + error.message });
        }
        
        console.log('Subscription updated successfully:', updatedUser);
        return res.json({ 
          success: true, 
          message: `User subscription updated to ${planId}`,
          user: updatedUser 
        });
      } catch (error) {
        console.error("Admin subscription update error:", error);
        return res.status(500).json({ message: "Failed to update subscription: " + error.message });
      }
    });
    app.get("/api/admin/dashboard/marketplace", isAuthenticated, adminDashboardRoutes.getMarketplaceItems);
    app.get("/api/admin/dashboard/subscriptions", isAuthenticated, adminDashboardRoutes.getSubscriptionPlans);
    app.get("/api/admin/dashboard/logs", isAuthenticated, adminDashboardRoutes.getSystemLogs);
    
    // User management actions
    app.post("/api/admin/dashboard/users/role", isAuthenticated, adminDashboardRoutes.updateUserRole);
    app.post("/api/admin/dashboard/users/status", isAuthenticated, adminDashboardRoutes.updateUserStatus);
    
    // Item management actions
    app.patch("/api/admin/dashboard/marketplace/:itemId", isAuthenticated, adminDashboardRoutes.updateMarketplaceItem);
    app.patch("/api/admin/dashboard/subscriptions/:planId", isAuthenticated, adminDashboardRoutes.updateSubscriptionPlan);
    
    console.log("Admin dashboard routes registered");
  } catch (error) {
    console.error("Admin dashboard routes not available:", error);
  }

  // Special admin functions
  app.post("/api/admin/promote-to-superadmin", updateUserToSuperAdmin);
  app.post("/api/admin/update-subscription", updateUserSubscription);
  
  // User role management with Supabase
  app.post("/api/admin/users/role", updateUserRoleHandler);
  app.get("/api/admin/users/all", getUsersWithRolesHandler);
  app.post("/api/admin/setup/superadmin", createDefaultSuperadmin);
  
  // Admin dashboard endpoints
  app.get("/api/admin/dashboard/users", isAuthenticated, async (req, res) => {
    try {
      // Fetch all users from our database with pagination
      const users = await storage.listUsers();
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.get("/api/admin/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      // Get system stats from our database
      const stats = await storage.getSystemStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  app.get("/api/admin/dashboard/marketplace", isAuthenticated, async (req, res) => {
    // This would fetch marketplace items from the database
    // For now return test data
    const marketplaceItems = [
      {
        id: "hat-001",
        name: "Neon Cyberpunk Cap",
        category: "hats",
        price: 2.99,
        sales: 342,
        revenue: 1022.58,
        featured: true,
        status: "active",
        createdAt: "2025-01-15T10:15:30Z"
      },
      {
        id: "glass-001",
        name: "Cyberpunk Shades",
        category: "glasses",
        price: 2.49,
        sales: 517,
        revenue: 1287.33,
        featured: true,
        status: "active",
        createdAt: "2025-01-20T14:30:22Z"
      },
      {
        id: "accessory-001",
        name: "Holographic Wings",
        category: "accessories",
        price: 5.99,
        sales: 623,
        revenue: 3731.77,
        featured: true,
        status: "active",
        createdAt: "2025-02-02T09:45:12Z"
      },
      {
        id: "bg-001",
        name: "Aurora Sky",
        category: "backgrounds",
        price: 3.99,
        sales: 489,
        revenue: 1951.11,
        featured: true,
        status: "active",
        createdAt: "2025-01-28T11:20:05Z"
      },
      {
        id: "animate-001",
        name: "Teleport Effect",
        category: "animations",
        price: 6.99,
        sales: 276,
        revenue: 1929.24,
        featured: false,
        status: "active",
        createdAt: "2025-02-10T16:33:44Z"
      }
    ];
    return res.status(200).json(marketplaceItems);
  });
  
  app.get("/api/admin/dashboard/subscriptions", isAuthenticated, async (req, res) => {
    // This would fetch subscription plans from the database
    // For now return test data
    const subscriptions = [
      {
        id: "free",
        name: "Free",
        price: 0,
        features: ["10 pre-rigged avatars", "15 min/week streaming", "Basic avatar controls"],
        users: 1248,
        revenue: 0,
        status: "active",
        conversionRate: 12.4
      },
      {
        id: "reply_guy",
        name: "Reply Guy",
        price: 20,
        features: ["1 custom avatar", "1 hour/week streaming", "Twitter Spaces emulator", "Basic avatar controls"],
        users: 325,
        revenue: 6500,
        status: "active",
        conversionRate: 9.2
      },
      {
        id: "spartan",
        name: "Spartan",
        price: 99,
        features: ["5 custom avatars", "20 hours/week streaming", "HD export", "Advanced rigging tools", "Priority support"],
        users: 198,
        revenue: 19602,
        status: "active",
        conversionRate: 4.3
      },
      {
        id: "zeus",
        name: "Zeus",
        price: 149,
        features: ["Unlimited avatars", "50 hours/week streaming", "1080p export", "AI lipsync preview", "Priority support"],
        users: 45,
        revenue: 6705,
        status: "active",
        conversionRate: 1.8
      },
      {
        id: "goat",
        name: "GOAT",
        price: 200,
        features: ["Everything in Zeus", "4K export", "Concurrent streams", "Animation studio access", "White-glove support"],
        users: 16,
        revenue: 3200,
        status: "active",
        conversionRate: 0.5
      }
    ];
    return res.status(200).json(subscriptions);
  });
  
  // Admin user management endpoints
  app.patch("/api/admin/users/:userId", isAuthenticated, async (req, res) => {
    try {
      console.log("PATCH /api/admin/users/:userId called");
      const { userId } = req.params;
      const { role, status } = req.body;
      console.log("Update request:", { userId, role, status });
      
      // Check if the user has proper permissions to make changes
      const currentUser = req.user;
      console.log("Current user claims:", currentUser?.claims?.app_metadata);
      const userRoles = currentUser?.claims?.app_metadata?.roles || [];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
      const isSuperAdmin = userRoles.includes('superadmin');
      console.log("Permission check:", { userRoles, isAdmin, isSuperAdmin });
      
      // Only allow superadmins to modify other admins
      if (role === 'admin' || role === 'superadmin') {
        if (!isSuperAdmin) {
          return res.status(403).json({ message: "Only superadmins can modify admin roles" });
        }
      }
      
      // Update the user in our database
      const updatedUser = await storage.updateUser(userId, {
        role,
        blocked: status === 'blocked'
      });
      
      // Also update the user's role in Supabase if we're using it
      try {
        const { supabase } = require("../auth/supabase");
        // Update user metadata in Supabase to include roles
        if (supabase) {
          const userMetadata = { roles: [role] };
          await supabase.auth.admin.updateUserById(userId, { user_metadata: userMetadata });
        }
      } catch (supabaseError) {
        console.log("Supabase role update error:", supabaseError);
        // Continue with our own database update even if Supabase update fails
      }
      
      return res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Implement a fallback subscription plans endpoint if the subscription routes aren't available
  if (!subscriptionRoutes) {
    app.get("/api/subscription/plans", (req, res) => {
      // Return some default subscription plans
      const defaultPlans = [
        {
          id: "free",
          name: "Free",
          price: 0,
          features: ["5 minutes of streaming per month", "Basic avatar creation", "720p streaming quality"],
          isFree: true
        },
        {
          id: "reply-guy",
          name: "Reply Guy",
          price: 999, // $9.99
          features: ["30 minutes of streaming per month", "Custom avatar creation", "720p streaming quality", "Basic voice modulation"],
          stripePriceId: "price_reply_guy"
        },
        {
          id: "spartan",
          name: "Spartan",
          price: 1999, // $19.99
          features: ["2 hours of streaming per month", "Premium avatar creation", "1080p streaming quality", "Voice modulation", "Custom backgrounds"],
          stripePriceId: "price_spartan"
        },
        {
          id: "zeus",
          name: "Zeus",
          price: 2999, // $29.99
          features: ["5 hours of streaming per month", "Premium avatar creation", "1080p streaming quality", "Voice modulation", "Custom backgrounds", "Priority support"],
          stripePriceId: "price_zeus"
        },
        {
          id: "goat",
          name: "GOAT",
          price: 4999, // $49.99
          features: ["Unlimited streaming", "Premium avatar creation", "4K streaming quality", "Advanced voice modulation", "Custom backgrounds", "Priority support", "Early access to new features"],
          stripePriceId: "price_goat"
        }
      ];
      res.json(defaultPlans);
    });
  }

  // Simple subscription management routes without auth for testing
  app.get("/api/subscription-management/plans", (req, res) => {
    const plans = [
      { id: "free", name: "Free", price: 0, userCount: 245, monthlyRevenue: 0 },
      { id: "reply-guy", name: "Reply Guy", price: 9.99, userCount: 89, monthlyRevenue: 889.11 },
      { id: "spartan", name: "Spartan", price: 29.99, userCount: 34, monthlyRevenue: 1019.66 },
      { id: "zeus", name: "Zeus", price: 99.99, userCount: 12, monthlyRevenue: 1199.88 },
      { id: "goat", name: "GOAT", price: 299.99, userCount: 3, monthlyRevenue: 899.97 }
    ];
    res.json(plans);
  });

  app.get("/api/subscription-management/analytics", (req, res) => {
    const analytics = {
      summary: {
        totalPlans: 5,
        totalUsers: 383,
        totalMonthlyRevenue: 4008.62,
        averageRevenuePerUser: 10.47
      },
      plans: [
        {
          planId: "free",
          planName: "Free",
          price: 0,
          userCount: 245,
          monthlyRevenue: 0,
          users: []
        },
        {
          planId: "reply-guy", 
          planName: "Reply Guy",
          price: 9.99,
          userCount: 89,
          monthlyRevenue: 889.11,
          users: []
        }
      ]
    };
    res.json(analytics);
  });

  // Create and return HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

// User authentication middleware with Supabase
export async function isAuthenticated(req: any, res: any, next: any) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // Check for token
    if (!token) {
      return res.status(401).json({ message: "No auth token provided" });
    }
    
    // Verify token with Supabase using service role client
    const { data, error } = await supabaseAuth.supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    // Get user data from our database
    const user = await storage.getUserById(data.user.id);
    
    // Set both Supabase user and our database user on request
    req.supabaseUser = data.user;
    req.user = user;
    
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Helper function to get user roles from Supabase user
function getUserRoles(user: any): string[] {
  return user?.app_metadata?.roles || [];
}

// Role-based authorization middleware
export function hasRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    
    if (!user) {
      // For development purposes, allow access
      if (process.env.NODE_ENV === 'development') {
        console.warn('Warning: No user but allowing access in development mode');
        return next();
      }
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }
    
    const userRoles = getUserRoles(user);
    
    // Check if user has any of the required roles
    if (roles.some(role => userRoles.includes(role))) {
      return next();
    }
    
    // For development purposes
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Warning: User lacks required role (${roles.join(', ')}) but allowing access in development mode`);
      return next();
    }
    
    res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
  };
}

// Admin authorization middleware
export const isAdmin = hasRole(["admin", "superadmin"]);

// SuperAdmin authorization middleware
export const isSuperAdmin = hasRole(["superadmin"]);
