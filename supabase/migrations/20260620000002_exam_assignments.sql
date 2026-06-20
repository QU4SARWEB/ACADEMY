CREATE TABLE IF NOT EXISTS exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam ON exam_assignments(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_profile ON exam_assignments(profile_id);

ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_manage_exam_assignments' AND tablename = 'exam_assignments') THEN
    CREATE POLICY "coaches_manage_exam_assignments" ON exam_assignments FOR ALL USING (public.is_coach());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_view_exam_assignments' AND tablename = 'exam_assignments') THEN
    CREATE POLICY "students_view_exam_assignments" ON exam_assignments FOR SELECT USING (profile_id = auth.uid());
  END IF;
END $$;
