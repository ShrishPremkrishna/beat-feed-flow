-- Add unique constraint for comments only (since post and beat constraints already exist)
ALTER TABLE public.likes ADD CONSTRAINT unique_user_comment_like 
UNIQUE (user_id, comment_id) DEFERRABLE INITIALLY DEFERRED;