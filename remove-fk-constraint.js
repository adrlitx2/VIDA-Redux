// Remove foreign key constraint
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function removeFKConstraint() {
  console.log('🔧 Removing foreign key constraint...');
  
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
    // Remove the foreign key constraint
    console.log('📝 Dropping foreign key constraint...');
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE co_stream_invitations DROP CONSTRAINT IF EXISTS co_stream_invitations_session_id_fkey;'
    });
    
    if (error) {
      console.error('❌ Failed to drop constraint:', error);
    } else {
      console.log('✅ Foreign key constraint removed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

removeFKConstraint(); 