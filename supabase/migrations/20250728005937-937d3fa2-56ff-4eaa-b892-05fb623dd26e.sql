-- First, remove duplicate likes for comments
DELETE FROM public.likes a USING public.likes b 
WHERE a.id > b.id 
AND a.user_id = b.user_id 
AND a.comment_id = b.comment_id 
AND a.comment_id IS NOT NULL;

-- Then add the unique constraint
ALTER TABLE public.likes ADD CONSTRAINT unique_user_comment_like 
UNIQUE (user_id, comment_id) DEFERRABLE INITIALLY DEFERRED;