// Run SQL fix for session_id column
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function runSqlFix() {
  console.log('🔧 Running SQL fix for session_id column...');
  
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
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
    });
    
    if (dropError) {
      console.error('❌ Failed to drop constraint:', dropError);
    } else {
      console.log('✅ Dropped foreign key constraint');
    }

    // Step 2: Change column type to VARCHAR
    console.log('📝 Changing session_id to VARCHAR...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations ALTER COLUMN session_id TYPE VARCHAR(255);'
    });
    
    if (alterError) {
      console.error('❌ Failed to change column type:', alterError);
    } else {
      console.log('✅ Changed session_id to VARCHAR(255)');
    }

    // Step 3: Test the fix
    console.log('🧪 Testing invitation insert with string session_id...');
    const testInvitation = {
      session_id: 'test-string-session-123',
      inviter_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
      invitee_id: '70972082-7f8c-475d-970a-aca686142a84',
      message: 'Test invitation with string session_id'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('co_stream_invitations')
      .insert(testInvitation)
      .select();

    if (insertError) {
      console.error('❌ Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up
      await supabase
        .from('co_stream_invitations')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test data cleaned up');
    }
    
    console.log('✅ SQL fix completed successfully!');
    
  } catch (error) {
    console.error('❌ SQL fix failed:', error);
  }
}

runSqlFix(); 