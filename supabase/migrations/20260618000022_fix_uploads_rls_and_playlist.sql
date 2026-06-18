-- Add playlist column to public_profiles (idempotent)
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS playlist JSONB DEFAULT '[]'::jsonb;

-- Allow any authenticated user to upload to uploads bucket under their own folder
-- (backgrounds, etc.) matching the same pattern as avatars/banners
DROP POLICY IF EXISTS "own_uploads_manage" ON storage.objects;
CREATE POLICY "own_uploads_manage" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "own_uploads_manage_update" ON storage.objects;
CREATE POLICY "own_uploads_manage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "own_uploads_manage_delete" ON storage.objects;
CREATE POLICY "own_uploads_manage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
