-- Add likes_count column to comments table
ALTER TABLE public.comments ADD COLUMN likes_count integer DEFAULT 0;

-- Create index for better performance on likes_count
CREATE INDEX idx_comments_likes_count ON public.comments(likes_count);

-- Add comment_id column to likes table to support liking comments
ALTER TABLE public.likes ADD COLUMN comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;