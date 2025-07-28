-- Add unique constraints to prevent duplicate likes
-- For posts: one like per user per post
ALTER TABLE public.likes ADD CONSTRAINT unique_user_post_like 
UNIQUE (user_id, post_id) DEFERRABLE INITIALLY DEFERRED;

-- For beats: one like per user per beat  
ALTER TABLE public.likes ADD CONSTRAINT unique_user_beat_like 
UNIQUE (user_id, beat_id) DEFERRABLE INITIALLY DEFERRED;

-- For comments: one like per user per comment
ALTER TABLE public.likes ADD CONSTRAINT unique_user_comment_like 
UNIQUE (user_id, comment_id) DEFERRABLE INITIALLY DEFERRED;