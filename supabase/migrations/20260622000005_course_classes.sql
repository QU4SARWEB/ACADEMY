CREATE TABLE IF NOT EXISTS course_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT,
  materials JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE course_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage classes" ON course_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

CREATE POLICY "Students can view classes" ON course_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = course_classes.course_id
      AND enrollments.profile_id = auth.uid()
      AND enrollments.status = 'active'
    )
  );
