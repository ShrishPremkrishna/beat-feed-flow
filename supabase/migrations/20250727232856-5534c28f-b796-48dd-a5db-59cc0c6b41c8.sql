-- Make beats bucket public for better performance
UPDATE storage.buckets SET public = true WHERE id = 'beats';

-- Create policy to allow public access to beat files
CREATE POLICY "Beat files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'beats');

-- Create policy to allow users to upload their own beats
CREATE POLICY "Users can upload their own beats" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'beats' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to update their own beats
CREATE POLICY "Users can update their own beats" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'beats' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own beats
CREATE POLICY "Users can delete their own beats" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'beats' AND auth.uid()::text = (storage.foldername(name))[1]);