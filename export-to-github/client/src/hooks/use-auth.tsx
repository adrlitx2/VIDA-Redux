import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import { Session } from '@supabase/supabase-js';
import { useToast } from './use-toast';

type AuthContext = {
  user: any | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const { toast } = useToast();
  
  // User profile is now handled by React Query in components that need it
  // No direct API calls in auth hook to prevent duplicate requests

  // Create user object with real subscription data
  // Don't wait for userProfile to load - create user object immediately if session exists
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
    role: userProfile?.role || 'user',
    plan: userProfile?.plan || 'free',
    supabaseUser: session.user,
    roles: session.user.app_metadata?.roles || []
  } : null;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', { event, hasSession: !!session });
      setSession(session);
      if (!session) {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign in failed',
          description: error.message,
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'An unexpected error occurred',
      });
      return { error };
    }
  };

  // Register a new user
  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign up failed',
          description: error.message,
        });
      } else {
        toast({
          title: 'Account created',
          description: 'Please check your email to confirm your account',
        });
      }
      
      return { error };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message || 'An unexpected error occurred',
      });
      return { error };
    }
  };

  // Logout
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Refresh user profile data (React Query handles this now)
  const refreshUserProfile = async () => {
    // No-op, React Query handles data freshness
  };

  // Check if user has admin role from Supabase JWT metadata
  const userRoles = session?.user?.app_metadata?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin') || user?.role === 'admin' || user?.role === 'superadmin';
  
  // Check if user has superadmin role
  const isSuperAdmin = userRoles.includes('superadmin') || user?.role === 'superadmin';
  
  // Log for debugging
  if (isAdmin) console.log('User has admin privileges:', { userRoles, user });

  const isLoading = false; // Simplified loading state
  const isAuthenticated = !!session && !!user;

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    login,
    signUp,
    logout,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}