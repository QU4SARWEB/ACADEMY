CREATE POLICY "students_view_tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');
