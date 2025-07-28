-- Create trigger function to update follower/following counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE user_id = NEW.following_id;
    
    -- Increment following count for the user doing the following
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE user_id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE public.profiles 
    SET followers_count = GREATEST(0, followers_count - 1) 
    WHERE user_id = OLD.following_id;
    
    -- Decrement following count for the user doing the unfollowing
    UPDATE public.profiles 
    SET following_count = GREATEST(0, following_count - 1) 
    WHERE user_id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for follow counts
CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

-- Fix existing counts by recalculating them
UPDATE public.profiles 
SET followers_count = (
  SELECT COUNT(*) FROM public.follows WHERE following_id = profiles.user_id
);

UPDATE public.profiles 
SET following_count = (
  SELECT COUNT(*) FROM public.follows WHERE follower_id = profiles.user_id
);

-- Create a table to store beat reactions for the tinder-style system
CREATE TABLE public.beat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  beat_id UUID NOT NULL,
  reaction VARCHAR(10) NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, beat_id)
);

-- Enable RLS for beat_reactions
ALTER TABLE public.beat_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for beat_reactions
CREATE POLICY "Users can view their own beat reactions" 
ON public.beat_reactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beat reactions" 
ON public.beat_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beat reactions" 
ON public.beat_reactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beat reactions" 
ON public.beat_reactions 
FOR DELETE 
USING (auth.uid() = user_id);