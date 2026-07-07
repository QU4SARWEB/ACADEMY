-- Course tasks (homework/assignments per course per week)
CREATE TABLE IF NOT EXISTS course_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  week_number INTEGER NOT NULL DEFAULT 1,
  due_date DATE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE course_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_tasks ON course_tasks
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY users_read_tasks ON course_tasks
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM course_assignments WHERE coach_id = auth.uid()
      UNION
      SELECT e.course_id FROM enrollments e WHERE e.profile_id = auth.uid()
    )
  );

-- Task submissions (student work)
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES course_tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  files JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  score NUMERIC(4,1) CHECK (score >= 0 AND score <= 20),
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_id, student_id)
);

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_submissions ON task_submissions
  FOR ALL USING (
    task_id IN (SELECT id FROM course_tasks WHERE coach_id = auth.uid())
  );

CREATE POLICY users_manage_own_submissions ON task_submissions
  FOR ALL USING (student_id = auth.uid());
