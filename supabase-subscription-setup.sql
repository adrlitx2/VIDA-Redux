-- Enhanced subscription plans and user management system for VIDA³
-- This creates the complete infrastructure for automated plan management

-- Add subscription tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_suspension_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_suspension_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_time_remaining INTEGER DEFAULT 15; -- Minutes per week
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_max_limit INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_stream_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create comprehensive subscription plans table
DROP TABLE IF EXISTS subscription_plans;
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  billing_interval TEXT DEFAULT 'monthly', -- monthly, yearly
  
  -- Feature limits
  stream_minutes_per_week INTEGER NOT NULL DEFAULT 15,
  avatar_max_count INTEGER NOT NULL DEFAULT 1,
  max_concurrent_streams INTEGER DEFAULT 1,
  max_resolution TEXT DEFAULT '720p',
  
  -- Access controls
  marketplace_access BOOLEAN DEFAULT false,
  custom_avatars BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  white_label BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  
  -- Plan metadata
  is_popular BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert VIDA³ subscription plans
INSERT INTO subscription_plans (id, name, description, price, stream_minutes_per_week, avatar_max_count, max_concurrent_streams, max_resolution, marketplace_access, custom_avatars, priority_support, is_free, is_popular, sort_order) VALUES
('free', 'Free', 'Basic avatar creation and limited streaming', 0, 15, 1, 1, '720p', false, false, false, true, false, 1),
('reply-guy', 'Reply Guy', 'Enhanced features for content creators', 9.99, 180, 3, 1, '1080p', true, false, false, false, true, 2),
('spartan', 'Spartan', 'Professional streaming with premium features', 29.99, 600, 10, 2, '4K', true, true, true, false, false, 3),
('zeus', 'Zeus', 'Power user package with advanced capabilities', 99.99, 1800, 25, 3, '8K', true, true, true, false, false, 4),
('goat', 'GOAT', 'Ultimate creator suite with unlimited access', 299.99, -1, -1, 5, '8K', true, true, true, false, false, 5);

-- Create user suspensions tracking table
DROP TABLE IF EXISTS user_suspensions;
CREATE TABLE user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  suspension_type TEXT NOT NULL,
  suspension_level INTEGER NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create subscription changes log
CREATE TABLE IF NOT EXISTS subscription_changes (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  old_plan_id TEXT,
  new_plan_id TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'reactivate'
  changed_by TEXT, -- admin user id or 'system'
  reason TEXT,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream time usage tracking
CREATE TABLE IF NOT EXISTS stream_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  week_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create avatar usage tracking
CREATE TABLE IF NOT EXISTS avatar_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  avatar_id INTEGER,
  action_type TEXT, -- 'created', 'deleted', 'updated'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_user_id ON subscription_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_usage_user_id ON stream_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_usage_week ON stream_usage(week_start_date);
CREATE INDEX IF NOT EXISTS idx_avatar_usage_user_id ON avatar_usage(user_id);

-- Function to reset weekly stream time
CREATE OR REPLACE FUNCTION reset_weekly_stream_time()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    stream_time_remaining = (
      SELECT stream_minutes_per_week 
      FROM subscription_plans 
      WHERE id = users.subscription_plan_id
    ),
    weekly_stream_reset_date = NOW()
  WHERE weekly_stream_reset_date < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to check and enforce plan limits
CREATE OR REPLACE FUNCTION enforce_plan_limits(user_id_param TEXT)
RETURNS json AS $$
DECLARE
  user_data RECORD;
  plan_data RECORD;
  result json;
BEGIN
  -- Get user and plan data
  SELECT u.*, sp.* INTO user_data, plan_data
  FROM users u
  JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
  WHERE u.id = user_id_param;
  
  -- Check avatar limit
  IF plan_data.avatar_max_count != -1 AND user_data.avatar_count > plan_data.avatar_max_count THEN
    result := json_build_object(
      'valid', false,
      'reason', 'avatar_limit_exceeded',
      'message', format('Avatar limit exceeded. Plan allows %s avatars, user has %s', plan_data.avatar_max_count, user_data.avatar_count)
    );
    RETURN result;
  END IF;
  
  -- Check stream time
  IF plan_data.stream_minutes_per_week != -1 AND user_data.stream_time_remaining <= 0 THEN
    result := json_build_object(
      'valid', false,
      'reason', 'stream_time_exceeded',
      'message', 'Weekly stream time limit exceeded'
    );
    RETURN result;
  END IF;
  
  result := json_build_object('valid', true);
  RETURN result;
END;
$$ LANGUAGE plpgsql;