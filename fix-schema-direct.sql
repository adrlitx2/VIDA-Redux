-- Fix co_stream_invitations table schema
-- Step 1: Drop the foreign key constraint
ALTER TABLE co_stream_invitations 
DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;

-- Step 2: Change session_id to VARCHAR to support string session IDs
ALTER TABLE co_stream_invitations 
ALTER COLUMN session_id TYPE VARCHAR(255);

-- Step 3: Update the unique constraint to work with VARCHAR
DROP INDEX IF EXISTS co_stream_invitations_session_invitee_unique;
CREATE UNIQUE INDEX co_stream_invitations_session_invitee_unique 
ON co_stream_invitations(session_id, invitee_id);

-- Step 4: Verify the changes
\d co_stream_invitations; 