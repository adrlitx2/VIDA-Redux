-- Create users table for VIDA³
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

-- Create avatars table
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

-- Insert your admin user
INSERT INTO users (id, email, username, role, plan, stream_time_remaining, email_verified, blocked) 
VALUES ('70972082-7f8c-475d-970a-aca686142a84', 'admin@vida3.ai', 'admin', 'superadmin', 'free', 900, true, false)
ON CONFLICT (id) DO UPDATE SET 
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;

-- Insert demo users
INSERT INTO users (id, email, username, role, plan, stream_time_remaining, email_verified, blocked) VALUES
('demo-user-1', 'sarah.streaming@vidaaa.ai', 'sarah_streams', 'user', 'spartan', 600, true, false),
('demo-user-2', 'mike.creator@vidaaa.ai', 'mike_creates', 'user', 'zeus', 1200, true, false),
('demo-user-3', 'alex.newbie@vidaaa.ai', 'alex_newbie', 'user', 'reply-guy', 120, true, false),
('demo-user-4', 'jessica.pro@vidaaa.ai', 'jessica_pro', 'admin', 'goat', -1, true, false),
('demo-user-5', 'carlos.test@vidaaa.ai', 'carlos_blocked', 'user', 'free', 15, false, true)
ON CONFLICT (id) DO NOTHING;

-- Insert demo avatars
INSERT INTO avatars (user_id, name, type, thumbnail_url, preview_url, model_url, file_url, vertices, control_points, file_size, is_premium) VALUES
('70972082-7f8c-475d-970a-aca686142a84', 'Admin Avatar', 'default', '/api/placeholder/200/200', '/api/placeholder/400/400', '/models/admin-avatar.glb', '/uploads/admin-avatar.glb', 15000, 68, 2.5, false),
('demo-user-1', 'Cyberpunk Sarah', '2d-generated', '/api/placeholder/200/200', '/api/placeholder/400/400', '/models/cyberpunk-avatar.glb', '/uploads/sarah-avatar.glb', 22000, 82, 4.2, true),
('demo-user-2', 'Professional Mike', 'custom', '/api/placeholder/200/200', '/api/placeholder/400/400', '/models/professional-avatar.glb', '/uploads/mike-avatar.glb', 28000, 95, 5.8, true)
ON CONFLICT DO NOTHING;