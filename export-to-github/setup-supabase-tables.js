import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('Setting up VIDA³ database tables...');

  try {
    // Create users table
    const { error: usersError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY,
          email VARCHAR UNIQUE,
          username VARCHAR,
          role VARCHAR DEFAULT 'user',
          plan VARCHAR DEFAULT 'free',
          stream_time_remaining INTEGER DEFAULT 900,
          email_verified BOOLEAN DEFAULT false,
          blocked BOOLEAN DEFAULT false,
          stripe_customer_id VARCHAR,
          stripe_subscription_id VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (usersError) {
      console.log('Users table setup result:', usersError.message);
    } else {
      console.log('✓ Users table ready');
    }

    // Create avatars table
    const { error: avatarsError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS avatars (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR REFERENCES users(id),
          name VARCHAR NOT NULL,
          type VARCHAR DEFAULT 'default',
          thumbnail_url VARCHAR,
          preview_url VARCHAR,
          model_url VARCHAR,
          file_url VARCHAR,
          vertices INTEGER DEFAULT 15000,
          control_points INTEGER DEFAULT 68,
          file_size DECIMAL DEFAULT 2.5,
          is_premium BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (avatarsError) {
      console.log('Avatars table setup result:', avatarsError.message);
    } else {
      console.log('✓ Avatars table ready');
    }

    // Insert your admin user
    const { error: userUpsertError } = await supabase
      .from('users')
      .upsert({
        id: '70972082-7f8c-475d-970a-aca686142a84',
        email: 'admin@vida3.ai',
        username: 'admin',
        role: 'superadmin',
        plan: 'free',
        stream_time_remaining: 900,
        email_verified: true,
        blocked: false
      });

    if (userUpsertError) {
      console.log('User setup result:', userUpsertError.message);
    } else {
      console.log('✓ Admin user configured');
    }

    // Insert default avatar for admin
    const { error: avatarError } = await supabase
      .from('avatars')
      .upsert({
        user_id: '70972082-7f8c-475d-970a-aca686142a84',
        name: 'Default Avatar',
        type: 'default',
        thumbnail_url: '/api/placeholder/200/200',
        preview_url: '/api/placeholder/400/400',
        model_url: '/models/default-avatar.glb',
        file_url: '/uploads/default-avatar.glb',
        vertices: 15000,
        control_points: 68,
        file_size: 2.5,
        is_premium: false
      });

    if (avatarError) {
      console.log('Avatar setup result:', avatarError.message);
    } else {
      console.log('✓ Default avatar created');
    }

    console.log('\n🎉 VIDA³ database setup complete!');
    console.log('Your superadmin account is ready with avatar and subscription data.');

  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

setupDatabase();