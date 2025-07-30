-- Add purchase_link column to beats table
ALTER TABLE public.beats 
ADD COLUMN purchase_link TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN public.beats.purchase_link IS 'Purchase link for the beat (BeatStars, Telegram, etc.)'; 