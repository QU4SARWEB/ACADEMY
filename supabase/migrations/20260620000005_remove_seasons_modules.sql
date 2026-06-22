-- Remove seasons and modules from the schema
-- Step 1: Drop foreign key constraints to seasons

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_season_id_fkey;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_season_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_season_id_fkey;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_season_id_fkey;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_season_id_fkey;
ALTER TABLE scrims DROP CONSTRAINT IF EXISTS scrims_season_id_fkey;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_season_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_season_id_fkey;
ALTER TABLE coach_assignments DROP CONSTRAINT IF EXISTS coach_assignments_season_id_fkey;

-- Step 2: Drop season_id columns

ALTER TABLE courses DROP COLUMN IF EXISTS season_id;
ALTER TABLE enrollments DROP COLUMN IF EXISTS season_id;
ALTER TABLE payments DROP COLUMN IF EXISTS season_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS season_id;
ALTER TABLE schedules DROP COLUMN IF EXISTS season_id;
ALTER TABLE scrims DROP COLUMN IF EXISTS season_id;
ALTER TABLE team_members DROP COLUMN IF EXISTS season_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS season_id;
ALTER TABLE coach_assignments DROP COLUMN IF EXISTS season_id;

-- Step 3: Drop unique indexes that included season_id

DROP INDEX IF EXISTS idx_courses_slug_season;
DROP INDEX IF EXISTS idx_enrollments_season;
DROP INDEX IF EXISTS idx_payments_season;
DROP INDEX IF EXISTS idx_attendance_season;
DROP INDEX IF EXISTS idx_schedules_season;
DROP INDEX IF EXISTS idx_schedules_week;
DROP INDEX IF EXISTS idx_scrims_season;
DROP INDEX IF EXISTS idx_tasks_season;
DROP INDEX IF EXISTS idx_seasons_active;

-- Step 4: Drop enrollments unique constraint and recreate without season_id

ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS uq_enrollments_profile_course_season;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_profile_id_course_id_season_id_key;
ALTER TABLE enrollments ADD CONSTRAINT uq_enrollments_profile_course UNIQUE (profile_id, course_id);

-- Step 5: Drop team_members unique constraint and recreate without season_id

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_profile_id_season_id_key;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS uq_team_members_team_profile_season;
ALTER TABLE team_members ADD CONSTRAINT uq_team_members_team_profile UNIQUE (team_id, profile_id);

-- Step 6: Drop foreign key constraints to course_modules

ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_module_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_module_id_fkey;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_module_id_fkey;

-- Step 7: Drop module_id columns

ALTER TABLE materials DROP COLUMN IF EXISTS module_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS module_id;
ALTER TABLE exams DROP COLUMN IF EXISTS module_id;

-- Step 8: Drop indexes on module_id

DROP INDEX IF EXISTS idx_materials_module;
DROP INDEX IF EXISTS idx_tasks_module;
DROP INDEX IF EXISTS idx_exams_module;

-- Step 9: Drop tables

DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS course_modules CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;

-- Step 10: Drop certificates table (references season_id)

ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_season_id_fkey;
ALTER TABLE certificates DROP COLUMN IF EXISTS season_id;

-- Step 11: Recreate the auto_enroll_on_insert function without season references

CREATE OR REPLACE FUNCTION public.auto_enroll_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_course_id UUID;
  v_course_name TEXT;
  v_rank_base TEXT;
  v_enrollment_id UUID;
BEGIN
  IF NEW.role NOT IN ('student', 'player') THEN RETURN NEW; END IF;
  v_rank_base := SPLIT_PART(COALESCE(NEW.rank, 'Unranked'), ' ', 1);
  v_course_name := CASE v_rank_base
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
  SELECT id INTO v_course_id FROM public.courses WHERE name = v_course_name AND is_active = true ORDER BY display_order LIMIT 1;
  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id FROM public.courses WHERE is_active = true ORDER BY display_order LIMIT 1;
  END IF;
  IF v_course_id IS NOT NULL THEN
    INSERT INTO public.enrollments (profile_id, course_id, type, status)
    VALUES (NEW.id, v_course_id, NEW.role, 'active')
    ON CONFLICT (profile_id, course_id) DO NOTHING
    RETURNING id INTO v_enrollment_id;
    IF v_enrollment_id IS NOT NULL THEN
      INSERT INTO public.payments (profile_id, enrollment_id, type, amount, status)
      VALUES (NEW.id, v_enrollment_id, NEW.role, 1.54, CASE WHEN NEW.scholarship THEN 'scholarship' ELSE 'pending' END)
      ON CONFLICT (enrollment_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
