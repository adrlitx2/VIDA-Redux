import pkg from 'pg';
const { Client } = pkg;

export class UserSyncService {
  private client: Client;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      // Already connected, ignore
    }
  }

  async disconnect() {
    try {
      await this.client.end();
    } catch (error) {
      // Already disconnected, ignore
    }
  }

  // Sync user metadata from auth.users to user_subscriptions
  async syncUserMetadata() {
    try {
      await this.connect();
      
      console.log('🔄 Starting user metadata sync...');
      
      // Get all users from auth.users
      const authResult = await this.client.query(`
        SELECT id, email, raw_user_meta_data, created_at, updated_at 
        FROM auth.users 
        ORDER BY created_at DESC
      `);
      
      console.log(`📋 Found ${authResult.rows.length} users in auth.users`);
      
      // Get existing subscriptions
      const subResult = await this.client.query(`
        SELECT user_id, plan_id, status, current_period_start, current_period_end 
        FROM user_subscriptions 
        ORDER BY created_at DESC
      `);
      
      console.log(`📋 Found ${subResult.rows.length} existing subscriptions`);
      
      // Process each user
      for (const user of authResult.rows) {
        const metadata = user.raw_user_meta_data || {};
        const existingSub = subResult.rows.find(sub => sub.user_id === user.id);
        
        // Check if user has plan info in metadata
        const metadataPlan = metadata.plan || metadata.subscription_plan;
        const metadataStatus = metadata.subscription_status || 'active';
        
        if (existingSub) {
          // Update existing subscription if metadata has different plan
          if (metadataPlan && metadataPlan !== existingSub.plan_id) {
            console.log(`🔄 Updating user ${user.email} plan from ${existingSub.plan_id} to ${metadataPlan}`);
            
            await this.client.query(`
              UPDATE user_subscriptions 
              SET plan_id = $1, status = $2, updated_at = NOW()
              WHERE user_id = $3
            `, [metadataPlan, metadataStatus, user.id]);
          }
        } else {
          // Create new subscription if user doesn't have one
          const defaultPlan = metadataPlan || 'free';
          console.log(`➕ Creating subscription for user ${user.email} with plan ${defaultPlan}`);
          
          await this.client.query(`
            INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
          `, [user.id, defaultPlan, metadataStatus]);
        }
      }
      
      console.log('✅ User metadata sync completed');
      
    } catch (error) {
      console.error('❌ User metadata sync failed:', error);
      throw error;
    }
  }

  // Get users with priority on auth.users metadata
  async getUsersWithPriority() {
    try {
      await this.connect();
      
      // Get users from auth.users (priority data)
      const authResult = await this.client.query(`
        SELECT id, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at 
        FROM auth.users 
        ORDER BY created_at DESC
      `);
      
      // Get subscriptions for reference
      const subResult = await this.client.query(`
        SELECT user_id, plan_id, status, current_period_start, current_period_end 
        FROM user_subscriptions 
        ORDER BY created_at DESC
      `);
      
      // Combine data with auth.users metadata as priority
      const users = authResult.rows.map(user => {
        const metadata = user.raw_user_meta_data || {};
        const appMetadata = user.raw_app_meta_data || {};
        const subscription = subResult.rows.find(sub => sub.user_id === user.id);
        
        // Priority: auth.users metadata > user_subscriptions table
        const plan = metadata.plan || metadata.subscription_plan || subscription?.plan_id || 'free';
        const status = metadata.subscription_status || subscription?.status || 'active';
        
        // Get role from raw_app_meta_data.roles
        const roles = appMetadata.roles || [];
        const role = roles.length > 0 ? roles[0] : 'user';
        
        return {
          id: user.id,
          email: user.email,
          username: metadata.username || user.email?.split('@')[0] || 'Unknown',
          plan: plan,
          status: status,
          role: role,
          roles: roles,
          created_at: user.created_at,
          updated_at: user.updated_at,
          metadata: metadata, // Include full metadata for reference
          app_metadata: appMetadata, // Include app_metadata for reference
          subscription_data: subscription // Include subscription data for reference
        };
      });
      
      return users;
      
    } catch (error) {
      console.error('❌ Failed to get users with priority:', error);
      throw error;
    }
  }

  // Update user plan in both auth.users metadata and user_subscriptions
  async updateUserPlan(userId: string, plan: string, status: string = 'active') {
    try {
      await this.connect();
      
      console.log(`🔄 Updating user ${userId} to plan ${plan}`);
      
      // Update auth.users metadata
      await this.client.query(`
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
          jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{plan}',
            $1::jsonb
          ),
          '{subscription_status}',
          $2::jsonb
        ),
        updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(plan), JSON.stringify(status), userId]);
      
      // Update or create user_subscriptions entry
      await this.client.query(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          plan_id = $2,
          status = $3,
          updated_at = NOW()
      `, [userId, plan, status]);
      
      console.log(`✅ User ${userId} plan updated to ${plan}`);
      
    } catch (error) {
      console.error('❌ Failed to update user plan:', error);
      throw error;
    }
  }

  // Update user role in app_metadata
  async updateUserRole(userId: string, role: string) {
    try {
      await this.connect();
      
      console.log(`🔄 Updating user ${userId} to role ${role}`);
      
      // Validate role
      const validRoles = ['user', 'admin', 'superadmin'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      }
      
      // Update auth.users app_metadata
      const roles = role === 'user' ? [] : [role];
      await this.client.query(`
        UPDATE auth.users 
        SET raw_app_meta_data = jsonb_set(
          COALESCE(raw_app_meta_data, '{}'::jsonb),
          '{roles}',
          $1::jsonb
        ),
        updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(roles), userId]);
      
      console.log(`✅ User ${userId} role updated to ${role}`);
      
    } catch (error) {
      console.error('❌ Failed to update user role:', error);
      throw error;
    }
  }
}

export const userSyncService = new UserSyncService(); 
 