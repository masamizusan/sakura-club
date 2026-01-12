-- Add photo_urls column to profiles table for storing multiple images
-- Task: 画像が消える問題とメイン重複表示の改善

-- Add photo_urls column as jsonb array to store up to 3 image URLs
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb;

-- Add constraint to ensure photo_urls is always an array
ALTER TABLE public.profiles
ADD CONSTRAINT IF NOT EXISTS photo_urls_is_array 
CHECK (jsonb_typeof(photo_urls) = 'array');

-- Add constraint to limit maximum 3 images
ALTER TABLE public.profiles
ADD CONSTRAINT IF NOT EXISTS photo_urls_max_3_images 
CHECK (jsonb_array_length(photo_urls) <= 3);

-- Update RLS policies to include photo_urls in allowed fields
-- (This should be checked if existing UPDATE policies need modification)

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.photo_urls IS 'Array of photo URLs (max 3), with first element as main image. Synced with avatar_url for compatibility.';