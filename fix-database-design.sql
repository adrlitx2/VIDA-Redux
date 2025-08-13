-- Fix the convoluted database design
-- This consolidates user data and removes redundant tables

-- 1. Create a proper user_profiles table that extends Supabase Auth
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' NOT NULL,
  twitter_handle TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Subscription info (single source of truth)
  subscription_plan_id TEXT DEFAULT 'free' NOT NULL,
  subscription_status TEXT DEFAULT 'active' NOT NULL,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  
  -- Usage tracking
  total_stream_time INTEGER DEFAULT 0 NOT NULL,
  total_stream_sessions INTEGER DEFAULT 0 NOT NULL,
  avatars_created INTEGER DEFAULT 0 NOT NULL,
  last_stream_at TIMESTAMP,
  last_avatar_created_at TIMESTAMP,
  
  -- Account status
  blocked BOOLEAN DEFAULT FALSE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Social auth
  twitter_token TEXT,
  twitter_token_secret TEXT,
  google_id TEXT,
  twitter_id TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Create a function to check buddy system access
CREATE OR REPLACE FUNCTION has_buddy_system_access(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN subscription_plans sp ON up.subscription_plan_id = sp.id
    WHERE up.id = user_id 
    AND sp.buddy_invite_access = true
    AND up.subscription_status = 'active'
    AND (up.subscription_end_date IS NULL OR up.subscription_end_date > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update co-stream tables to use proper RLS
ALTER TABLE co_stream_sessions ENABLE ROW LEVEL SECURITY;

-- Hosts can create sessions
CREATE POLICY "Hosts can create co-stream sessions" ON co_stream_sessions
  FOR INSERT WITH CHECK (
    has_buddy_system_access(host_id)
  );

-- Hosts and participants can view sessions
CREATE POLICY "Hosts and participants can view sessions" ON co_stream_sessions
  FOR SELECT USING (
    host_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM co_stream_participants 
      WHERE session_id = co_stream_sessions.id 
      AND user_id = auth.uid()
    )
  );

-- Hosts can update their sessions
CREATE POLICY "Hosts can update sessions" ON co_stream_sessions
  FOR UPDATE USING (host_id = auth.uid());

-- 5. Update co_stream_participants RLS
ALTER TABLE co_stream_participants ENABLE ROW LEVEL SECURITY;

-- Hosts can add participants
CREATE POLICY "Hosts can add participants" ON co_stream_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM co_stream_sessions 
      WHERE id = session_id 
      AND host_id = auth.uid()
    )
  );

-- Participants can view their participation
CREATE POLICY "Participants can view participation" ON co_stream_participants
  FOR SELECT USING (user_id = auth.uid());

-- 6. Create a trigger to sync auth.users to user_profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON co_stream_sessions TO authenticated;
GRANT ALL ON co_stream_participants TO authenticated;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_plan ON user_profiles(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_co_stream_sessions_host ON co_stream_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_participants_session ON co_stream_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_participants_user ON co_stream_participants(user_id); 