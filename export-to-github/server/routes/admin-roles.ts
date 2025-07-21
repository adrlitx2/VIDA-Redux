import { Request, Response } from "express";
import { storage } from "../storage";
import { supabase } from "../auth/supabase";
import { isAdmin, isSuperAdmin } from "../routes";

// This function allows superadmins to update a user's role in Supabase
export async function updateUserRole(req: Request, res: Response) {
  try {
    // Only superadmins can modify roles
    if (!isSuperAdmin(req)) {
      return res.status(403).json({ message: "Only superadmins can modify user roles" });
    }
    
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and role are required" });
    }
    
    // Validate role
    const validRoles = ["user", "admin", "superadmin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'user', 'admin', or 'superadmin'" });
    }
    
    // Update user in Supabase using the admin API
    const { error } = await supabase.auth.admin.updateUserById(
      userId,
      { app_metadata: { roles: [role] } }
    );
    
    if (error) {
      console.error("Error updating user role in Supabase:", error);
      return res.status(500).json({ message: "Failed to update user role", error: error.message });
    }
    
    // Also update our database for keeping records in sync
    await storage.updateUser(userId, { role });
    
    res.status(200).json({ message: "User role updated successfully" });
  } catch (error: any) {
    console.error("Error in updateUserRole:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// This function retrieves all users with their roles for admin management
export async function getAllUsersWithRoles(req: Request, res: Response) {
  try {
    // Only admins or superadmins can view all users
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    // Get all users from our database
    const users = await storage.listUsers();
    
    res.status(200).json(users);
  } catch (error: any) {
    console.error("Error in getAllUsersWithRoles:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}