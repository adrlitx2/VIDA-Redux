-- Check if user_suspensions table exists and add missing column
DO $$ 
BEGIN
    -- Add the auto_reactivate_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_suspensions' 
        AND column_name = 'auto_reactivate_at'
    ) THEN
        ALTER TABLE user_suspensions ADD COLUMN auto_reactivate_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_suspensions' 
ORDER BY ordinal_position;