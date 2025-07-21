-- Add DMCA and suspension tracking columns to the users table in Supabase
-- Run this SQL in your Supabase SQL editor to add comprehensive moderation tracking

-- Add DMCA and suspension tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS dmca_complaint_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_suspension_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_dmca_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_suspension_date TIMESTAMP WITH TIME ZONE;

-- Create DMCA complaints tracking table
CREATE TABLE IF NOT EXISTS dmca_complaints (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  complainant_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  content_url TEXT NOT NULL,
  claimed_work TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, investigating, resolved, dismissed
  action_taken TEXT, -- content_removed, user_warned, user_suspended, etc.
  admin_notes TEXT,
  filed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT -- admin user ID
);

-- Create user suspensions tracking table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  suspension_type TEXT NOT NULL, -- 7day, 30day, 90day, permanent
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL, -- admin user ID
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  appeal_submitted BOOLEAN DEFAULT false NOT NULL,
  appeal_notes TEXT,
  related_dmca_id INTEGER -- Link to DMCA complaint if applicable
);

-- Create user warnings tracking table
CREATE TABLE IF NOT EXISTS user_warnings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  warning_type TEXT NOT NULL, -- dmca, community_guidelines, tos_violation
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL, -- admin user ID
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  acknowledged BOOLEAN DEFAULT false NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dmca_complaints_user_id ON dmca_complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_dmca_complaints_status ON dmca_complaints(status);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_dmca_complaint_count ON users(dmca_complaint_count);
CREATE INDEX IF NOT EXISTS idx_users_suspension_count ON users(suspension_count);
CREATE INDEX IF NOT EXISTS idx_users_current_suspension_type ON users(current_suspension_type);

-- Add comments for documentation
COMMENT ON COLUMN users.dmca_complaint_count IS 'Total number of DMCA complaints filed against user';
COMMENT ON COLUMN users.suspension_count IS 'Total number of suspensions issued to user';
COMMENT ON COLUMN users.current_suspension_type IS 'Current active suspension type: 7day, 30day, 90day, permanent, or null';
COMMENT ON COLUMN users.suspension_end_date IS 'When current suspension expires';
COMMENT ON COLUMN users.suspension_reason IS 'Reason for current suspension';
COMMENT ON COLUMN users.last_dmca_date IS 'Date of most recent DMCA complaint';
COMMENT ON COLUMN users.last_suspension_date IS 'Date of most recent suspension';

COMMENT ON TABLE dmca_complaints IS 'Tracks all DMCA takedown requests and complaints';
COMMENT ON TABLE user_suspensions IS 'Tracks all user suspensions with full audit trail';
COMMENT ON TABLE user_warnings IS 'Tracks warnings issued to users for policy violations';