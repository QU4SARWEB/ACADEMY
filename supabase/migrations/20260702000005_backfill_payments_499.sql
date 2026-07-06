UPDATE payments SET amount = 4.99
WHERE amount = 1.54
  AND enrollment_id IN (
    SELECT e.id FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE c.slug NOT IN ('posicionamiento', 'clase-complementaria')
  );
