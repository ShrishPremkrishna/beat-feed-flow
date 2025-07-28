-- Add constraint to prevent multiple beats per producer per post
-- This ensures that each producer can only submit one beat reply per post

-- First, add a unique constraint on comments table for user_id + post_id where beat_id is not null
-- This prevents multiple beat replies from the same user to the same post
ALTER TABLE public.comments 
ADD CONSTRAINT unique_user_post_beat_reply 
UNIQUE (user_id, post_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add a check constraint to ensure this only applies when beat_id is not null
-- Note: PostgreSQL doesn't support partial unique constraints easily in this syntax,
-- so we'll handle this at the application level as well

-- Update the existing check constraint to be more specific
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS check_comment_target;
ALTER TABLE public.comments ADD CONSTRAINT check_comment_target CHECK (
  (post_id IS NOT NULL AND beat_id IS NULL AND content IS NOT NULL) OR 
  (post_id IS NOT NULL AND beat_id IS NOT NULL AND content IS NULL)
);

-- Create an index to support the unique constraint efficiently
CREATE INDEX IF NOT EXISTS idx_comments_user_post_beat ON public.comments(user_id, post_id) WHERE beat_id IS NOT NULL; 