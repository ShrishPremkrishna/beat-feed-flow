-- Update the email notification function to call the edge function directly
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
    notification_payload JSONB;
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
        
        -- Prepare notification payload
        notification_payload := jsonb_build_object(
            'notification_id', NEW.id,
            'recipient_email', recipient_email,
            'notification_type', NEW.type,
            'title', NEW.title,
            'content', NEW.content,
            'action_url', NEW.action_url,
            'actor_display_name', COALESCE(actor_display_name, actor_username, 'Someone'),
            'created_at', NEW.created_at
        );
        
        -- Call the edge function to send email (using HTTP request)
        -- This will be handled by a background process or webhook
        -- For now, we'll use the simpler approach of calling via HTTP
        PERFORM extensions.http_request(
            'POST',
            'https://hkdsiivrjquuiekygfcu.supabase.co/functions/v1/notification-email-listener',
            ARRAY[
                extensions.http_header('Content-Type', 'application/json'),
                extensions.http_header('Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true))
            ],
            'application/json',
            notification_payload::text
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the notification creation
        PERFORM log_security_event(
            'email_notification_error',
            'Failed to send email notification: ' || SQLERRM,
            NEW.recipient_id::text,
            jsonb_build_object('notification_id', NEW.id, 'error', SQLERRM)
        );
        RETURN NEW;
END;
$function$;