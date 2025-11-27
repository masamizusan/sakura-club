-- Separate city JSON fields to dedicated columns
-- Migration: Move occupation, height, body_type, marital_status from city JSON to dedicated columns

-- 1) Add new dedicated columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.occupation IS 'Occupation (moved from city JSON)';
COMMENT ON COLUMN profiles.height IS 'Height in cm (moved from city JSON)';
COMMENT ON COLUMN profiles.body_type IS 'Body type (moved from city JSON)';
COMMENT ON COLUMN profiles.marital_status IS 'Marital status (moved from city JSON)';

-- 2) Migrate existing data from city JSON to dedicated columns
-- Only update null values (preserve any existing dedicated column data)
UPDATE public.profiles
SET
    occupation = COALESCE(
        occupation,
        CASE 
            WHEN city IS NOT NULL AND city != '' THEN
                (city::jsonb ->> 'occupation')
            ELSE NULL
        END
    ),
    height = COALESCE(
        height,
        CASE 
            WHEN city IS NOT NULL AND city != '' AND (city::jsonb ->> 'height') IS NOT NULL THEN
                NULLIF(city::jsonb ->> 'height', '')::integer
            ELSE NULL
        END
    ),
    body_type = COALESCE(
        body_type,
        CASE 
            WHEN city IS NOT NULL AND city != '' THEN
                (city::jsonb ->> 'body_type')
            ELSE NULL
        END
    ),
    marital_status = COALESCE(
        marital_status,
        CASE 
            WHEN city IS NOT NULL AND city != '' THEN
                (city::jsonb ->> 'marital_status')
            ELSE NULL
        END
    )
WHERE 
    city IS NOT NULL 
    AND city != ''
    AND city != 'null';

-- 3) Clean up city JSON - keep only city field and remove migrated fields
UPDATE public.profiles
SET city = CASE
    WHEN city IS NULL OR city = '' OR city = 'null' THEN NULL
    WHEN city::jsonb ? 'city' AND (city::jsonb ->> 'city') IS NOT NULL AND (city::jsonb ->> 'city') != '' THEN
        jsonb_build_object('city', city::jsonb ->> 'city')::text
    ELSE NULL
END
WHERE city IS NOT NULL;

-- Verify migration results
-- Show sample of migrated data
SELECT 
    id,
    occupation,
    height,
    body_type,
    marital_status,
    city,
    english_level,
    japanese_level
FROM profiles 
WHERE occupation IS NOT NULL OR height IS NOT NULL OR body_type IS NOT NULL OR marital_status IS NOT NULL
LIMIT 5;