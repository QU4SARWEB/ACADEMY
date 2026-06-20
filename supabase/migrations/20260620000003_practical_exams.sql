CREATE TABLE IF NOT EXISTS practical_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  has_overtime BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practical_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_exam_id UUID NOT NULL REFERENCES practical_exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 10,
  order_num INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS practical_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_exam_id UUID NOT NULL REFERENCES practical_exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_num INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS practical_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_team_id UUID NOT NULL REFERENCES practical_teams(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  team_number INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS practical_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practical_team_member_id UUID NOT NULL REFERENCES practical_team_members(id) ON DELETE CASCADE,
  practical_rubric_id UUID NOT NULL REFERENCES practical_rubrics(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('first_half','second_half','overtime')),
  score NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(practical_team_member_id, practical_rubric_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_practical_exams_course ON practical_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_practical_rubrics_exam ON practical_rubrics(practical_exam_id);
CREATE INDEX IF NOT EXISTS idx_practical_teams_exam ON practical_teams(practical_exam_id);
CREATE INDEX IF NOT EXISTS idx_practical_members_team ON practical_team_members(practical_team_id);
CREATE INDEX IF NOT EXISTS idx_practical_scores_member ON practical_scores(practical_team_member_id);

ALTER TABLE practical_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_manage_practical_exams' AND tablename = 'practical_exams') THEN
    CREATE POLICY "coaches_manage_practical_exams" ON practical_exams FOR ALL USING (public.is_coach());
    CREATE POLICY "coaches_manage_practical_rubrics" ON practical_rubrics FOR ALL USING (public.is_coach());
    CREATE POLICY "coaches_manage_practical_teams" ON practical_teams FOR ALL USING (public.is_coach());
    CREATE POLICY "coaches_manage_practical_members" ON practical_team_members FOR ALL USING (public.is_coach());
    CREATE POLICY "coaches_manage_practical_scores" ON practical_scores FOR ALL USING (public.is_coach());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_view_practical_exams' AND tablename = 'practical_exams') THEN
    CREATE POLICY "students_view_practical_exams" ON practical_exams FOR SELECT USING (true);
    CREATE POLICY "students_view_practical_rubrics" ON practical_rubrics FOR SELECT USING (true);
    CREATE POLICY "students_view_practical_teams" ON practical_teams FOR SELECT USING (true);
    CREATE POLICY "students_view_practical_members" ON practical_team_members FOR SELECT USING (true);
    CREATE POLICY "students_view_practical_scores" ON practical_scores FOR SELECT USING (true);
  END IF;
END $$;
