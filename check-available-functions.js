// Check what RPC functions are available
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function checkFunctions() {
  console.log('🔍 Checking available RPC functions...');
  
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
    // Try to list all functions
    const { data: functions, error } = await supabase.rpc('get_functions');
    
    if (error) {
      console.log('❌ Could not get functions list:', error);
      
      // Try a different approach - check if we can execute SQL directly
      console.log('🔍 Trying direct SQL execution...');
      const { data: testResult, error: testError } = await supabase.rpc('sql', {
        query: 'SELECT current_database();'
      });
      
      if (testError) {
        console.log('❌ Direct SQL also failed:', testError);
      } else {
        console.log('✅ Direct SQL works:', testResult);
      }
    } else {
      console.log('✅ Available functions:', functions);
    }
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

checkFunctions(); 