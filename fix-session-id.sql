-- Fix session_id column to support string session IDs
-- Drop the foreign key constraint first
ALTER TABLE co_stream_invitations 
DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;

-- Change session_id to VARCHAR
ALTER TABLE co_stream_invitations 
ALTER COLUMN session_id TYPE VARCHAR(255);

-- Add a comment to explain the change
COMMENT ON COLUMN co_stream_invitations.session_id IS 'Session ID (can be string for WebSocket-only sessions)'; 