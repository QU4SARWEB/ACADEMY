-- Course assignments (coach → course)
CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (coach_id, course_id)
);

ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_assignments ON course_assignments
  FOR ALL USING (true);

-- Class grades (theory 0-5 + practice 0-15 = total 0-20 per student per schedule)
CREATE TABLE IF NOT EXISTS class_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theory_score NUMERIC(4,1) CHECK (theory_score >= 0 AND theory_score <= 5),
  practice_score NUMERIC(4,1) CHECK (practice_score >= 0 AND practice_score <= 15),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE (schedule_id, student_id)
);

ALTER TABLE class_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_grades ON class_grades
  FOR ALL USING (coach_id = auth.uid());

-- Function to get courses assigned to a coach
CREATE OR REPLACE FUNCTION public.get_assigned_course_ids(p_coach_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS 'SELECT course_id FROM course_assignments WHERE coach_id = p_coach_id';
