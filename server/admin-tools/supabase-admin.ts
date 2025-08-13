// Admin features require a Supabase service key (SUPABASE_SERVICE_KEY) in your environment.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Only create the admin client if the service key is present
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// (The rest of your admin code can check if supabaseAdmin is null and handle accordingly)

/**
 * Set the role for a user in Supabase
 * @param userId The Supabase user ID
 * @param role The role to assign ('admin', 'superadmin', or 'user')
 */
export async function setUserRole(userId: string, role: 'admin' | 'superadmin' | 'user'): Promise<{ success: boolean; error?: any }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase admin client not initialized. Supabase admin features are disabled.' };
  }

  try {
    // Validate role
    if (!['admin', 'superadmin', 'user'].includes(role)) {
      return { success: false, error: 'Invalid role. Must be admin, superadmin, or user' };
    }

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'Invalid user ID' };
    }
    
    // Get the current user to verify they exist
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      return { success: false, error: userError || 'User not found' };
    }
    
    // Set the role in app_metadata
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        app_metadata: { 
          // For 'user' role, we don't set a roles array to keep it as default authenticated
          roles: role === 'user' ? [] : [role] 
        } 
      }
    );
    
    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error };
    }
    
    console.log(`Successfully set role '${role}' for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Exception in setUserRole:', error);
    return { success: false, error };
  }
}

/**
 * Get all users with their roles from Supabase
 */
export async function getAllUsersWithRoles(): Promise<any[]> {
  if (!supabaseAdmin) {
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return [];
    }
    
    return data.users.map(user => ({
      id: user.id,
      email: user.email,
      role: getUserRoleFromMetadata(user),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata
    }));
  } catch (error) {
    console.error('Exception in getAllUsersWithRoles:', error);
    return [];
  }
}

/**
 * Extract user role from their metadata
 */
function getUserRoleFromMetadata(user: any): string {
  const roles = user?.app_metadata?.roles || [];
  
  if (roles.includes('superadmin')) {
    return 'superadmin';
  } else if (roles.includes('admin')) {
    return 'admin';
  } else {
    return 'user';
  }
}

/**
 * Create a test superadmin user if one doesn't exist
 */
export async function ensureSuperAdminExists(email: string, password: string, username: string): Promise<{ success: boolean; userId?: string; error?: any }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase admin client not initialized. Supabase admin features are disabled.' };
  }

  try {
    // Check if user already exists
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return { success: false, error };
    }
    
    // Look for existing superadmin
    for (const user of data.users) {
      const roles = user?.app_metadata?.roles || [];
      if (roles.includes('superadmin')) {
        console.log('Superadmin already exists:', user.email);
        return { success: true, userId: user.id };
      }
    }
    
    // Look for existing user with the given email
    let existingUser = data.users.find(user => user.email === email);
    
    if (existingUser) {
      // User exists, promote to superadmin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id, 
        { app_metadata: { roles: ['superadmin'] } }
      );
      
      if (updateError) {
        return { success: false, error: updateError };
      }
      
      console.log(`Promoted existing user ${email} to superadmin`);
      return { success: true, userId: existingUser.id };
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
      app_metadata: { roles: ['superadmin'] }
    });
    
    if (createError || !newUser.user) {
      return { success: false, error: createError };
    }
    
    console.log(`Created new superadmin user ${email}`);
    return { success: true, userId: newUser.user.id };
  } catch (error) {
    console.error('Exception in ensureSuperAdminExists:', error);
    return { success: false, error };
  }
}