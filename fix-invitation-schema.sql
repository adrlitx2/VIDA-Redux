-- Fix invitation schema for WebSocket-only approach
-- This allows invitations to work with string session IDs

-- First, drop the foreign key constraint
ALTER TABLE co_stream_invitations 
DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;

-- Change session_id to VARCHAR to support string session IDs
ALTER TABLE co_stream_invitations 
ALTER COLUMN session_id TYPE VARCHAR(255);

-- Add a data field to store additional session information
ALTER TABLE co_stream_invitations 
ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}';

-- Update the unique constraint to work with VARCHAR
DROP INDEX IF EXISTS co_stream_invitations_session_invitee_unique;
CREATE UNIQUE INDEX co_stream_invitations_session_invitee_unique 
ON co_stream_invitations(session_id, invitee_id);

-- Update the session index
DROP INDEX IF EXISTS idx_co_stream_invitations_session;
CREATE INDEX idx_co_stream_invitations_session 
ON co_stream_invitations(session_id);

-- Add comment explaining the change
COMMENT ON COLUMN co_stream_invitations.session_id IS 'Session ID (can be string for WebSocket-only sessions)';
COMMENT ON COLUMN co_stream_invitations.session_data IS 'Additional session data for WebSocket-only sessions'; 