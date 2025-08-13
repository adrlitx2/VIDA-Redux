import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Authentication middleware
async function isAuthenticated(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "No auth token provided" });
    }
    
    // Create a basic Supabase client for token verification
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ message: "Database configuration error" });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    req.supabaseUser = data.user;
    req.user = data.user;
    
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// REMOVED: Old /search endpoint that queried the custom users table
// See buddy-system.ts for the correct user search using Supabase Auth

export default router; 