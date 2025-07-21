import express from "express";
import * as supabaseAuth from "../auth/supabase";
import { storage } from "../storage";

const router = express.Router();

// Check if username is available
router.get("/check-username", async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ message: "Username parameter is required" });
    }
    
    const existingUser = await storage.getUserByUsername(username as string);
    
    if (existingUser) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    
    return res.status(200).json({ available: true });
  } catch (error: any) {
    console.error("Username check error:", error);
    return res.status(500).json({ message: "Failed to check username availability" });
  }
});

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const { id, email, username, password } = req.body;
    
    // If we already have a Supabase ID, just create the user in our database
    if (id) {
      // Check if user already exists in our database
      const existingUser = await storage.getUserById(id);
      
      if (existingUser) {
        return res.status(200).json({
          message: "User already exists",
          user: existingUser
        });
      }
      
      // Create user in our database
      const user = await storage.createUser({
        id,
        email,
        username,
        password: null, // We don't store passwords, Supabase handles auth
        role: 'user',
        plan: 'free',
        streamTimeRemaining: 60, // Give new users 60 minutes free
        twitterHandle: null,
        avatarUrl: null,
        emailVerified: false,
        blocked: false,
        twitterId: null,
        googleId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return res.status(201).json({
        message: "User registered successfully",
        user
      });
    } else {
      // Traditional registration flow using Supabase auth directly
      if (!email || !password || !username) {
        return res.status(400).json({ message: "Email, password, and username are required" });
      }
      
      const user = await supabaseAuth.signUp(email, password, username);
      
      return res.status(201).json({
        message: "User registered successfully",
        user
      });
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(400).json({ message: error.message || "Failed to register user" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    const user = await supabaseAuth.signIn(email, password);
    
    return res.status(200).json({
      message: "Login successful",
      user
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(401).json({ message: error.message || "Invalid credentials" });
  }
});

// Get current user (alias for /user endpoint)
router.get("/me", async (req, res) => {
  try {
    let user;
    
    // Check if we have a user ID in the query params (from frontend)
    if (req.query.id) {
      user = await storage.getUserById(req.query.id as string);
    } else {
      // Fall back to Supabase session
      user = await supabaseAuth.getUser();
    }
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    return res.status(200).json(user);
  } catch (error: any) {
    console.error("Get user error:", error);
    return res.status(401).json({ message: "Not authenticated" });
  }
});

// Get current user - main endpoint used by frontend
router.get("/user", async (req, res) => {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No valid authorization header" });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log("Authenticating token for /api/auth/user");
    
    // Verify the Supabase JWT token and get user using service role client
    const { data: supabaseUser, error } = await supabaseAuth.supabaseAdmin.auth.getUser(token);
    
    if (error || !supabaseUser.user) {
      console.error("Supabase auth error:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    console.log("Supabase user authenticated:", supabaseUser.user.id);
    
    // Use Supabase user data directly without PostgreSQL dependency
    const userWithMetadata = {
      id: supabaseUser.user.id,
      email: supabaseUser.user.email || '',
      username: supabaseUser.user.user_metadata?.username || supabaseUser.user.email?.split('@')[0] || 'user',
      role: supabaseUser.user.app_metadata?.roles?.[0] || 'user',
      plan: supabaseUser.user.user_metadata?.plan || 'free',
      streamTimeRemaining: supabaseUser.user.user_metadata?.stream_time_remaining || 60,
      avatarUrl: supabaseUser.user.user_metadata?.avatar_url || null,
      emailVerified: supabaseUser.user.email_confirmed_at ? true : false,
      createdAt: supabaseUser.user.created_at,
      updatedAt: new Date(),
      supabaseUser: supabaseUser.user,
      roles: supabaseUser.user.app_metadata?.roles || []
    };
    
    console.log("Returning user data:", { id: userWithMetadata.id, email: userWithMetadata.email, roles: userWithMetadata.roles });
    return res.status(200).json(userWithMetadata);
  } catch (error: any) {
    console.error("Get user error:", error);
    return res.status(500).json({ message: "Authentication failed", error: error.message });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  try {
    await supabaseAuth.signOut();
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Failed to logout" });
  }
});

// Google login
router.get("/google", async (req, res) => {
  try {
    const { url } = await supabaseAuth.signInWithGoogle();
    // Redirect user to the OAuth URL
    return res.redirect(url);
  } catch (error: any) {
    console.error("Google login error:", error);
    return res.status(500).json({ message: "Failed to initialize Google login" });
  }
});

// Twitter login
router.get("/twitter", async (req, res) => {
  try {
    const { url } = await supabaseAuth.signInWithTwitter();
    // Redirect user to the OAuth URL
    return res.redirect(url);
  } catch (error: any) {
    console.error("Twitter login error:", error);
    return res.status(500).json({ message: "Failed to initialize Twitter login" });
  }
});

// OAuth callback handler
router.get("/callback", async (req, res) => {
  try {
    await supabaseAuth.handleAuthCallback(req);
    // Redirect to the frontend after successful authentication
    return res.redirect("/");
  } catch (error: any) {
    console.error("Auth callback error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
});

export default router;