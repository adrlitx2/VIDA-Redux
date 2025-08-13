import { Router, Request, Response } from 'express';
import { userSyncService } from '../services/user-sync-service';

const router = Router();

// Admin endpoint to fetch all users with auth.users metadata priority
router.get('/admin/users', async (req: Request, res: Response) => {
  try {
    const users = await userSyncService.getUsersWithPriority();
    res.json(users);
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin endpoint to update user plan (updates both auth.users metadata and user_subscriptions)
router.put('/admin/users/:userId/plan', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { plan, status } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }
    
    await userSyncService.updateUserPlan(userId, plan, status || 'active');
    res.json({ success: true, message: `User plan updated to ${plan}` });
  } catch (error) {
    console.error('Admin user plan update error:', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

// Admin endpoint to update user (general update endpoint that frontend expects)
router.post('/admin/users/:userId/update', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    console.log(`🔄 Updating user ${userId}:`, updateData);
    
    // Handle plan updates
    if (updateData.plan) {
      await userSyncService.updateUserPlan(userId, updateData.plan, updateData.status || 'active');
    }
    
    // Handle role updates
    if (updateData.role) {
      await userSyncService.updateUserRole(userId, updateData.role);
    }
    
    // Handle other user updates (username, email, etc.)
    if (updateData.username || updateData.email) {
      const client = new (require('pg').Client)({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      try {
        await client.connect();
        
        // Update auth.users metadata
        const metadataUpdates: any = {};
        if (updateData.username) metadataUpdates.username = updateData.username;
        if (updateData.email) metadataUpdates.email = updateData.email;
        
        if (Object.keys(metadataUpdates).length > 0) {
          await client.query(`
            UPDATE auth.users 
            SET raw_user_meta_data = jsonb_set(
              COALESCE(raw_user_meta_data, '{}'::jsonb),
              $1::text[],
              $2::jsonb
            ),
            updated_at = NOW()
            WHERE id = $3
          `, [Object.keys(metadataUpdates), JSON.stringify(metadataUpdates), userId]);
        }
        
        await client.end();
      } catch (dbError) {
        console.error('Database update error:', dbError);
        await client.end();
      }
    }
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin endpoint to sync all user metadata
router.post('/admin/users/sync', async (req: Request, res: Response) => {
  try {
    await userSyncService.syncUserMetadata();
    res.json({ success: true, message: 'User metadata sync completed' });
  } catch (error) {
    console.error('Admin user sync error:', error);
    res.status(500).json({ error: 'Failed to sync user metadata' });
  }
});

export default router; 
 