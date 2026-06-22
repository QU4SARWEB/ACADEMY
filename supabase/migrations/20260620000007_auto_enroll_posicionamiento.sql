-- Update auto_enroll to always use Posicionamiento course
CREATE OR REPLACE FUNCTION public.auto_enroll_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_course_id UUID;
  v_enrollment_id UUID;
BEGIN
  IF NEW.role NOT IN ('student', 'player') THEN RETURN NEW; END IF;
  -- Always enroll in the free Posicionamiento course
  SELECT id INTO v_course_id FROM public.courses WHERE slug = 'posicionamiento' AND is_active = true LIMIT 1;
  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id FROM public.courses WHERE is_active = true ORDER BY display_order LIMIT 1;
  END IF;
  IF v_course_id IS NOT NULL THEN
    INSERT INTO public.enrollments (profile_id, course_id, type, status)
    VALUES (NEW.id, v_course_id, NEW.role, 'active')
    ON CONFLICT (profile_id, course_id) DO NOTHING
    RETURNING id INTO v_enrollment_id;
    IF v_enrollment_id IS NOT NULL AND NEW.scholarship IS DISTINCT FROM true THEN
      INSERT INTO public.payments (profile_id, enrollment_id, type, amount, status)
      VALUES (NEW.id, v_enrollment_id, NEW.role, 0, 'paid')
      ON CONFLICT (enrollment_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Insert the Posicionamiento course if it doesn't exist
INSERT INTO courses (name, slug, description, duration_months, min_rank, display_order, price, is_active)
VALUES ('Posicionamiento', 'posicionamiento', 'Curso gratuito de posicionamiento para todos los alumnos sin importar su rango.', 1, '', 0, 0, true)
ON CONFLICT (slug) DO NOTHING;
