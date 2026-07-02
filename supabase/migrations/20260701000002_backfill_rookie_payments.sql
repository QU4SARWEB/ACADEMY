DO $$
DECLARE
  v_course_id UUID;
  v_count INT;
BEGIN
  -- Find the Rookie course (case-insensitive, trim)
  SELECT id INTO v_course_id FROM courses
  WHERE LOWER(TRIM(name)) = 'rookie' OR LOWER(TRIM(slug)) = 'rookie'
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE NOTICE 'No se encontró el curso Rookie';
    RETURN;
  END IF;

  -- Create payments for Rookie enrollments without one
  INSERT INTO payments (profile_id, enrollment_id, type, amount, status)
  SELECT
    e.profile_id,
    e.id,
    COALESCE(e.type, 'student'),
    COALESCE(c.price, 1.54),
    'pending'
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id AND c.id = v_course_id
  LEFT JOIN payments p ON p.enrollment_id = e.id
  WHERE p.id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Creados % pagos pendientes para Rookie', v_count;
END $$;
