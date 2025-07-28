-- Update RLS policies for likes table to include comment_id
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
CREATE POLICY "Users can create their own likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (
    (post_id IS NOT NULL AND beat_id IS NULL AND comment_id IS NULL) OR
    (beat_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL) OR
    (comment_id IS NOT NULL AND post_id IS NULL AND beat_id IS NULL)
  )
);

-- Ensure only one type of like per record (post, beat, or comment)
ALTER TABLE public.likes ADD CONSTRAINT likes_single_target_check 
CHECK (
  (post_id IS NOT NULL AND beat_id IS NULL AND comment_id IS NULL) OR
  (beat_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL) OR
  (comment_id IS NOT NULL AND post_id IS NULL AND beat_id IS NULL)
);