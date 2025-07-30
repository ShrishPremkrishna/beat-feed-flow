-- Remove the constraint that prevents multiple beats per producer per post
-- This allows users to submit multiple beat replies to the same post

-- Drop the unique constraint that prevents multiple beat replies from the same user
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS unique_user_post_beat_reply;

-- Drop the index that was created for this constraint
DROP INDEX IF EXISTS idx_comments_user_post_beat;

-- Update the check constraint to be less restrictive
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS check_comment_target;
ALTER TABLE public.comments ADD CONSTRAINT check_comment_target CHECK (
  (post_id IS NOT NULL AND beat_id IS NULL AND content IS NOT NULL) OR 
  (post_id IS NOT NULL AND beat_id IS NOT NULL AND content IS NULL)
); 