UPDATE payments SET amount = 15
WHERE status = 'pending'
  AND enrollment_id IN (
    SELECT e.id FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE c.slug NOT IN ('posicionamiento', 'clase-general', 'clase-complementaria')
  );
