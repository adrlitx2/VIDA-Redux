import { supabase } from "./supabase";

export type UserRole = "user" | "admin" | "superadmin";

// Function to check if a user has a specific role
export const hasRole = (user: any, role: UserRole | UserRole[]): boolean => {
  if (!user) return false;
  
  // Get roles from Supabase user metadata
  const userRoles = user.app_metadata?.roles || [];
  
  // If checking for multiple roles, return true if user has any of them
  if (Array.isArray(role)) {
    return role.some(r => userRoles.includes(r));
  }
  
  // Otherwise check for specific role
  return userRoles.includes(role);
};

// Function to check if a user is an admin
export const isAdmin = (user: any): boolean => {
  return hasRole(user, ["admin", "superadmin"]);
};

// Function to check if a user is a superadmin
export const isSuperAdmin = (user: any): boolean => {
  return hasRole(user, "superadmin");
};

// Function to set a role for a user (admin only function)
export const setUserRole = async (userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
  try {
    // This requires the admin API key or a Supabase function with appropriate permissions
    // We'll need to call a server endpoint that has access to the admin key
    const response = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ userId, role })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Failed to set user role" };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get current user with roles
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Get auth headers with Supabase token
export const getAuthHeaders = (): Record<string, string> => {
  try {
    // Get the session from localStorage
    const supabaseSession = localStorage.getItem('sb-ewvbjadosmwgtntdmpog-auth-token');
    if (supabaseSession) {
      const session = JSON.parse(supabaseSession);
      if (session?.access_token) {
        return { 'Authorization': `Bearer ${session.access_token}` };
      }
    }
  } catch (error) {
    console.warn('Failed to get auth token from storage:', error);
  }
  
  return {};
};

// Store user data as backup
export const storeUserBackup = (userData: any): void => {
  try {
    localStorage.setItem('vida3-user-backup', JSON.stringify(userData));
  } catch (error) {
    console.warn('Failed to store user backup:', error);
  }
};

// For admin-specific redirects
export const redirectToAdminDashboard = (user: any): void => {
  const userRoles = user?.app_metadata?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
  
  console.log('Admin redirect check:', { isAdmin, userRoles, user });
  
  if (isAdmin) {
    console.log('Admin redirect: Detected admin role, redirecting to dashboard');
    // Use replace instead of href to completely replace the history entry
    window.location.replace('/admin/dashboard');
  } else {
    console.log('Admin redirect: No admin role detected, redirecting to home');
    window.location.replace('/');
  }
};