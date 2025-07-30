-- Create downloads table to track when beats are downloaded by artists
CREATE TABLE public.downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  downloaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_beat_downloader UNIQUE (beat_id, downloaded_by)
);

-- Enable Row Level Security
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for downloads
CREATE POLICY "Downloads are viewable by everyone" ON public.downloads FOR SELECT USING (true);
CREATE POLICY "Users can create their own downloads" ON public.downloads FOR INSERT WITH CHECK (auth.uid() = downloaded_by);
CREATE POLICY "Users can delete their own downloads" ON public.downloads FOR DELETE USING (auth.uid() = downloaded_by);

-- Create index for performance
CREATE INDEX idx_downloads_beat_id ON public.downloads(beat_id);
CREATE INDEX idx_downloads_downloaded_by ON public.downloads(downloaded_by); 