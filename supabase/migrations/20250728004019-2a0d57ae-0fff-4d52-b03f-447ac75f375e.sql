-- Add foreign key constraints with CASCADE DELETE for comments
-- First, drop existing foreign key if it exists and add the proper one
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE public.comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

-- Also ensure beats are properly linked (if a beat is deleted, remove it from comments)
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_beat_id_fkey;
ALTER TABLE public.comments 
ADD CONSTRAINT comments_beat_id_fkey 
FOREIGN KEY (beat_id) REFERENCES public.beats(id) ON DELETE SET NULL;

-- Ensure likes are also cascaded when posts/beats are deleted
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE public.likes 
ADD CONSTRAINT likes_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_beat_id_fkey;
ALTER TABLE public.likes 
ADD CONSTRAINT likes_beat_id_fkey 
FOREIGN KEY (beat_id) REFERENCES public.beats(id) ON DELETE CASCADE;