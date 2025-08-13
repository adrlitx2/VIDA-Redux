// Run database migration to fix invitation schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
  console.log('🔄 Running invitation schema migration...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Drop the foreign key constraint
    console.log('📝 Dropping foreign key constraint...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
    });

    // Change session_id to VARCHAR
    console.log('📝 Changing session_id to VARCHAR...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations ALTER COLUMN session_id TYPE VARCHAR(255);'
    });

    // Add session_data column
    console.log('📝 Adding session_data column...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT \'{}\';'
    });

    // Update unique constraint
    console.log('📝 Updating unique constraint...');
    await supabase.rpc('exec_sql', {
      sql: 'DROP INDEX IF EXISTS co_stream_invitations_session_invitee_unique;'
    });
    await supabase.rpc('exec_sql', {
      sql: 'CREATE UNIQUE INDEX co_stream_invitations_session_invitee_unique ON co_stream_invitations(session_id, invitee_id);'
    });

    // Update session index
    console.log('📝 Updating session index...');
    await supabase.rpc('exec_sql', {
      sql: 'DROP INDEX IF EXISTS idx_co_stream_invitations_session;'
    });
    await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX idx_co_stream_invitations_session ON co_stream_invitations(session_id);'
    });

    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration(); 