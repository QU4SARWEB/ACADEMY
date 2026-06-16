-- Profile extras for full public profile page
-- Config columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mouse_dpi INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mouse_sens NUMERIC(4,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mouse_scope_sens NUMERIC(4,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mouse_hertz INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edpi INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_color TEXT DEFAULT '#8B5CF6';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS in_game_role TEXT;

-- Coach assignments
CREATE TABLE IF NOT EXISTS coach_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, season_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_assignments_student ON coach_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach ON coach_assignments(coach_id);

ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_manage_assignments" ON coach_assignments FOR ALL USING (public.is_coach());
CREATE POLICY "view_own_assignments" ON coach_assignments FOR SELECT USING (student_id = auth.uid() OR coach_id = auth.uid());

-- Member achievements / badges
CREATE TABLE IF NOT EXISTS member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'award',
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_achievements_profile ON member_achievements(profile_id);

ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_achievements" ON member_achievements FOR SELECT USING (true);
CREATE POLICY "coaches_manage_achievements" ON member_achievements FOR ALL USING (public.is_coach());
CREATE POLICY "own_achievements_insert" ON member_achievements FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Member VODs
CREATE TABLE IF NOT EXISTS member_vods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_vods_profile ON member_vods(profile_id);

ALTER TABLE member_vods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_vods" ON member_vods FOR SELECT USING (true);
CREATE POLICY "coaches_manage_vods" ON member_vods FOR ALL USING (public.is_coach());
CREATE POLICY "own_vods_manage" ON member_vods FOR ALL USING (profile_id = auth.uid());

-- Allow public read for profiles that have a public_profiles entry
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_profiles WHERE public_profiles.profile_id = profiles.id AND public_profiles.is_public = true)
);

-- Function to increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(profile_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_profiles SET views = COALESCE(views, 0) + 1 WHERE public_profiles.profile_id = increment_profile_views.profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate share_slug for existing profiles that have public_profiles entries
UPDATE profiles p
SET share_slug = pp.slug
FROM public_profiles pp
WHERE pp.profile_id = p.id AND p.share_slug IS NULL;

-- Add files column to messages for attachments
ALTER TABLE messages ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';

-- Fix: allow recipients to SELECT messages they have access to via message_recipients
CREATE POLICY "view_own_messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR
  EXISTS (SELECT 1 FROM message_recipients WHERE message_id = messages.id AND recipient_id = auth.uid())
);

-- ============================================
-- Storage buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners', 'banners', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, 52428800, ARRAY['image/*','video/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','application/x-rar-compressed'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Read Storage') THEN
    CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'banners', 'attachments'));
  END IF;
  -- Owner-only INSERT/UPDATE/DELETE for avatars and banners
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'own_avatars_banners_manage') THEN
    CREATE POLICY "own_avatars_banners_manage" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatars_banners_manage_update" ON storage.objects
      FOR UPDATE USING (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatars_banners_manage_delete" ON storage.objects
      FOR DELETE USING (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
