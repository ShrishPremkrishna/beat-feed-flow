-- Drop the existing unique constraints and recreate them properly

-- Drop existing unique constraints
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS unique_user_post_like;
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS unique_user_beat_like; 
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS unique_user_comment_like;

-- Create partial unique indexes that only apply when the respective ID is NOT NULL
CREATE UNIQUE INDEX unique_user_post_like 
ON public.likes (user_id, post_id) 
WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX unique_user_beat_like 
ON public.likes (user_id, beat_id) 
WHERE beat_id IS NOT NULL;

CREATE UNIQUE INDEX unique_user_comment_like 
ON public.likes (user_id, comment_id) 
WHERE comment_id IS NOT NULL;

-- Add a check constraint to ensure exactly one of the three IDs is set
ALTER TABLE public.likes 
ADD CONSTRAINT likes_target_check 
CHECK (
  (post_id IS NOT NULL AND beat_id IS NULL AND comment_id IS NULL) OR
  (post_id IS NULL AND beat_id IS NOT NULL AND comment_id IS NULL) OR
  (post_id IS NULL AND beat_id IS NULL AND comment_id IS NOT NULL)
);