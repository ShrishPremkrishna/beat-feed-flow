-- Security Enhancement Migration
-- Fix critical RLS policy gaps and strengthen security

-- 1. Fix RLS policies with missing WITH CHECK clauses to prevent user ID spoofing

-- Drop existing problematic policies and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create their own beats" ON public.beats;
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can create their own beat reactions" ON public.beat_reactions;
DROP POLICY IF EXISTS "Users can create their own downloads" ON public.downloads;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Recreate policies with proper WITH CHECK clauses to prevent user ID spoofing

-- Posts table
CREATE POLICY "Users can create their own posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Comments table  
CREATE POLICY "Users can create their own comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Beats table
CREATE POLICY "Users can create their own beats" 
ON public.beats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Likes table - enhanced to prevent spoofing and ensure only one target is specified
CREATE POLICY "Users can create their own likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  -- Ensure exactly one target is specified (post, beat, or comment)
  ((post_id IS NOT NULL AND beat_id IS NULL AND comment_id IS NULL) OR
   (beat_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL) OR
   (comment_id IS NOT NULL AND post_id IS NULL AND beat_id IS NULL))
);

-- Follows table
CREATE POLICY "Users can create their own follows" 
ON public.follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

-- Beat reactions table
CREATE POLICY "Users can create their own beat reactions" 
ON public.beat_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Downloads table
CREATE POLICY "Users can create their own downloads" 
ON public.downloads 
FOR INSERT 
WITH CHECK (auth.uid() = downloaded_by);

-- Profiles table - allow users to create only their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Conversations table - ensure user is part of conversation
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages table - ensure user is sender and part of conversation
CREATE POLICY "Users can send messages to their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = conversation_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- 2. Secure database functions with SECURITY DEFINER and fixed search_path

-- Update existing functions to be more secure
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

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
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

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    UPDATE conversations 
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at,
        last_message_by = NEW.sender_id,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$function$;

-- 3. Add enhanced input validation triggers

-- Create improved filename validation function
CREATE OR REPLACE FUNCTION public.validate_filename(filename TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Reject null/empty filenames
  IF filename IS NULL OR length(trim(filename)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Reject path traversal attempts
  IF filename ~ '\.\.|/|\\|<|>|\||\*|\?|"|:' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject filenames starting with dots or hyphens
  IF filename ~ '^[\.\-]' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject excessively long filenames
  IF length(filename) > 255 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Add filename validation trigger for beats
CREATE OR REPLACE FUNCTION public.validate_beat_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validate file_url contains safe filename
  IF NEW.file_url IS NOT NULL THEN
    -- Extract filename from URL
    DECLARE
      filename TEXT;
    BEGIN
      filename := substring(NEW.file_url from '[^/]*$');
      IF NOT public.validate_filename(filename) THEN
        RAISE EXCEPTION 'Invalid filename in file URL';
      END IF;
    END;
  END IF;
  
  -- Validate cover_art_url contains safe filename
  IF NEW.cover_art_url IS NOT NULL THEN
    DECLARE
      filename TEXT;
    BEGIN
      filename := substring(NEW.cover_art_url from '[^/]*$');
      IF NOT public.validate_filename(filename) THEN
        RAISE EXCEPTION 'Invalid filename in cover art URL';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for beat upload validation
DROP TRIGGER IF EXISTS validate_beat_upload_trigger ON public.beats;
CREATE TRIGGER validate_beat_upload_trigger
  BEFORE INSERT OR UPDATE ON public.beats
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_beat_upload();

-- Add URL validation for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_urls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Validate website URL format
  IF NEW.website IS NOT NULL AND NEW.website != '' THEN
    IF NOT (NEW.website ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9\-._~:/?#[\]@!$&''()*+,;=%]*$') THEN
      RAISE EXCEPTION 'Invalid website URL format';
    END IF;
  END IF;
  
  -- Validate social media handles (basic format check)
  IF NEW.instagram IS NOT NULL AND NEW.instagram != '' THEN
    IF NOT (NEW.instagram ~ '^[a-zA-Z0-9_.]{1,30}$') THEN
      RAISE EXCEPTION 'Invalid Instagram handle format';
    END IF;
  END IF;
  
  IF NEW.twitter IS NOT NULL AND NEW.twitter != '' THEN
    IF NOT (NEW.twitter ~ '^[a-zA-Z0-9_.]{1,30}$') THEN
      RAISE EXCEPTION 'Invalid Twitter handle format';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for profile URL validation
DROP TRIGGER IF EXISTS validate_profile_urls_trigger ON public.profiles;
CREATE TRIGGER validate_profile_urls_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_urls();

-- 4. Enhanced audit logging for security events

-- Create security audit function
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log all authentication-related profile changes
  IF TG_TABLE_NAME = 'profiles' AND TG_OP IN ('INSERT', 'UPDATE') THEN
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
      TG_OP || '_SECURITY',
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

-- Create security audit triggers
DROP TRIGGER IF EXISTS security_audit_profiles_trigger ON public.profiles;
CREATE TRIGGER security_audit_profiles_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.security_audit_trigger();

-- 5. Create unique constraints to prevent duplicate follows/likes

-- Add unique constraint for follows to prevent duplicate follows
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'follows_unique_pair'
  ) THEN
    ALTER TABLE public.follows 
    ADD CONSTRAINT follows_unique_pair 
    UNIQUE (follower_id, following_id);
  END IF;
END $$;

-- Add unique constraint for likes to prevent duplicate likes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'likes_unique_per_target'
  ) THEN
    ALTER TABLE public.likes 
    ADD CONSTRAINT likes_unique_per_target 
    UNIQUE (user_id, post_id, beat_id, comment_id);
  END IF;
END $$;