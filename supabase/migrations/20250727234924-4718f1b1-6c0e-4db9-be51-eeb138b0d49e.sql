-- Fix the check constraint to allow beat replies to posts
-- A comment can be a text reply to a post (post_id set, beat_id null)
-- OR a beat reply to a post (post_id set, beat_id set, content null)
-- OR a standalone beat comment (post_id null, beat_id set)

ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS check_comment_target;

-- Add new constraint that allows beat replies to posts
ALTER TABLE public.comments 
ADD CONSTRAINT check_comment_target 
CHECK (
  -- Text comment on a post
  (post_id IS NOT NULL AND beat_id IS NULL AND content IS NOT NULL) OR
  -- Beat reply to a post  
  (post_id IS NOT NULL AND beat_id IS NOT NULL AND content IS NULL) OR
  -- Standalone beat comment (if needed in future)
  (post_id IS NULL AND beat_id IS NOT NULL AND content IS NULL)
);