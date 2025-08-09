-- Fix the remaining validation functions that need SECURITY DEFINER and SET search_path

-- Update validate_filename function
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

-- Update validate_beat_upload function
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

-- Update validate_profile_urls function
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