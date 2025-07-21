-- Add suspension tracking columns to users table (only if they don't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_suspension_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_suspension_date TIMESTAMP WITH TIME ZONE;

-- Create user suspensions tracking table with automated escalation
CREATE TABLE IF NOT EXISTS user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  suspension_type TEXT NOT NULL, -- 'manual', 'automated', 'dmca'
  suspension_level INTEGER NOT NULL, -- 1-7 (1day, 3day, 7day, 14day, 30day, 180day, permanent)
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL, -- admin user ID
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  auto_reactivate_at TIMESTAMP WITH TIME ZONE, -- When to automatically unblock
  appeal_submitted BOOLEAN DEFAULT false NOT NULL,
  appeal_notes TEXT,
  related_dmca_id INTEGER -- Link to DMCA complaint if applicable
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_auto_reactivate ON user_suspensions(auto_reactivate_at);
CREATE INDEX IF NOT EXISTS idx_users_suspension_count ON users(suspension_count);
CREATE INDEX IF NOT EXISTS idx_users_suspension_end_date ON users(suspension_end_date);

-- Add comments for documentation
COMMENT ON COLUMN users.suspension_count IS 'Number of times user has been suspended (used for escalation)';
COMMENT ON COLUMN users.current_suspension_type IS 'Current active suspension type: 1day, 3day, 7day, 14day, 30day, 180day, permanent, or null';
COMMENT ON COLUMN users.suspension_end_date IS 'When current suspension expires';
COMMENT ON COLUMN users.suspension_reason IS 'Reason for current suspension';
COMMENT ON COLUMN users.last_suspension_date IS 'Date of most recent suspension';

COMMENT ON TABLE user_suspensions IS 'Tracks all user suspensions with full audit trail and automated escalation';
COMMENT ON COLUMN user_suspensions.suspension_level IS 'Escalation level: 1=1day, 2=3day, 3=7day, 4=14day, 5=30day, 6=180day, 7=permanent';
COMMENT ON COLUMN user_suspensions.auto_reactivate_at IS 'When user should be automatically unblocked (null for permanent)';