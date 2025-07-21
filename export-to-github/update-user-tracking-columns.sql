-- Add comprehensive user tracking columns to the users table in Supabase
-- This SQL script adds all the streaming, avatar, and engagement tracking fields

-- Add streaming activity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_stream_time INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_stream_sessions INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_stream_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_time_remaining INTEGER DEFAULT 900 NOT NULL; -- 15 minutes free streaming per week

-- Add avatar creation tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatars_created INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_avatar_created_at TIMESTAMP WITH TIME ZONE;

-- Add subscription tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Add engagement and analytics tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0 NOT NULL; -- in cents
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Add verification status
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.total_stream_time IS 'Total streaming time in seconds';
COMMENT ON COLUMN users.total_stream_sessions IS 'Number of streaming sessions completed';
COMMENT ON COLUMN users.stream_time_remaining IS 'Remaining stream time in seconds for current period';
COMMENT ON COLUMN users.avatars_created IS 'Number of avatars created by user';
COMMENT ON COLUMN users.viewer_count IS 'Peak viewer count for user streams';
COMMENT ON COLUMN users.total_earnings IS 'Total earnings from referrals/content in cents';
COMMENT ON COLUMN users.is_verified IS 'Whether user is verified on the platform';

-- Create indexes for better performance on admin queries
CREATE INDEX IF NOT EXISTS idx_users_total_stream_time ON users(total_stream_time);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);
CREATE INDEX IF NOT EXISTS idx_users_last_stream_at ON users(last_stream_at);