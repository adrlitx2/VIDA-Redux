-- Create stream_backgrounds table for managing virtual backgrounds
CREATE TABLE IF NOT EXISTS stream_backgrounds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  required_plan TEXT DEFAULT 'free' NOT NULL,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create background_categories table for organizing backgrounds
CREATE TABLE IF NOT EXISTS background_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default categories
INSERT INTO background_categories (name, description, sort_order) VALUES
  ('Bedroom', 'Bedroom-themed virtual backgrounds', 1),
  ('Nature', 'Natural landscape backgrounds', 2),
  ('Urban', 'City and urban environments', 3),
  ('Abstract', 'Abstract and artistic backgrounds', 4),
  ('Office', 'Professional office environments', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default bedroom backgrounds
INSERT INTO stream_backgrounds (name, description, category, image_url, is_active, sort_order, required_plan) VALUES
  ('Pop Art Bedroom', 'Vibrant pop art styled bedroom with bold colors', 'bedroom', '/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png', true, 1, 'free'),
  ('Neon Graffiti Bedroom', 'Modern bedroom with neon graffiti wall art', 'bedroom', '/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png', true, 2, 'free'),
  ('Warhol Modern Bedroom', 'Contemporary bedroom inspired by Andy Warhol aesthetics', 'bedroom', '/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png', true, 3, 'free')
ON CONFLICT DO NOTHING;