-- Fix the log_security_event function that's causing the uuid_nil() error
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_description text, user_identifier text DEFAULT NULL::text, metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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