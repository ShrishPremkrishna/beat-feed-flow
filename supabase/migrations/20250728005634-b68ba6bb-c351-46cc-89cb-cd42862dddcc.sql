-- Drop the old constraints with correct syntax
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS check_like_target;
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_single_target_check;

-- Create the correct constraint that allows for all three types of likes
ALTER TABLE public.likes ADD CONSTRAINT check_like_target 
CHECK (
  (post_id IS NOT NULL AND beat_id IS NULL AND comment_id IS NULL) OR
  (beat_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL) OR
  (comment_id IS NOT NULL AND post_id IS NULL AND beat_id IS NULL)
);