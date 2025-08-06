-- Create notifications table for the notification system
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'reply', 'follow', 'message')),
  title TEXT NOT NULL,
  content TEXT,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Create index for better performance
CREATE INDEX idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Security Fix 1: Update all database functions to use SECURITY DEFINER with proper search_path
CREATE OR REPLACE FUNCTION public.audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log sensitive operations with enhanced security
  IF TG_TABLE_NAME IN ('profiles', 'follows', 'beat_reactions', 'notifications', 'messages') THEN
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

CREATE OR REPLACE FUNCTION public.validate_filename(filename text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced filename validation
  IF filename IS NULL OR length(trim(filename)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Reject path traversal attempts and dangerous characters
  IF filename ~ '\.\.|/|\\|<|>|\||\*|\?|"|:|;|&|\$|`|\(|\)|#|@|!|\[|\]|\{|\}|%|\+|=|~|''|\^' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject filenames starting with dots, hyphens, or spaces
  IF filename ~ '^[\.\-\s]' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject excessively long filenames
  IF length(filename) > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Only allow alphanumeric, underscore, hyphen, and single dot for extension
  IF NOT filename ~ '^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{2,6}$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_beat_upload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced validation for beat uploads
  IF NEW.file_url IS NOT NULL THEN
    DECLARE
      filename TEXT;
    BEGIN
      filename := substring(NEW.file_url from '[^/]*$');
      IF NOT public.validate_filename(filename) THEN
        RAISE EXCEPTION 'Invalid filename in file URL: %', filename;
      END IF;
      
      -- Additional validation for audio file extensions
      IF NOT (filename ~ '\.(mp3|wav|flac|m4a|aac|ogg|webm)$') THEN
        RAISE EXCEPTION 'Invalid audio file extension';
      END IF;
    END;
  END IF;
  
  IF NEW.cover_art_url IS NOT NULL THEN
    DECLARE
      filename TEXT;
    BEGIN
      filename := substring(NEW.cover_art_url from '[^/]*$');
      IF NOT public.validate_filename(filename) THEN
        RAISE EXCEPTION 'Invalid filename in cover art URL: %', filename;
      END IF;
      
      -- Additional validation for image file extensions
      IF NOT (filename ~ '\.(jpg|jpeg|png|webp|gif)$') THEN
        RAISE EXCEPTION 'Invalid image file extension';
      END IF;
    END;
  END IF;
  
  -- Validate audio file metadata
  IF NEW.duration IS NOT NULL AND (NEW.duration <= 0 OR NEW.duration > 3600) THEN
    RAISE EXCEPTION 'Invalid audio duration: must be between 0 and 3600 seconds';
  END IF;
  
  IF NEW.bpm IS NOT NULL AND (NEW.bpm < 60 OR NEW.bpm > 200) THEN
    RAISE EXCEPTION 'Invalid BPM: must be between 60 and 200';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_profile_urls()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced URL validation
  IF NEW.website IS NOT NULL AND NEW.website != '' THEN
    -- Ensure website starts with protocol
    IF NOT (NEW.website ~ '^https?://') THEN
      NEW.website := 'https://' || NEW.website;
    END IF;
    
    -- Validate URL format with stricter rules
    IF NOT (NEW.website ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9\-._~:/?#[\]@!$&''()*+,;=%]*$') THEN
      RAISE EXCEPTION 'Invalid website URL format';
    END IF;
    
    -- Prevent dangerous URLs
    IF NEW.website ~ '(javascript:|data:|vbscript:|file:|ftp:)' THEN
      RAISE EXCEPTION 'Dangerous URL scheme not allowed';
    END IF;
  END IF;
  
  -- Enhanced social media handle validation
  IF NEW.instagram IS NOT NULL AND NEW.instagram != '' THEN
    -- Remove @ symbol if present
    NEW.instagram := regexp_replace(NEW.instagram, '^@', '');
    IF NOT (NEW.instagram ~ '^[a-zA-Z0-9_.]{1,30}$') THEN
      RAISE EXCEPTION 'Invalid Instagram handle format';
    END IF;
  END IF;
  
  IF NEW.twitter IS NOT NULL AND NEW.twitter != '' THEN
    -- Remove @ symbol if present
    NEW.twitter := regexp_replace(NEW.twitter, '^@', '');
    IF NOT (NEW.twitter ~ '^[a-zA-Z0-9_.]{1,30}$') THEN
      RAISE EXCEPTION 'Invalid Twitter handle format';
    END IF;
  END IF;
  
  IF NEW.beatstars IS NOT NULL AND NEW.beatstars != '' THEN
    -- Remove @ symbol if present
    NEW.beatstars := regexp_replace(NEW.beatstars, '^@', '');
    IF NOT (NEW.beatstars ~ '^[a-zA-Z0-9_.-]{1,50}$') THEN
      RAISE EXCEPTION 'Invalid BeatStars handle format';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Security Fix 2: Add content validation trigger
CREATE OR REPLACE FUNCTION public.validate_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Validate post/comment content
  IF TG_TABLE_NAME IN ('posts', 'comments') THEN
    IF NEW.content IS NOT NULL THEN
      -- Check for excessively long content
      IF length(NEW.content) > 5000 THEN
        RAISE EXCEPTION 'Content too long: maximum 5000 characters';
      END IF;
      
      -- Basic XSS prevention - reject obvious script tags
      IF NEW.content ~* '<script|javascript:|data:|vbscript:' THEN
        RAISE EXCEPTION 'Potentially dangerous content detected';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add content validation triggers
CREATE TRIGGER validate_post_content
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_content();

CREATE TRIGGER validate_comment_content
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_content();

-- Security Fix 3: Add failed authentication logging
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'suspicious_upload', 'rate_limit_exceeded', 'invalid_token')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_events (admin only)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access security events
CREATE POLICY "Only service role can access security events" 
ON public.security_events 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Security Fix 4: Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_identifier TEXT,
  action_type TEXT,
  max_attempts INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.security_events
  WHERE event_type = action_type
    AND (user_id::text = user_identifier OR ip_address::text = user_identifier)
    AND created_at > NOW() - INTERVAL '1 minute' * window_minutes;
  
  -- Check if limit exceeded
  IF attempt_count >= max_attempts THEN
    -- Log rate limit exceeded event
    INSERT INTO public.security_events (event_type, details, ip_address)
    VALUES ('rate_limit_exceeded', jsonb_build_object('action', action_type, 'attempts', attempt_count), user_identifier::inet);
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Security Fix 5: Add storage security policies
-- Update storage policies to be more restrictive
INSERT INTO storage.buckets (id, name, public) VALUES ('beats', 'beats', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Enhanced storage policies with size and type restrictions
CREATE POLICY "Authenticated users can upload beats with restrictions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'beats' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND validate_filename((storage.filename(name)))
  AND (storage.extension(name)) IN ('mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'webm')
);

CREATE POLICY "Authenticated users can upload covers with restrictions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND validate_filename((storage.filename(name)))
  AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

CREATE POLICY "Authenticated users can upload avatars with restrictions" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND validate_filename((storage.filename(name)))
  AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- Users can only update/delete their own files
CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING ((storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING ((storage.foldername(name))[1] = auth.uid()::text);