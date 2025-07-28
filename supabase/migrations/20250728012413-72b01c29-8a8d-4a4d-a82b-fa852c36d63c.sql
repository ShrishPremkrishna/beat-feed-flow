-- Reset all like counts and clear likes data

-- Reset like counts in comments table
UPDATE public.comments SET likes_count = 0;

-- Reset like counts in posts table  
UPDATE public.posts SET likes_count = 0;

-- Reset like counts in beats table
UPDATE public.beats SET likes_count = 0;

-- Clear all existing likes
DELETE FROM public.likes;

-- Check if there are any constraints that might be causing issues
-- Let's see the current table structure and constraints