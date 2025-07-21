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

// Import and set up routes
import authRoutes from "./routes/auth";

// Skip dynamic imports for now - these are optional routes
console.warn("Subscription routes not available");
console.warn("Avatar routes not available"); 
console.warn("Stream routes not available");
console.warn("Admin routes not available");
console.warn("Subscription admin routes not available");

import { updateUserToSuperAdmin, updateUserSubscription } from "./routes/admin-functions";
import { updateUserRoleHandler, getUsersWithRolesHandler, createDefaultSuperadmin } from "./routes/admin-user-management";

// Function to create session store
function createSessionStore() {
  if (process.env.DATABASE_URL) {
    const PgSession = connectPgSimple(session);
    return new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true
    });
  } else {
    const MemoryStoreSession = MemoryStore(session);
    return new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: createSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Set up other services
  setupStripe(app);
  setupAvatarService(app);

  // Auth routes
  app.use("/api/auth", authRoutes);

  // User authentication middleware with Supabase
  async function isAuthenticated(req: any, res: any, next: any) {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      // Check for token
      if (!token) {
        return res.status(401).json({ message: "No auth token provided" });
      }
      
      // Verify token with Supabase using service role client
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
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

  // Role-based authorization helpers
  function hasRole(roles: string[]) {
    return (req: any, res: any, next: any) => {
      const user = req.supabaseUser || req.user;
      const userRoles = getUserRoles(user);
      
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      next();
    };
  }

  const isAdmin = hasRole(["admin", "superadmin"]);
  const isSuperAdmin = hasRole(["superadmin"]);

  // Middleware to handle Supabase JWT authentication for admin operations
  const supabaseAuthMiddleware = async (req: any, res: any, next: any) => {
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
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
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

  // FIXED: Admin endpoint to update user profile - using ES modules only
  app.patch("/api/admin/users/:userId", supabaseAuthMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      console.log('Updating user:', userId, 'with data:', updateData);
      
      // Use the imported supabaseAdmin client directly
      // If updating role, update Supabase auth metadata
      if (updateData.role) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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

        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: metadataUpdate
        });

        if (metaError) {
          console.error('Error updating user metadata:', metaError);
          return res.status(500).json({ message: "Failed to update user metadata" });
        }
      }

      // Also update in our local database if needed
      try {
        const dbUpdateData: any = {};
        if (updateData.role) dbUpdateData.role = updateData.role;
        if (updateData.plan) dbUpdateData.plan = updateData.plan;
        if (updateData.stream_time_remaining) dbUpdateData.streamTimeRemaining = updateData.stream_time_remaining;
        
        if (Object.keys(dbUpdateData).length > 0) {
          await storage.updateUser(userId, dbUpdateData);
        }
      } catch (dbError) {
        console.error('Error updating local database:', dbError);
        // Don't fail the request if local DB update fails
      }

      res.json({ message: "User updated successfully" });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get all users with roles endpoint
  app.get("/api/admin/users", supabaseAuthMiddleware, async (req, res) => {
    try {
      const { data: supabaseUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: "Failed to fetch users" });
      }

      const usersWithRoles = supabaseUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'unknown',
        role: user.app_metadata?.roles?.[0] || 'user',
        plan: user.user_metadata?.plan || 'free',
        streamTimeRemaining: user.user_metadata?.stream_time_remaining || 0,
        emailVerified: user.email_confirmed_at ? true : false,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at
      }));

      res.json(usersWithRoles);
    } catch (error: any) {
      console.error('Error in get users endpoint:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Special admin functions
  app.post("/api/admin/promote-to-superadmin", updateUserToSuperAdmin);
  app.post("/api/admin/update-subscription", updateUserSubscription);

  // Basic endpoints
  app.get("/api/avatars", async (req, res) => {
    try {
      const avatars = await storage.getUserAvatars(req.user?.id || '');
      res.json(avatars);
    } catch (error) {
      console.error("Error fetching avatars:", error);
      res.status(500).json({ message: "Failed to fetch avatars" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}