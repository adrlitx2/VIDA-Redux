-- VIDA³ Buddy System & Co-Streaming Database Migration with RLS
-- This script adds all necessary tables for the buddy system and co-streaming features
-- WITH ROW LEVEL SECURITY restricting access to Spartan, Zeus, and GOAT plans only

-- First, ensure we have the subscription plans table structure
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure we have user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES subscription_plans(id),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Buddy relationships table
CREATE TABLE IF NOT EXISTS buddy_relationships (
  id SERIAL PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Co-streaming sessions table
CREATE TABLE IF NOT EXISTS co_stream_sessions (
  id SERIAL PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  max_participants INTEGER DEFAULT 4 CHECK (max_participants BETWEEN 2 AND 16),
  stream_platform VARCHAR DEFAULT 'twitter' CHECK (stream_platform IN ('twitter', 'youtube', 'twitch', 'discord')),
  stream_key VARCHAR,
  rtmp_url VARCHAR,
  grid_layout VARCHAR DEFAULT '2x2' CHECK (grid_layout IN ('2x2', '3x3', '4x4', 'custom')),
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session participants table
CREATE TABLE IF NOT EXISTS co_stream_participants (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES co_stream_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'participant' CHECK (role IN ('host', 'participant', 'moderator')),
  canvas_position INTEGER CHECK (canvas_position >= 0 AND canvas_position <= 15),
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  stream_quality VARCHAR DEFAULT 'medium' CHECK (stream_quality IN ('low', 'medium', 'high')),
  UNIQUE(session_id, user_id)
);

-- Co-streaming invitations table
CREATE TABLE IF NOT EXISTS co_stream_invitations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES co_stream_sessions(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  UNIQUE(session_id, invitee_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN (
    'buddy_request', 
    'buddy_accepted', 
    'buddy_declined',
    'co_stream_invite', 
    'invitation_accepted', 
    'invitation_declined',
    'invitation_expired',
    'session_starting',
    'participant_joined',
    'participant_left',
    'stream_quality_alert',
    'session_ended'
  )),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buddy_relationships_requester ON buddy_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_buddy_relationships_recipient ON buddy_relationships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_buddy_relationships_status ON buddy_relationships(status);

CREATE INDEX IF NOT EXISTS idx_co_stream_sessions_host ON co_stream_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_sessions_status ON co_stream_sessions(status);
CREATE INDEX IF NOT EXISTS idx_co_stream_sessions_platform ON co_stream_sessions(stream_platform);

CREATE INDEX IF NOT EXISTS idx_co_stream_participants_session ON co_stream_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_participants_user ON co_stream_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_participants_active ON co_stream_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_co_stream_invitations_session ON co_stream_invitations(session_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_invitations_invitee ON co_stream_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_co_stream_invitations_status ON co_stream_invitations(status);
CREATE INDEX IF NOT EXISTS idx_co_stream_invitations_expires ON co_stream_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_buddy_relationships_updated_at 
    BEFORE UPDATE ON buddy_relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_co_stream_sessions_updated_at 
    BEFORE UPDATE ON co_stream_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has buddy system access using existing buddy_invite_access column
CREATE OR REPLACE FUNCTION has_buddy_system_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    -- Check if user's plan has buddy_invite_access enabled
    SELECT sp.buddy_invite_access INTO has_access
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
    AND us.status = 'active'
    AND us.current_period_end > NOW();
    
    -- Return true if buddy_invite_access is enabled for the user's plan
    RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on all buddy system tables
ALTER TABLE buddy_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_stream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_stream_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_stream_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for buddy_relationships
CREATE POLICY buddy_relationships_access_policy ON buddy_relationships
    FOR ALL
    USING (
        has_buddy_system_access(auth.uid()) AND (
            requester_id = auth.uid() OR 
            recipient_id = auth.uid()
        )
    );

-- RLS Policy for co_stream_sessions
CREATE POLICY co_stream_sessions_access_policy ON co_stream_sessions
    FOR ALL
    USING (
        has_buddy_system_access(auth.uid()) AND (
            host_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM co_stream_participants csp 
                WHERE csp.session_id = co_stream_sessions.id 
                AND csp.user_id = auth.uid()
            )
        )
    );

-- RLS Policy for co_stream_participants
CREATE POLICY co_stream_participants_access_policy ON co_stream_participants
    FOR ALL
    USING (
        has_buddy_system_access(auth.uid()) AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM co_stream_sessions css 
                WHERE css.id = co_stream_participants.session_id 
                AND css.host_id = auth.uid()
            )
        )
    );

-- RLS Policy for co_stream_invitations
CREATE POLICY co_stream_invitations_access_policy ON co_stream_invitations
    FOR ALL
    USING (
        has_buddy_system_access(auth.uid()) AND (
            inviter_id = auth.uid() OR 
            invitee_id = auth.uid()
        )
    );

-- RLS Policy for notifications
CREATE POLICY notifications_access_policy ON notifications
    FOR ALL
    USING (
        has_buddy_system_access(auth.uid()) AND user_id = auth.uid()
    );

-- Add function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE co_stream_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Update existing subscription plans to enable buddy_invite_access for Spartan, Zeus, and GOAT plans
UPDATE subscription_plans 
SET buddy_invite_access = true, 
    updated_at = NOW()
WHERE id IN ('spartan', 'zeus', 'goat');

-- Ensure Free and Reply Guy plans don't have buddy access
UPDATE subscription_plans 
SET buddy_invite_access = false, 
    updated_at = NOW()
WHERE id IN ('free', 'reply-guy');

-- Insert sample data for testing (only for users with appropriate plans)
-- Note: This will only work for users who have Spartan, Zeus, or GOAT plans

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE buddy_relationships IS 'Stores buddy/friend relationships between users (Spartan+ plans only)';
COMMENT ON TABLE co_stream_sessions IS 'Stores co-streaming session information (Spartan+ plans only)';
COMMENT ON TABLE co_stream_participants IS 'Stores participants in co-streaming sessions (Spartan+ plans only)';
COMMENT ON TABLE co_stream_invitations IS 'Stores invitations to co-streaming sessions (Spartan+ plans only)';
COMMENT ON TABLE notifications IS 'Stores user notifications for various events (Spartan+ plans only)';

COMMENT ON COLUMN co_stream_participants.canvas_position IS 'Position in the grid (0-15 for 4x4 grid)';
COMMENT ON COLUMN co_stream_sessions.grid_layout IS 'Layout type for the participant grid';
COMMENT ON COLUMN notifications.data IS 'JSON data containing additional information for the notification';

-- Success message
SELECT 'VIDA³ Buddy System & Co-Streaming tables created successfully with RLS!' as status;
SELECT 'Access restricted to Spartan, Zeus, and GOAT plans only.' as security_note;
-- Verify the update
SELECT id, name, buddy_invite_access, x_spaces_hosting, rigging_studio_access, max_morph_points 
FROM subscription_plans 
ORDER BY sort_order;