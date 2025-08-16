-- Fix remaining database functions missing security settings
CREATE OR REPLACE FUNCTION public.notify_post_to_subscribers()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    subscriber_user_id UUID;
    author_profile RECORD;
    post_content TEXT;
BEGIN
    -- Get author profile (same pattern as existing triggers)
    SELECT display_name, username INTO author_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create post content preview (same pattern as existing triggers)
    SELECT LEFT(COALESCE(content, 'Posted something new'), 50) INTO post_content
    FROM posts 
    WHERE id = NEW.id;
    
    -- Send notification to each subscriber (same pattern as existing triggers)
    FOR subscriber_user_id IN 
        SELECT subscriber_id 
        FROM notification_subscriptions 
        WHERE subscribed_to_id = NEW.user_id
    LOOP
        -- Use the existing create_notification function (same as other triggers)
        PERFORM create_notification(
            subscriber_user_id,
            NEW.user_id,
            'system',
            COALESCE(author_profile.display_name, author_profile.username, 'Someone') || ' posted something new',
            '"' || post_content || CASE WHEN LENGTH(post_content) = 50 THEN '...' ELSE '' END || '"',
            NEW.id,
            NULL,
            NULL,
            '/post/' || NEW.id,
            '{"subscription_type": "new_post"}'::jsonb
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_followers_new_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    follower_record RECORD;
    poster_profile RECORD;
    post_preview TEXT;
BEGIN
    -- Get the poster's profile information
    SELECT display_name, username INTO poster_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create a preview of the post content (first 50 characters)
    post_preview := CASE 
        WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 50) || '...'
        ELSE NEW.content
    END;
    
    -- Notify all followers of this user
    FOR follower_record IN 
        SELECT follower_id 
        FROM follows 
        WHERE following_id = NEW.user_id
    LOOP
        -- Create notification for each follower
        PERFORM create_notification(
            follower_record.follower_id,  -- recipient
            NEW.user_id,                  -- actor (person who posted)
            'new_post',                   -- notification type
            COALESCE(poster_profile.display_name, poster_profile.username, 'Someone') || ' shared a new post',
            post_preview,                 -- post preview as content
            NEW.id,                       -- related post id
            NULL,                         -- no comment id
            NULL,                         -- no message id
            '/post/' || NEW.id,           -- action url to view the post
            jsonb_build_object(           -- metadata
                'post_content', NEW.content,
                'poster_username', poster_profile.username,
                'poster_display_name', poster_profile.display_name
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_beat_upload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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