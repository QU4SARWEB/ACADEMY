-- Add unique constraint to prevent duplicate enrollments
ALTER TABLE enrollments ADD CONSTRAINT uq_enrollments_profile_course_season UNIQUE (profile_id, course_id, season_id);
