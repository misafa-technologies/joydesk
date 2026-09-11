DROP POLICY IF EXISTS "Public read media" ON storage.objects;
CREATE POLICY "Public read media" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'media');