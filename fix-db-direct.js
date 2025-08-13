// Fix database schema directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function fixDatabase() {
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
    // Test if we can insert a session with valid grid_layout
    console.log('🧪 Testing session creation with valid grid_layout...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('co_stream_sessions')
      .insert({
        id: 1,
        host_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
        session_name: 'Test Session',
        status: 'active',
        max_participants: 4,
        stream_platform: 'twitter',
        grid_layout: '2x2',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Session creation failed:', sessionError);
    } else {
      console.log('✅ Session created successfully:', sessionData);
      
      // Clean up
      await supabase
        .from('co_stream_sessions')
        .delete()
        .eq('id', 1);
      console.log('🧹 Test session cleaned up');
    }

    // Test invitation creation
    console.log('🧪 Testing invitation creation...');
    const { data: invitationData, error: invitationError } = await supabase
      .from('co_stream_invitations')
      .insert({
        session_id: 'test-session-123',
        inviter_id: '9ed149c6-b4f1-4326-ab34-8767b94eb003',
        invitee_id: '70972082-7f8c-475d-970a-aca686142a84',
        message: 'Test invitation'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('❌ Invitation creation failed:', invitationError);
      console.log('🔍 This means the foreign key constraint still exists');
    } else {
      console.log('✅ Invitation created successfully:', invitationData);
      
      // Clean up
      await supabase
        .from('co_stream_invitations')
        .delete()
        .eq('id', invitationData.id);
      console.log('🧹 Test invitation cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

fixDatabase(); 