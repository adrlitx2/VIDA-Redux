import { createClient } from '@supabase/supabase-js';

// Use existing Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUserSubscription() {
  try {
    // First create the users table if it doesn't exist
    const { error: tableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY,
          email VARCHAR UNIQUE,
          username VARCHAR,
          password VARCHAR,
          role VARCHAR DEFAULT 'user',
          plan VARCHAR DEFAULT 'free',
          stream_time_remaining INTEGER DEFAULT 60,
          twitter_handle VARCHAR,
          avatar_url VARCHAR,
          email_verified BOOLEAN DEFAULT false,
          blocked BOOLEAN DEFAULT false,
          twitter_id VARCHAR,
          google_id VARCHAR,
          stripe_customer_id VARCHAR,
          stripe_subscription_id VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR REFERENCES users(id),
          plan_id VARCHAR,
          status VARCHAR DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.log('Table creation error:', tableError.message);
      return;
    }

    // Now create/update the user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: '70972082-7f8c-475d-970a-aca686142a84',
        email: 'admin@vida3.ai',
        username: 'admin',
        role: 'superadmin',
        plan: 'free',
        stream_time_remaining: 60,
        email_verified: true,
        blocked: false
      })
      .select()
      .single();

    if (userError) {
      console.log('User setup error:', userError.message);
      return;
    }

    console.log('User created/updated successfully');

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: 'free',
        status: 'active'
      })
      .select()
      .single();

    if (subError) {
      console.log('Subscription setup error:', subError.message);
    } else {
      console.log('Subscription set up successfully!');
      console.log('Your admin account is now properly configured in the database.');
    }

  } catch (error) {
    console.log('Setup error:', error.message);
  }
}

setupUserSubscription();