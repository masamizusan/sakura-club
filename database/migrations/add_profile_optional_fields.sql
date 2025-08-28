-- Add optional profile fields to profiles table
-- Migration: Add missing profile fields for optional information

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height >= 100 AND height <= 250),
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
ADD COLUMN IF NOT EXISTS personality TEXT[],
ADD COLUMN IF NOT EXISTS custom_culture TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.occupation IS 'User occupation/job';
COMMENT ON COLUMN profiles.height IS 'User height in centimeters';
COMMENT ON COLUMN profiles.body_type IS 'User body type description';
COMMENT ON COLUMN profiles.marital_status IS 'User marital status';
COMMENT ON COLUMN profiles.personality IS 'Array of personality traits';
COMMENT ON COLUMN profiles.custom_culture IS 'Custom Japanese culture description';