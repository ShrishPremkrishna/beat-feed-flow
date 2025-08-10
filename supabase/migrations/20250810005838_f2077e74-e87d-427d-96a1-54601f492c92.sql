-- Add trigger for notifying followers when someone posts (if not exists)
-- First check if trigger exists, if not create it

-- Create trigger to notify followers when someone makes a new post
DROP TRIGGER IF EXISTS trigger_notify_followers_new_post ON posts;
CREATE TRIGGER trigger_notify_followers_new_post
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_followers_new_post();

-- Create trigger to send email notifications for specific notification types
CREATE OR REPLACE FUNCTION public.send_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    recipient_email TEXT;
    actor_display_name TEXT;
    actor_username TEXT;
BEGIN
    -- Only send emails for specific notification types
    IF NEW.type IN ('new_post', 'message') THEN
        -- Get recipient email
        SELECT email INTO recipient_email
        FROM auth.users
        WHERE id = NEW.recipient_id;
        
        -- Get actor profile info if actor exists
        IF NEW.actor_id IS NOT NULL THEN
            SELECT display_name, username INTO actor_display_name, actor_username
            FROM profiles
            WHERE user_id = NEW.actor_id;
        END IF;
        
        -- Call edge function to send email (async, won't block)
        PERFORM pg_notify('send_notification_email', json_build_object(
            'notification_id', NEW.id,
            'recipient_email', recipient_email,
            'notification_type', NEW.type,
            'title', NEW.title,
            'content', NEW.content,
            'action_url', NEW.action_url,
            'actor_display_name', COALESCE(actor_display_name, actor_username, 'Someone'),
            'created_at', NEW.created_at
        )::text);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger to send email notifications
DROP TRIGGER IF EXISTS trigger_send_email_notification ON notifications;
CREATE TRIGGER trigger_send_email_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION send_email_notification();