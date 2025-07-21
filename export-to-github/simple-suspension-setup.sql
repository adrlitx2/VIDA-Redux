-- Simple suspension setup - add columns to users table only
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_suspension_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_suspension_date TIMESTAMP WITH TIME ZONE;

-- Create simplified user suspensions table without problematic columns
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

-- Add basic indexes
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_is_active ON user_suspensions(is_active);