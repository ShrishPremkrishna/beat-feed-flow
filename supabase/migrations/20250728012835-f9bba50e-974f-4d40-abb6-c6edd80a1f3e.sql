-- Fix negative likes_count and reset all comments likes_count to 0
UPDATE public.comments 
SET likes_count = 0 
WHERE likes_count < 0 OR likes_count IS NULL;

-- Also reset all likes_count to the actual count from likes table
UPDATE public.comments 
SET likes_count = (
  SELECT COUNT(*) 
  FROM public.likes 
  WHERE likes.comment_id = comments.id
);

-- Create a function to automatically update likes_count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update likes_count
DROP TRIGGER IF EXISTS comment_likes_insert_trigger ON public.likes;
DROP TRIGGER IF EXISTS comment_likes_delete_trigger ON public.likes;

CREATE TRIGGER comment_likes_insert_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_likes_count();

CREATE TRIGGER comment_likes_delete_trigger
  AFTER DELETE ON public.likes
  FOR EACH ROW
  WHEN (OLD.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_likes_count();