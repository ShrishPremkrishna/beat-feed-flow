-- Add a constraint to ensure only one of post_id, beat_id, or comment_id is set
-- This will prevent issues with the unique constraints when dealing with NULLs

-- First, let's update the unique constraints to handle NULLs properly
-- PostgreSQL unique constraints consider NULL values as distinct, so we need partial indexes

-- Drop existing unique indexes that might cause issues with NULLs
DROP INDEX IF EXISTS unique_user_post_like;
DROP INDEX IF EXISTS unique_user_beat_like; 
DROP INDEX IF EXISTS unique_user_comment_like;

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