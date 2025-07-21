import { createContext, useContext, useState } from 'react';
import { useToast } from './use-toast';

type AuthContext = {
  user: any | null;
  session: any | null;
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
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock login for demo purposes
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Create a demo user
      const mockUser = {
        id: '1',
        email,
        username: email.split('@')[0],
        role: email.includes('admin') ? 'admin' : 'user',
        plan: 'free',
        roles: email.includes('admin') ? ['admin'] : []
      };
      
      setUser(mockUser);
      
      toast({
        title: 'Signed in successfully',
        description: `Welcome, ${mockUser.username}!`,
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'An unexpected error occurred',
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Mock registration
  const signUp = async (email: string, password: string, username: string) => {
    setIsLoading(true);
    try {
      const mockUser = {
        id: '1',
        email,
        username,
        role: 'user',
        plan: 'free',
        roles: []
      };
      
      setUser(mockUser);
      
      toast({
        title: 'Account created successfully',
        description: `Welcome to VIDA³, ${username}!`,
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message || 'An unexpected error occurred',
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setUser(null);
    window.location.href = '/';
  };

  // Refresh user profile
  const refreshUserProfile = async () => {
    // No-op for demo
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  const value = {
    user,
    session: user ? { user } : null,
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