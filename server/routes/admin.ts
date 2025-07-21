import { Router } from 'express';
import { isAdmin, isSuperAdmin } from '../routes';
import { updateUserRole, getAllUsersWithRoles } from './admin-roles';
import { updateUserToSuperAdmin, updateUserSubscription } from './admin-functions';
import { storage } from '../storage';

const router = Router();

// Get admin dashboard stats
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // In a real app, we would fetch actual statistics
    const stats = {
      totalUsers: await storage.countUsers(),
      activeUsers: await storage.countActiveUsers(),
      newUsers: await storage.countNewUsers(30), // last 30 days
      totalRevenue: await storage.getTotalRevenue(),
      monthlyRevenue: await storage.getMonthlyRevenue(),
      activeStreams: await storage.countActiveStreams(),
      totalStreams: await storage.countTotalStreams(),
      totalStreamHours: await storage.getTotalStreamHours(),
      avgSessionLength: await storage.getAverageSessionLength(),
      conversionRate: await storage.getConversionRate(),
      churnRate: await storage.getChurnRate(),
      mostPopularPlan: await storage.getMostPopularPlan(),
      mostPopularAddOn: await storage.getMostPopularAddOn()
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics', error: error.message });
  }
});

// User management routes
router.get('/users', isAdmin, getAllUsersWithRoles);
router.post('/users/role', isSuperAdmin, updateUserRole);
router.post('/users/promote-to-superadmin', isSuperAdmin, updateUserToSuperAdmin);

// Subscription management routes
router.get('/subscriptions', isAdmin, async (req, res) => {
  try {
    const subscriptions = await storage.getAllSubscriptions();
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
});

router.post('/subscriptions/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Validate data
    if (!data || !data.name || data.price === undefined) {
      return res.status(400).json({ message: 'Invalid subscription data' });
    }
    
    // Update subscription plan
    const updatedPlan = await storage.updateSubscriptionPlan(id, data);
    res.json(updatedPlan);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update subscription plan', error: error.message });
  }
});

router.post('/update-subscription', isSuperAdmin, updateUserSubscription);

// Marketplace management routes
router.get('/marketplace', isAdmin, async (req, res) => {
  try {
    const items = await storage.getAllMarketplaceItems();
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch marketplace items', error: error.message });
  }
});

router.post('/marketplace/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Validate data
    if (!data) {
      return res.status(400).json({ message: 'Invalid marketplace item data' });
    }
    
    // Update marketplace item
    const updatedItem = await storage.updateMarketplaceItem(id, data);
    res.json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update marketplace item', error: error.message });
  }
});

router.post('/marketplace', isAdmin, async (req, res) => {
  try {
    const data = req.body;
    
    // Validate data
    if (!data || !data.name || !data.category || data.price === undefined) {
      return res.status(400).json({ message: 'Invalid marketplace item data' });
    }
    
    // Create new marketplace item
    const newItem = await storage.createMarketplaceItem(data);
    res.status(201).json(newItem);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create marketplace item', error: error.message });
  }
});

// Role-checking endpoint for testing permissions
router.get('/check-role', isAdmin, (req, res) => {
  try {
    const user = req.user as any;
    const roles = user?.app_metadata?.roles || [];
    
    res.json({
      user: {
        id: user?.id,
        email: user?.email,
        app_metadata: user?.app_metadata,
        user_metadata: user?.user_metadata,
      },
      roles,
      isAdmin: roles.includes('admin') || roles.includes('superadmin'),
      isSuperAdmin: roles.includes('superadmin')
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error checking roles', error: error.message });
  }
});

export default router;