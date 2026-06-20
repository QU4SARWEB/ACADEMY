CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  comment TEXT,
  source TEXT DEFAULT 'manual',
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grades_profile ON grades(profile_id);
CREATE INDEX IF NOT EXISTS idx_grades_category ON grades(category);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_manage_grades' AND tablename = 'grades') THEN
    CREATE POLICY "coaches_manage_grades" ON grades FOR ALL USING (public.is_coach());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_view_grades' AND tablename = 'grades') THEN
    CREATE POLICY "students_view_grades" ON grades FOR SELECT USING (profile_id = auth.uid());
  END IF;
END $$;
