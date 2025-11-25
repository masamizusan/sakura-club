-- Add personality_tags and culture_tags columns for better data separation
-- Migration: Separate personality and culture data from interests array

-- Add new columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS personality_tags TEXT[],
ADD COLUMN IF NOT EXISTS culture_tags TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN profiles.personality_tags IS 'Array of personality traits (separated from interests)';
COMMENT ON COLUMN profiles.culture_tags IS 'Array of Japanese culture and hobby interests (separated from interests)';

-- Migrate existing data from interests to new columns
UPDATE profiles 
SET 
    personality_tags = COALESCE(
        personality_tags,
        CASE 
            WHEN interests IS NOT NULL THEN 
                ARRAY(
                    SELECT REPLACE(interest, 'personality:', '')
                    FROM UNNEST(interests) AS interest
                    WHERE interest LIKE 'personality:%'
                )
            ELSE NULL
        END
    ),
    culture_tags = COALESCE(
        culture_tags,
        CASE 
            WHEN interests IS NOT NULL THEN 
                ARRAY(
                    SELECT interest
                    FROM UNNEST(interests) AS interest
                    WHERE NOT interest LIKE 'personality:%'
                    AND NOT interest LIKE 'custom_culture:%'
                    AND interest != 'その他'
                )
            ELSE NULL
        END
    )
WHERE 
    (personality_tags IS NULL OR culture_tags IS NULL)
    AND interests IS NOT NULL
    AND array_length(interests, 1) > 0;

-- Clean up empty arrays (convert to NULL for consistency)
UPDATE profiles 
SET 
    personality_tags = CASE 
        WHEN array_length(personality_tags, 1) = 0 THEN NULL 
        ELSE personality_tags 
    END,
    culture_tags = CASE 
        WHEN array_length(culture_tags, 1) = 0 THEN NULL 
        ELSE culture_tags 
    END;