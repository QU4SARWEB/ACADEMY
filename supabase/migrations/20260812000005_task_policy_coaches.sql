-- Permitir a los coaches asignados a un curso gestionar sus tareas
-- (antes solo podia el coach_id de la tarea, lo que bloqueaba editar/mover tareas creadas por otros coaches del curso)
DROP POLICY IF EXISTS coaches_manage_tasks ON course_tasks;

CREATE POLICY coaches_manage_tasks ON course_tasks
  FOR ALL USING (
    coach_id = auth.uid()
    OR course_id IN (SELECT course_id FROM course_assignments WHERE coach_id = auth.uid())
  );

-- Bloquear en la base de datos la entrega de tareas vencidas
DROP POLICY IF EXISTS users_manage_own_submissions ON task_submissions;

CREATE POLICY users_manage_own_submissions ON task_submissions
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND (
      (SELECT due_date FROM course_tasks WHERE course_tasks.id = task_submissions.task_id) IS NULL
      OR (SELECT due_date FROM course_tasks WHERE course_tasks.id = task_submissions.task_id) >= CURRENT_DATE
    )
  );
