-- Make beats bucket public for better performance
UPDATE storage.buckets SET public = true WHERE id = 'beats';

-- Create policy to allow public access to beat files (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Beat files are publicly accessible'
    ) THEN
        CREATE POLICY "Beat files are publicly accessible" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'beats');
    END IF;
END $$;