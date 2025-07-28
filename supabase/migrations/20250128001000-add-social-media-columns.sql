-- Add social media columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beatstars TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spotify TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube TEXT;

-- Update the profiles table to include these columns in the types
COMMENT ON COLUMN public.profiles.instagram IS 'Instagram handle/username';
COMMENT ON COLUMN public.profiles.twitter IS 'Twitter/X handle/username';
COMMENT ON COLUMN public.profiles.beatstars IS 'BeatStars profile username';
COMMENT ON COLUMN public.profiles.soundcloud IS 'SoundCloud profile username';
COMMENT ON COLUMN public.profiles.spotify IS 'Spotify artist profile username';
COMMENT ON COLUMN public.profiles.youtube IS 'YouTube channel username/handle'; 