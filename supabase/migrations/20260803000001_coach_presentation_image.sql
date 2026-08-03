-- Imagen de presentación para coaches (roster público de la landing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS presentation_image TEXT;

-- Bucket de almacenamiento para imágenes de presentación de coaches
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('coaches', 'coaches', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

-- Lectura pública del bucket coaches
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "coaches_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'coaches');
  END IF;
END $$;

-- El coach gestiona su propia imagen de presentación (carpeta = su uid)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_coach_presentation_manage' AND tablename = 'objects') THEN
    CREATE POLICY "own_coach_presentation_manage" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'coaches' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_coach_presentation_manage_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'coaches' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_coach_presentation_manage_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'coaches' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
