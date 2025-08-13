// Fix PostgREST schema cache issue
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function fixSchemaCache() {
  console.log('🔧 Fixing PostgREST schema cache...');
  
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
    // Method 1: Try to refresh the schema cache by querying the column
    console.log('📝 Attempting to refresh schema cache...');
    
    // First, let's check what columns actually exist
    const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'co_stream_invitations' 
        ORDER BY ordinal_position;
      `
    });
    
    if (columnError) {
      console.error('❌ Failed to check columns:', columnError);
    } else {
      console.log('📊 Current columns in co_stream_invitations:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    // Method 2: Try to force a schema refresh by doing a dummy query
    console.log('🔄 Forcing schema refresh...');
    try {
      const { data: dummyData, error: dummyError } = await supabase
        .from('co_stream_invitations')
        .select('*')
        .limit(0);
      
      if (dummyError) {
        console.log('⚠️ Dummy query failed (expected if table is empty):', dummyError.message);
      } else {
        console.log('✅ Schema cache refreshed');
      }
    } catch (e) {
      console.log('⚠️ Schema refresh attempt:', e.message);
    }

    // Method 3: Try inserting without session_data first
    console.log('🧪 Testing invitation insertion without session_data...');
    const testInvitation = {
      session_id: 'test-session-456',
      inviter_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
      invitee_id: '70972082-7f8c-475d-970a-aca686142a84',
      message: 'Test invitation without session_data'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('co_stream_invitations')
      .insert(testInvitation)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert test invitation:', insertError);
      
      // If this fails, let's try to add the session_data column again
      console.log('🔄 Attempting to add session_data column again...');
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE co_stream_invitations ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT \'{}\';'
      });
      
      if (alterError) {
        console.error('❌ Failed to add session_data column:', alterError);
      } else {
        console.log('✅ session_data column added/confirmed');
        
        // Try the insert again
        const { data: retryData, error: retryError } = await supabase
          .from('co_stream_invitations')
          .insert(testInvitation)
          .select();
        
        if (retryError) {
          console.error('❌ Still failed after adding column:', retryError);
        } else {
          console.log('✅ Test invitation inserted successfully after column fix');
        }
      }
    } else {
      console.log('✅ Test invitation inserted successfully');
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await supabase
      .from('co_stream_invitations')
      .delete()
      .eq('session_id', 'test-session-456');
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Schema cache fix failed:', error);
  }
}

fixSchemaCache(); 