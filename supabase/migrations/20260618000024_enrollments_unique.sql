DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_enrollments_profile_course_season') THEN
    ALTER TABLE enrollments ADD CONSTRAINT uq_enrollments_profile_course_season UNIQUE (profile_id, course_id, season_id);
  END IF;
END $$;
