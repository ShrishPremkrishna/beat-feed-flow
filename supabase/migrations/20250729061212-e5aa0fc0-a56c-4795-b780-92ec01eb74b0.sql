-- Fix database function security issues by updating search_path
-- This prevents potential SQL injection through search path manipulation

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    NULL -- Don't set external avatar, let frontend generate initials
  );
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update update_comment_counts function
CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
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
$function$;

-- Update update_like_counts function
CREATE OR REPLACE FUNCTION public.update_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
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
$function$;

-- Update update_comment_likes_count function
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
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
$function$;

-- Update update_follow_counts function
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.following_id;
    
    -- Increment following count for the user doing the following
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1) 
    WHERE user_id = OLD.following_id;
    
    -- Decrement following count for the user doing the unfollowing
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE user_id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix existing usernames that don't match the new constraint
UPDATE public.profiles 
SET username = 'user_' || substr(user_id::text, 1, 8)
WHERE username !~ '^[a-zA-Z0-9_]{1,30}$';

-- Add additional database constraints for data integrity
ALTER TABLE public.profiles ADD CONSTRAINT chk_followers_count_positive CHECK (followers_count >= 0);
ALTER TABLE public.profiles ADD CONSTRAINT chk_following_count_positive CHECK (following_count >= 0);
ALTER TABLE public.profiles ADD CONSTRAINT chk_beats_count_positive CHECK (beats_count >= 0);
ALTER TABLE public.profiles ADD CONSTRAINT chk_likes_count_positive CHECK (likes_count >= 0);

ALTER TABLE public.posts ADD CONSTRAINT chk_posts_likes_count_positive CHECK (likes_count >= 0);
ALTER TABLE public.posts ADD CONSTRAINT chk_posts_comments_count_positive CHECK (comments_count >= 0);
ALTER TABLE public.posts ADD CONSTRAINT chk_posts_shares_count_positive CHECK (shares_count >= 0);

ALTER TABLE public.beats ADD CONSTRAINT chk_beats_likes_count_positive CHECK (likes_count >= 0);
ALTER TABLE public.beats ADD CONSTRAINT chk_beats_comments_count_positive CHECK (comments_count >= 0);
ALTER TABLE public.beats ADD CONSTRAINT chk_beats_plays_count_positive CHECK (plays_count >= 0);

ALTER TABLE public.comments ADD CONSTRAINT chk_comments_likes_count_positive CHECK (likes_count >= 0);

-- Add content validation constraints
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_format CHECK (username ~ '^[a-zA-Z0-9_]{1,30}$');
ALTER TABLE public.posts ADD CONSTRAINT chk_content_length CHECK (length(content) <= 5000);
ALTER TABLE public.comments ADD CONSTRAINT chk_comment_length CHECK (length(content) <= 2000);

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow system/admin access to audit logs
CREATE POLICY "Audit logs are only accessible by system" ON public.audit_logs
FOR ALL USING (false);

-- Create triggers for audit logging on sensitive operations
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log sensitive operations
  IF TG_TABLE_NAME IN ('profiles', 'follows', 'beat_reactions') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
      now()
    );
  END IF;
  
  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$function$;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_follows_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_beat_reactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.beat_reactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();