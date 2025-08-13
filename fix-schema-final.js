// Fix schema using the same sql RPC approach that worked to create tables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function fixSchema() {
  console.log('🔧 Fixing database schema...');
  
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
    console.log('📝 Executing schema fixes...');
    
    // Step 1: Drop the foreign key constraint
    console.log('Step 1: Dropping foreign key constraint...');
    const { error: dropError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
    });
    
    if (dropError) {
      console.error('❌ Failed to drop constraint:', dropError);
    } else {
      console.log('✅ Foreign key constraint dropped successfully!');
    }

    // Step 2: Change session_id to VARCHAR
    console.log('Step 2: Changing session_id to VARCHAR...');
    const { error: alterError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE co_stream_invitations ALTER COLUMN session_id TYPE VARCHAR(255);'
    });
    
    if (alterError) {
      console.error('❌ Failed to alter column:', alterError);
    } else {
      console.log('✅ Column type changed successfully!');
    }

    // Step 3: Update the unique constraint
    console.log('Step 3: Updating unique constraint...');
    const { error: indexError } = await supabase.rpc('sql', {
      query: 'DROP INDEX IF EXISTS co_stream_invitations_session_invitee_unique;'
    });
    
    if (indexError) {
      console.error('❌ Failed to drop index:', indexError);
    } else {
      console.log('✅ Old index dropped successfully!');
    }
    
    const { error: createIndexError } = await supabase.rpc('sql', {
      query: 'CREATE UNIQUE INDEX co_stream_invitations_session_invitee_unique ON co_stream_invitations(session_id, invitee_id);'
    });
    
    if (createIndexError) {
      console.error('❌ Failed to create new index:', createIndexError);
    } else {
      console.log('✅ New unique constraint created successfully!');
    }
    
    console.log('🎉 Schema fixes completed!');
    
    // Test the fix
    console.log('🧪 Testing invitation creation...');
    const { data: testInvitation, error: testError } = await supabase
      .from('co_stream_invitations')
      .insert({
        session_id: 'test-session-string-123',
        inviter_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
        invitee_id: '70972082-7f8c-475d-970a-aca686142a84',
        message: 'Test invitation with string session ID'
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Test successful! Invitation created with string session ID');
      
      // Clean up test data
      await supabase
        .from('co_stream_invitations')
        .delete()
        .eq('id', testInvitation.id);
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

fixSchema(); 