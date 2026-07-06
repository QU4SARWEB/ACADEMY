ALTER TABLE monthly_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_monthly_grades ON monthly_grades
  FOR ALL USING (is_coach());

CREATE POLICY users_view_own_monthly_grades ON monthly_grades
  FOR SELECT USING (
    enrollment_id IN (
      SELECT id FROM enrollments WHERE profile_id = auth.uid()
    )
  );
