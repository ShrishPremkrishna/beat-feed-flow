-- Add trigger specifically for post likes
-- Since we removed the general update_like_counts_trigger, we need a specific trigger for post likes

-- Create function to update post likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for post likes
DROP TRIGGER IF EXISTS post_likes_insert_trigger ON public.likes;
DROP TRIGGER IF EXISTS post_likes_delete_trigger ON public.likes;

CREATE TRIGGER post_likes_insert_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL)
  EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER post_likes_delete_trigger
  AFTER DELETE ON public.likes
  FOR EACH ROW
  WHEN (OLD.post_id IS NOT NULL)
  EXECUTE FUNCTION public.update_post_likes_count(); 