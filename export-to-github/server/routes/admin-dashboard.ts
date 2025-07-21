import { Request, Response } from "express";
import * as adminService from "../services/admin-service";

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: error.message || "Failed to fetch dashboard stats" });
  }
}

/**
 * Get all users for admin management
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const users = await adminService.getAdminUsers();
    res.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
}

/**
 * Update user role (admin, superadmin, user)
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and role are required" });
    }
    
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'user', 'admin', or 'superadmin'" });
    }
    
    // Only superadmins can create other superadmins
    if (role === 'superadmin') {
      if (!req.user || !req.user.app_metadata?.roles?.includes('superadmin')) {
        return res.status(403).json({ message: "Only superadmins can create other superadmins" });
      }
    }
    
    const result = await adminService.updateUserRole(userId, role);
    res.json({ success: true, message: `User role updated to ${role}`, user: result });
  } catch (error: any) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: error.message || "Failed to update user role" });
  }
}

/**
 * Update user status (active or blocked)
 */
export async function updateUserStatus(req: Request, res: Response) {
  try {
    const { userId, status } = req.body;
    
    if (!userId || !status) {
      return res.status(400).json({ message: "User ID and status are required" });
    }
    
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'active' or 'blocked'" });
    }
    
    const result = await adminService.updateUserStatus(userId, status as 'active' | 'blocked');
    res.json({ 
      success: true, 
      message: `User ${status === 'blocked' ? 'suspended' : 'reactivated'} successfully`, 
      user: result 
    });
  } catch (error: any) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: error.message || "Failed to update user status" });
  }
}

/**
 * Get all marketplace items
 */
export async function getMarketplaceItems(req: Request, res: Response) {
  try {
    const items = await adminService.getMarketplaceItems();
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching marketplace items:", error);
    res.status(500).json({ message: error.message || "Failed to fetch marketplace items" });
  }
}

/**
 * Update marketplace item
 */
export async function updateMarketplaceItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const data = req.body;
    
    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }
    
    const result = await adminService.updateMarketplaceItem(itemId, data);
    res.json({ success: true, message: "Marketplace item updated", item: result });
  } catch (error: any) {
    console.error("Error updating marketplace item:", error);
    res.status(500).json({ message: error.message || "Failed to update marketplace item" });
  }
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans(req: Request, res: Response) {
  try {
    const plans = await adminService.getSubscriptionPlans();
    res.json(plans);
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: error.message || "Failed to fetch subscription plans" });
  }
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(req: Request, res: Response) {
  try {
    const { planId } = req.params;
    const data = req.body;
    
    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }
    
    const result = await adminService.updateSubscriptionPlan(planId, data);
    res.json({ success: true, message: "Subscription plan updated", plan: result });
  } catch (error: any) {
    console.error("Error updating subscription plan:", error);
    res.status(500).json({ message: error.message || "Failed to update subscription plan" });
  }
}

/**
 * Get system logs
 */
export async function getSystemLogs(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await adminService.getSystemLogs(limit);
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching system logs:", error);
    res.status(500).json({ message: error.message || "Failed to fetch system logs" });
  }
}