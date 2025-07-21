-- Add buddy invite access feature to subscription plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS buddy_invite_access BOOLEAN DEFAULT false;

-- Update existing plans with buddy invite access
UPDATE subscription_plans 
SET buddy_invite_access = true 
WHERE id IN ('reply-guy', 'spartan', 'zeus', 'goat');

-- Reply Guy and above get buddy invite access
UPDATE subscription_plans 
SET buddy_invite_access = false 
WHERE id = 'free';

-- Verify the update
SELECT id, name, buddy_invite_access, x_spaces_hosting, rigging_studio_access, max_morph_points 
FROM subscription_plans 
ORDER BY sort_order;