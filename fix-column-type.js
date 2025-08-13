// Fix session_id column type to VARCHAR
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function fixColumnType() {
  console.log('🔧 Fixing session_id column type...');
  
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
    // Check current column type
    console.log('📊 Checking current session_id column type...');
    const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'co_stream_invitations' 
        AND column_name = 'session_id';
      `
    });
    
    if (columnError) {
      console.error('❌ Failed to check column:', columnError);
    } else {
      console.log('📋 Current session_id column info:', columnInfo[0]);
      
      if (columnInfo[0].data_type === 'integer') {
        console.log('🔄 session_id is still INTEGER, changing to VARCHAR...');
        
        // Drop foreign key constraint first
        const { error: dropConstraintError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
        });
        
        if (dropConstraintError) {
          console.error('❌ Failed to drop constraint:', dropConstraintError);
        } else {
          console.log('✅ Dropped foreign key constraint');
        }
        
        // Change column type to VARCHAR
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE co_stream_invitations ALTER COLUMN session_id TYPE VARCHAR(255);'
        });
        
        if (alterError) {
          console.error('❌ Failed to change column type:', alterError);
        } else {
          console.log('✅ Changed session_id to VARCHAR(255)');
          
          // Verify the change
          const { data: verifyInfo, error: verifyError } = await supabase.rpc('exec_sql', {
            sql: `
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_name = 'co_stream_invitations' 
              AND column_name = 'session_id';
            `
          });
          
          if (verifyError) {
            console.error('❌ Failed to verify change:', verifyError);
          } else {
            console.log('✅ Verified change:', verifyInfo[0]);
          }
        }
      } else {
        console.log('✅ session_id is already VARCHAR');
      }
    }

    // Test the fix
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
        .eq('session_id', 'test-string-session-123');
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixColumnType(); 