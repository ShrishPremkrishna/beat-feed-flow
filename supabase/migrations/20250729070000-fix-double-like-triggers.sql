-- Fix double like triggers issue
-- The problem is that both update_like_counts_trigger and comment_likes_insert_trigger/delete_trigger
-- are updating the comments.likes_count field, causing double increments

-- Drop the old update_like_counts_trigger that handles all types of likes
DROP TRIGGER IF EXISTS update_like_counts_trigger ON public.likes;

-- Keep only the specific comment likes triggers
-- The comment_likes_insert_trigger and comment_likes_delete_trigger are more specific
-- and should be the only ones handling comment likes

-- Verify the correct triggers are in place
-- comment_likes_insert_trigger and comment_likes_delete_trigger should be the only ones
-- updating comments.likes_count when likes are inserted/deleted 