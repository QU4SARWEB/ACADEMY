-- ============================================================
-- Auto-enroll students/players via DB triggers (server-side)
-- Elimina la dependencia del frontend para inscribir alumnos
-- ============================================================

-- 1. Reemplazar handle_new_user para incluir rank
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active, rank)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    true,
    COALESCE(NEW.raw_user_meta_data->>'rank', 'Unranked')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Función de auto-inscripción
CREATE OR REPLACE FUNCTION public.auto_enroll_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_season_id UUID;
  v_course_name TEXT;
  v_enrollment_id UUID;
BEGIN
  -- Solo para students/players
  IF NEW.role NOT IN ('student', 'player') THEN RETURN NEW; END IF;

  -- Mapear rango a nombre de curso
  v_course_name := CASE COALESCE(NEW.rank, 'Unranked')
    WHEN 'Unranked' THEN 'Rookie'
    WHEN 'Hierro' THEN 'Rookie'
    WHEN 'Bronce' THEN 'Trainee'
    WHEN 'Plata' THEN 'Amateur'
    WHEN 'Oro' THEN 'Competitor'
    WHEN 'Platino' THEN 'Elite'
    WHEN 'Diamante' THEN 'Semi-Pro'
    WHEN 'Ascendente' THEN 'Pro'
    WHEN 'Inmortal' THEN 'Pro'
    WHEN 'Radiante' THEN 'Pro'
    ELSE 'Rookie'
  END;

  -- Buscar curso por nombre, o cualquier activo
  SELECT id INTO v_course_id FROM public.courses WHERE name = v_course_name AND is_active = true ORDER BY display_order LIMIT 1;
  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id FROM public.courses WHERE is_active = true ORDER BY display_order LIMIT 1;
  END IF;

  -- Buscar temporada activa
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  -- Crear enrollment + payment si tenemos curso y temporada
  IF v_course_id IS NOT NULL AND v_season_id IS NOT NULL THEN
    INSERT INTO public.enrollments (profile_id, course_id, season_id, type, status)
    VALUES (NEW.id, v_course_id, v_season_id, NEW.role, 'active')
    ON CONFLICT (profile_id, course_id, season_id) DO NOTHING
    RETURNING id INTO v_enrollment_id;

    IF v_enrollment_id IS NOT NULL THEN
      INSERT INTO public.payments (profile_id, enrollment_id, season_id, type, amount, status)
      VALUES (NEW.id, v_enrollment_id, v_season_id, NEW.role, 1.54, CASE WHEN NEW.scholarship THEN 'scholarship' ELSE 'pending' END)
      ON CONFLICT (enrollment_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger que se dispara al crear un perfil
DROP TRIGGER IF EXISTS trg_auto_enroll ON public.profiles;
CREATE TRIGGER trg_auto_enroll
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_on_insert();
