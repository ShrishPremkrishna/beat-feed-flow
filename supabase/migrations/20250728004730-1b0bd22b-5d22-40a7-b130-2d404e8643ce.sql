-- Add likes_count column to comments table
ALTER TABLE public.comments ADD COLUMN likes_count integer DEFAULT 0;

-- Create index for better performance on likes_count
CREATE INDEX idx_comments_likes_count ON public.comments(likes_count);

-- Update existing trigger to handle comment likes
DROP TRIGGER IF EXISTS update_like_counts_trigger ON public.likes;

CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.beat_id IS NOT NULL THEN
      UPDATE public.beats SET likes_count = likes_count + 1 WHERE id = NEW.beat_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    IF OLD.beat_id IS NOT NULL THEN
      UPDATE public.beats SET likes_count = likes_count - 1 WHERE id = OLD.beat_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE public.comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$

-- Recreate trigger
CREATE TRIGGER update_like_counts_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_like_counts();

-- Add comment_id column to likes table to support liking comments
ALTER TABLE public.likes ADD COLUMN comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

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