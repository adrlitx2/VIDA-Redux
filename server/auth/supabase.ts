import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';
import type { Provider } from '@supabase/supabase-js';

// Use the correct Supabase URL and keys
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create Supabase client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Register a new user with email and password
 */
export async function signUp(email: string, password: string, username: string) {
  // First check if username is already taken
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    throw new Error('Username is already taken');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('User registration failed');
  }

  // Create user in our database
  const newUser = await storage.createUser({
    id: data.user.id,
    email: data.user.email || '',
    username,
    password: null, // We don't store passwords, Supabase handles auth
    role: 'user',
    plan: 'free',
    streamTimeRemaining: 60, // Give new users 60 minutes free
    twitterHandle: null,
    avatarUrl: null,
    emailVerified: data.user.email_confirmed_at ? true : false,
    blocked: false,
    twitterId: null,
    googleId: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return newUser;
}

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Login failed');
  }

  // Get or create user in our database
  let user = await storage.getUserById(data.user.id);
  
  if (!user) {
    // Extract username from metadata or use email as fallback
    const username = data.user.user_metadata?.username || 
                     data.user.email?.split('@')[0] || 
                     `user_${Math.floor(Math.random() * 10000)}`;
                     
    user = await storage.createUser({
      id: data.user.id,
      email: data.user.email || '',
      username,
      password: null,
      role: 'user',
      plan: 'free',
      streamTimeRemaining: 60,
      twitterHandle: null,
      avatarUrl: null,
      emailVerified: data.user.email_confirmed_at ? true : false,
      blocked: false,
      twitterId: null,
      googleId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return user;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
  
  return true;
}

/**
 * Get the current authenticated user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Error getting user from Supabase:", error);
    return null;
  }
  
  if (!data.user) {
    return null;
  }
  
  // Try to get the user from our database
  let user = await storage.getUserById(data.user.id);
  
  // If user doesn't exist in our database but exists in Supabase, create them
  if (!user && data.user) {
    console.log("User exists in Supabase but not in our database, creating...");
    const username = data.user.user_metadata?.username || 
                    data.user.email?.split('@')[0] || 
                    `user_${Math.floor(Math.random() * 10000)}`;
    
    try {
      user = await storage.createUser({
        id: data.user.id,
        email: data.user.email || '',
        username,
        password: null, // We don't store passwords, Supabase handles auth
        role: 'user',
        plan: 'free',
        streamTimeRemaining: 60, // Give new users 60 minutes free
        twitterHandle: null,
        avatarUrl: null,
        emailVerified: !!data.user.email_confirmed_at,
        blocked: false,
        twitterId: null,
        googleId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Created new user in our database:", user.id);
    } catch (createError) {
      console.error("Error creating user in database:", createError);
    }
  }
  
  return user;
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.PUBLIC_URL || ''}/api/auth/callback`
    }
  });

  if (error) {
    throw error;
  }

  return { provider: 'google', url: data.url };
}

/**
 * Sign in with Twitter (X) OAuth
 */
export async function signInWithTwitter() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: `${process.env.PUBLIC_URL || ''}/api/auth/callback`
    }
  });

  if (error) {
    throw error;
  }

  return { provider: 'twitter', url: data.url };
}

/**
 * Handle OAuth callback
 */
export async function handleAuthCallback(req: any) {
  const code = req.query.code;
  
  if (!code) {
    throw new Error('No authorization code provided');
  }
  
  // Exchange the code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    throw error;
  }
  
  if (!data.user) {
    throw new Error('Authentication failed');
  }
  
  // Check if user exists in our database
  let user = await storage.getUserById(data.user.id);
  
  if (!user) {
    // Create new user
    const username = data.user.user_metadata?.username || 
                     data.user.user_metadata?.preferred_username || 
                     data.user.email?.split('@')[0] || 
                     `user_${Math.floor(Math.random() * 10000)}`;
    
    // Determine if this is a Twitter or Google login
    const provider = data.user.app_metadata?.provider;
    
    user = await storage.createUser({
      id: data.user.id,
      email: data.user.email || '',
      username,
      password: null,
      role: 'user',
      plan: 'free',
      streamTimeRemaining: 60,
      twitterHandle: provider === 'twitter' ? data.user.user_metadata?.preferred_username : null,
      avatarUrl: data.user.user_metadata?.avatar_url || null,
      emailVerified: data.user.email_confirmed_at ? true : false,
      blocked: false,
      twitterId: provider === 'twitter' ? data.user.user_metadata?.sub : null,
      googleId: provider === 'google' ? data.user.user_metadata?.sub : null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, userData: any) {
  const { data, error } = await supabase.auth.updateUser({
    data: userData
  });

  if (error) {
    throw error;
  }

  // Update our database
  return await storage.updateUser(userId, userData);
}