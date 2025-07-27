-- Drop triggers first, then recreate functions with proper search_path
DROP TRIGGER IF EXISTS update_like_counts_trigger ON public.likes;
DROP TRIGGER IF EXISTS update_comment_counts_trigger ON public.comments;

DROP FUNCTION IF EXISTS public.update_like_counts() CASCADE;
DROP FUNCTION IF EXISTS public.update_comment_counts() CASCADE;

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.beat_id IS NOT NULL THEN
      UPDATE public.beats SET likes_count = likes_count + 1 WHERE id = NEW.beat_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    IF OLD.beat_id IS NOT NULL THEN
      UPDATE public.beats SET likes_count = likes_count - 1 WHERE id = OLD.beat_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.beat_id IS NOT NULL THEN
      UPDATE public.beats SET comments_count = comments_count + 1 WHERE id = NEW.beat_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    IF OLD.beat_id IS NOT NULL THEN
      UPDATE public.beats SET comments_count = comments_count - 1 WHERE id = OLD.beat_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_like_counts_trigger
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_like_counts();

CREATE TRIGGER update_comment_counts_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_counts();