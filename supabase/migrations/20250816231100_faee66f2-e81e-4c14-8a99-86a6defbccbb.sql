-- Fix Critical Privacy Data Exposure and Database Function Security

-- 1. Fix RLS policies for privacy-sensitive tables
-- Update downloads table policy to be privacy-respecting
DROP POLICY IF EXISTS "Downloads are viewable by everyone" ON public.downloads;
CREATE POLICY "Users can view their own downloads" 
ON public.downloads 
FOR SELECT 
USING (auth.uid() = downloaded_by);

-- Update follows table policies to be privacy-respecting  
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Users can view follows they are involved in" 
ON public.follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Update likes table policy to be privacy-respecting
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Users can view their own likes" 
ON public.likes 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Fix database functions missing security settings
CREATE OR REPLACE FUNCTION public.is_subscribed_to_user(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM notification_subscriptions 
        WHERE subscriber_id = auth.uid() 
        AND subscribed_to_id = target_user_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_notification_subscription(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    is_currently_subscribed BOOLEAN;
BEGIN
    -- Don't allow self-subscription
    IF target_user_id = auth.uid() THEN
        RETURN FALSE;
    END IF;
    
    -- Check current subscription status
    SELECT is_subscribed_to_user(target_user_id) INTO is_currently_subscribed;
    
    IF is_currently_subscribed THEN
        -- Unsubscribe
        DELETE FROM notification_subscriptions 
        WHERE subscriber_id = auth.uid() AND subscribed_to_id = target_user_id;
        RETURN FALSE;
    ELSE
        -- Subscribe
        INSERT INTO notification_subscriptions (subscriber_id, subscribed_to_id)
        VALUES (auth.uid(), target_user_id)
        ON CONFLICT (subscriber_id, subscribed_to_id) DO NOTHING;
        RETURN TRUE;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_subscribed_users_new_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    subscriber RECORD;
    author_profile RECORD;
    post_preview TEXT;
BEGIN
    -- Get author profile for notification content
    SELECT display_name, username INTO author_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create post preview
    post_preview := LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END;
    
    -- Send notifications to all subscribers of this user
    FOR subscriber IN 
        SELECT subscriber_id 
        FROM notification_subscriptions 
        WHERE subscribed_to_id = NEW.user_id
    LOOP
        -- Create notification for each subscriber
        PERFORM create_notification(
            subscriber.subscriber_id,
            NEW.user_id,
            'system',
            COALESCE(author_profile.display_name, author_profile.username, 'Someone') || ' posted a new beat',
            '"' || post_preview || '"',
            NEW.id,
            NULL,
            NULL,
            '/post/' || NEW.id,
            jsonb_build_object('subscription_type', 'new_post')
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.validate_filename(filename text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.validate_profile_urls()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.notify_post_like()
 RETURNS trigger
 LANGUAGE plpgsql
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
    
    -- Create notification with CORRECT parameter order
    PERFORM create_notification(
        post_owner_id,        -- recipient_user_id
        'like',               -- notification_type
        COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your post', -- notification_title
        NEW.user_id,          -- actor_user_id
        '"' || post_content || CASE WHEN LENGTH(post_content) = 50 THEN '...' ELSE '' END || '"', -- notification_content
        NEW.post_id,          -- related_post_id
        NULL,                 -- related_comment_id
        NULL,                 -- related_message_id
        '/post/' || NEW.post_id, -- notification_action_url
        '{}'::jsonb           -- notification_metadata
    );
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
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
    
    -- Create notification with CORRECT parameter order
    PERFORM create_notification(
        recipient_user_id,    -- recipient_user_id
        'message',            -- notification_type
        COALESCE(sender_profile.display_name, sender_profile.username, 'Someone') || ' sent you a message', -- notification_title
        NEW.sender_id,        -- actor_user_id
        LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END, -- notification_content
        NULL,                 -- related_post_id
        NULL,                 -- related_comment_id
        NEW.id,               -- related_message_id
        '/messages',          -- notification_action_url
        jsonb_build_object('conversation_id', NEW.conversation_id) -- notification_metadata
    );
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_comment_like()
 RETURNS trigger
 LANGUAGE plpgsql
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
    
    -- Create notification with CORRECT parameter order
    PERFORM create_notification(
        comment_owner_id,     -- recipient_user_id
        'like',               -- notification_type
        COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your reply', -- notification_title
        NEW.user_id,          -- actor_user_id
        '"' || comment_content || CASE WHEN LENGTH(comment_content) = 50 THEN '...' ELSE '' END || '"', -- notification_content
        NULL,                 -- related_post_id
        NEW.comment_id,       -- related_comment_id
        NULL,                 -- related_message_id
        '/post/' || (SELECT post_id FROM comments WHERE id = NEW.comment_id), -- notification_action_url
        '{}'::jsonb           -- notification_metadata
    );
    
    RETURN NEW;
END;
$function$;