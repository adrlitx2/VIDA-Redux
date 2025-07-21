import { Request, Response } from "express";
import { setUserRole, getAllUsersWithRoles, ensureSuperAdminExists } from "../admin-tools/supabase-admin";
import { isAdmin, isSuperAdmin } from "../routes";
import { storage } from "../storage";

// Update a user's role (superadmin only)
export async function updateUserRoleHandler(req: Request, res: Response) {
  try {
    // Check if user is superadmin
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ message: "Only superadmins can modify user roles" });
    }
    
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and role are required" });
    }
    
    // Set the role in Supabase
    const result = await setUserRole(userId, role);
    
    if (!result.success) {
      return res.status(500).json({ message: "Failed to update user role", error: result.error });
    }
    
    // Also update in our database to keep records in sync
    await storage.updateUser(userId, { role });
    
    res.status(200).json({ message: "User role updated successfully" });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// Get all users with their roles
export async function getUsersWithRolesHandler(req: Request, res: Response) {
  try {
    // Check if user is admin
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only admins can view all users" });
    }
    
    const users = await getAllUsersWithRoles();
    res.status(200).json(users);
  } catch (error: any) {
    console.error("Error getting users with roles:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// Create superadmin user if one doesn't exist
export async function createDefaultSuperadmin(req: Request, res: Response) {
  try {
    // For safety, only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: "This operation is only allowed in development environment" });
    }
    
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ 
        message: "Email, password, and username are required", 
        format: {
          email: "admin@example.com",
          password: "securepassword",
          username: "admin"
        }
      });
    }
    
    const result = await ensureSuperAdminExists(email, password, username);
    
    if (!result.success) {
      return res.status(500).json({ message: "Failed to create superadmin", error: result.error });
    }
    
    res.status(200).json({ 
      message: "Superadmin created or verified successfully", 
      userId: result.userId 
    });
  } catch (error: any) {
    console.error("Error creating superadmin:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}