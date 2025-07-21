import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDemoUsers() {
  console.log('Setting up demo users in Supabase database...');

  const demoUsers = [
    {
      id: '70972082-7f8c-475d-970a-aca686142a84',
      email: 'admin@vida3.ai',
      username: 'admin',
      role: 'superadmin',
      plan: 'free',
      stream_time_remaining: 900,
      email_verified: true,
      blocked: false
    },
    {
      id: 'demo-user-1',
      email: 'sarah.streaming@vidaaa.ai',
      username: 'sarah_streams',
      role: 'user',
      plan: 'spartan',
      stream_time_remaining: 600,
      email_verified: true,
      blocked: false
    },
    {
      id: 'demo-user-2', 
      email: 'mike.creator@vidaaa.ai',
      username: 'mike_creates',
      role: 'user',
      plan: 'zeus',
      stream_time_remaining: 1200,
      email_verified: true,
      blocked: false
    },
    {
      id: 'demo-user-3',
      email: 'alex.newbie@vidaaa.ai', 
      username: 'alex_newbie',
      role: 'user',
      plan: 'reply-guy',
      stream_time_remaining: 120,
      email_verified: true,
      blocked: false
    },
    {
      id: 'demo-user-4',
      email: 'jessica.pro@vidaaa.ai',
      username: 'jessica_pro',
      role: 'admin',
      plan: 'goat',
      stream_time_remaining: -1,
      email_verified: true,
      blocked: false
    },
    {
      id: 'demo-user-5',
      email: 'carlos.test@vidaaa.ai',
      username: 'carlos_blocked',
      role: 'user', 
      plan: 'free',
      stream_time_remaining: 15,
      email_verified: false,
      blocked: true
    }
  ];

  try {
    // Insert demo users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .upsert(demoUsers, { onConflict: 'id' })
      .select();

    if (usersError) {
      console.error('Error creating demo users:', usersError.message);
      return;
    }

    console.log(`✓ ${users.length} demo users created successfully`);

    // Create avatars for some demo users
    const demoAvatars = [
      {
        user_id: '70972082-7f8c-475d-970a-aca686142a84',
        name: 'Admin Avatar',
        type: 'default',
        thumbnail_url: '/api/placeholder/200/200',
        preview_url: '/api/placeholder/400/400',
        model_url: '/models/admin-avatar.glb',
        file_url: '/uploads/admin-avatar.glb',
        vertices: 15000,
        control_points: 68,
        file_size: 2.5,
        is_premium: false
      },
      {
        user_id: 'demo-user-1',
        name: 'Cyberpunk Sarah',
        type: '2d-generated',
        thumbnail_url: '/api/placeholder/200/200',
        preview_url: '/api/placeholder/400/400',
        model_url: '/models/cyberpunk-avatar.glb',
        file_url: '/uploads/sarah-avatar.glb',
        vertices: 22000,
        control_points: 82,
        file_size: 4.2,
        is_premium: true
      },
      {
        user_id: 'demo-user-2',
        name: 'Professional Mike',
        type: 'custom',
        thumbnail_url: '/api/placeholder/200/200',
        preview_url: '/api/placeholder/400/400',
        model_url: '/models/professional-avatar.glb',
        file_url: '/uploads/mike-avatar.glb',
        vertices: 28000,
        control_points: 95,
        file_size: 5.8,
        is_premium: true
      }
    ];

    const { error: avatarsError } = await supabase
      .from('avatars')
      .upsert(demoAvatars, { onConflict: 'user_id,name' });

    if (avatarsError) {
      console.error('Error creating demo avatars:', avatarsError.message);
    } else {
      console.log(`✓ ${demoAvatars.length} demo avatars created`);
    }

    console.log('\n🎉 Demo users and avatars setup complete!');
    console.log('Your admin dashboard will now show real users from the database.');

  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

setupDemoUsers();