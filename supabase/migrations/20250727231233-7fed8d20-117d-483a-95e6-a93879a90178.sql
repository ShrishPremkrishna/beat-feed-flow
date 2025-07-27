-- Update comments table to support beat-only replies
ALTER TABLE public.comments 
ALTER COLUMN content DROP NOT NULL;

-- Add constraint to ensure either content or beat_id is present
ALTER TABLE public.comments 
ADD CONSTRAINT comments_content_or_beat_check 
CHECK (
  (content IS NOT NULL AND content != '') OR 
  (beat_id IS NOT NULL)
);