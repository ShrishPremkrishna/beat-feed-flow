-- Add missing social media columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apple_music TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.apple_music IS 'Apple Music artist profile username';
COMMENT ON COLUMN public.profiles.tiktok IS 'TikTok profile username'; 
