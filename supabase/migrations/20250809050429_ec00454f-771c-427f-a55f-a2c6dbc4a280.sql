-- Fix database function security by adding SECURITY DEFINER and SET search_path
-- This addresses the security warnings from the Supabase linter

-- Update audit_trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update security_audit_trigger function
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Update notification functions
CREATE OR REPLACE FUNCTION public.create_notification(recipient_user_id uuid, notification_type text, notification_title text, actor_user_id uuid DEFAULT NULL::uuid, notification_content text DEFAULT NULL::text, related_post_id uuid DEFAULT NULL::uuid, related_comment_id uuid DEFAULT NULL::uuid, related_message_id uuid DEFAULT NULL::uuid, notification_action_url text DEFAULT NULL::text, notification_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      notification_id UUID;
  BEGIN
      -- Don't create notification if recipient is the same as actor
      IF recipient_user_id = actor_user_id THEN
          RETURN NULL;
      END IF;

      INSERT INTO notifications (
          recipient_id,
          actor_id,
          type,
          title,
          content,
          post_id,
          comment_id,
          message_id,
          action_url,
          metadata
      ) VALUES (
          recipient_user_id,
          actor_user_id,
          notification_type,
          notification_title,
          notification_content,
          related_post_id,
          related_comment_id,
          related_message_id,
          notification_action_url,
          notification_metadata
      )
      RETURNING id INTO notification_id;

      RETURN notification_id;
  END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
      UPDATE notifications
      SET is_read = true, read_at = now()
      WHERE id = notification_id AND recipient_id = auth.uid();
  END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
      UPDATE notifications
      SET is_read = true, read_at = now()
      WHERE recipient_id = auth.uid() AND is_read = false;
  END;
$function$;

-- Update notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      recipient_user_id UUID;
      sender_profile RECORD;
  BEGIN
      -- Get the recipient (the other user in the conversation)
      SELECT CASE
          WHEN user1_id = NEW.sender_id THEN user2_id
          ELSE user1_id
      END INTO recipient_user_id
      FROM conversations
      WHERE id = NEW.conversation_id;

      -- Get sender profile for notification content
      SELECT display_name, username INTO sender_profile
      FROM profiles
      WHERE user_id = NEW.sender_id;

      -- Create notification
      PERFORM create_notification(
          recipient_user_id,
          'message',
          COALESCE(sender_profile.display_name, sender_profile.username, 'Someone') || ' sent you a message',
          NEW.sender_id,
          LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
          NULL,
          NULL,
          NEW.id,
          '/messages',
          jsonb_build_object('conversation_id', NEW.conversation_id)
      );

      RETURN NEW;
  END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_post_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      post_owner_id UUID;
      liker_profile RECORD;
      post_content TEXT;
  BEGIN
      -- Get post owner and content
      SELECT user_id, LEFT(content, 50) INTO post_owner_id, post_content
      FROM posts
      WHERE id = NEW.post_id;

      -- Get liker profile
      SELECT display_name, username INTO liker_profile
      FROM profiles
      WHERE user_id = NEW.user_id;

      -- Create notification
      PERFORM create_notification(
          post_owner_id,
          'like',
          COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your post',
          NEW.user_id,
          '"' || post_content || CASE WHEN LENGTH(post_content) = 50 THEN '...' ELSE '' END || '"',
          NEW.post_id,
          NULL,
          NULL,
          '/post/' || NEW.post_id,
          '{}'::jsonb
      );

      RETURN NEW;
  END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_comment_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      comment_owner_id UUID;
      liker_profile RECORD;
      comment_content TEXT;
  BEGIN
      -- Get comment owner and content
      SELECT user_id, LEFT(content, 50) INTO comment_owner_id, comment_content
      FROM comments
      WHERE id = NEW.comment_id;

      -- Get liker profile
      SELECT display_name, username INTO liker_profile
      FROM profiles
      WHERE user_id = NEW.user_id;

      -- Create notification
      PERFORM create_notification(
          comment_owner_id,
          'like',
          COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your reply',
          NEW.user_id,
          '"' || comment_content || CASE WHEN LENGTH(comment_content) = 50 THEN '...' ELSE '' END || '"',
          NULL,
          NEW.comment_id,
          NULL,
          '/post/' || (SELECT post_id FROM comments WHERE id = NEW.comment_id),
          '{}'::jsonb
      );

      RETURN NEW;
  END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      post_owner_id UUID;
      replier_profile RECORD;
      post_content TEXT;
  BEGIN
      -- Get post owner and content
      SELECT user_id, LEFT(content, 50) INTO post_owner_id, post_content
      FROM posts
      WHERE id = NEW.post_id;

      -- Get replier profile
      SELECT display_name, username INTO replier_profile
      FROM profiles
      WHERE user_id = NEW.user_id;

      -- Create notification
      PERFORM create_notification(
          post_owner_id,
          'reply',
          COALESCE(replier_profile.display_name, replier_profile.username, 'Someone') || ' replied to your post',
          NEW.user_id,
          CASE
              WHEN NEW.content IS NOT NULL THEN LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
              WHEN NEW.beat_id IS NOT NULL THEN 'Replied with a beat'
              ELSE 'Replied to your post'
          END,
          NEW.post_id,
          NEW.id,
          NULL,
          '/post/' || NEW.post_id,
          '{}'::jsonb
      );

      RETURN NEW;
  END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
      follower_profile RECORD;
  BEGIN
      -- Get follower profile
      SELECT display_name, username INTO follower_profile
      FROM profiles
      WHERE user_id = NEW.follower_id;

      -- Create notification
      PERFORM create_notification(
          NEW.following_id,
          'follow',
          COALESCE(follower_profile.display_name, follower_profile.username, 'Someone') || ' started following you',
          NEW.follower_id,
          'Check out their profile and beats!',
          NULL,
          NULL,
          NULL,
          '/profile/' || NEW.follower_id,
          '{}'::jsonb
      );

      RETURN NEW;
  END;
$function$;

-- Add enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    user_identifier TEXT,
    action_type TEXT,
    max_attempts INTEGER DEFAULT 10,
    window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    attempt_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate window start time
    window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Clean up old entries
    DELETE FROM rate_limits 
    WHERE created_at < window_start;
    
    -- Count current attempts in window
    SELECT COUNT(*) INTO attempt_count
    FROM rate_limits
    WHERE identifier = user_identifier
    AND action_type = check_rate_limit.action_type
    AND created_at >= window_start;
    
    -- Check if limit exceeded
    IF attempt_count >= max_attempts THEN
        RETURN FALSE;
    END IF;
    
    -- Log this attempt
    INSERT INTO rate_limits (identifier, action_type, created_at)
    VALUES (user_identifier, check_rate_limit.action_type, NOW());
    
    RETURN TRUE;
END;
$function$;

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    action_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits (identifier, action_type, created_at);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate_limits table (only system can access)
CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (false) WITH CHECK (false);

-- Add enhanced audit logging for failed authentication attempts
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type TEXT,
    event_description TEXT,
    user_identifier TEXT DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values,
        created_at
    ) VALUES (
        COALESCE(auth.uid(), uuid_nil()),
        'SECURITY_EVENT',
        'security_events',
        gen_random_uuid(),
        jsonb_build_object(
            'event_type', event_type,
            'description', event_description,
            'user_identifier', user_identifier,
            'metadata', metadata,
            'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        ),
        NOW()
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$function$;