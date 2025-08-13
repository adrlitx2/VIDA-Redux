// Simple fix for session_id column type
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function fixSessionId() {
  console.log('🔧 Fixing session_id column type...');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Drop foreign key constraint
    console.log('📝 Dropping foreign key constraint...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
    });
    console.log('✅ Dropped constraint');

    // Step 2: Change column type to VARCHAR
    console.log('📝 Changing session_id to VARCHAR...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations ALTER COLUMN session_id TYPE VARCHAR(255);'
    });
    console.log('✅ Changed to VARCHAR');

    // Step 3: Test the fix
    console.log('🧪 Testing invitation insert...');
    const testInvitation = {
      session_id: 'test-string-session-123',
      inviter_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
      invitee_id: '70972082-7f8c-475d-970a-aca686142a84',
      message: 'Test invitation'
    };

    const { data, error } = await supabase
      .from('co_stream_invitations')
      .insert(testInvitation)
      .select();

    if (error) {
      console.error('❌ Test failed:', error);
    } else {
      console.log('✅ Test successful:', data);
      
      // Clean up
      await supabase
        .from('co_stream_invitations')
        .delete()
        .eq('id', data[0].id);
      console.log('🧹 Cleaned up test data');
    }
    
    console.log('✅ Session ID fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixSessionId(); 