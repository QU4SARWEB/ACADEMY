DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['courses','course_modules','materials','enrollments','tasks','task_submissions',
    'exams','exam_questions','exam_attempts','student_answers','questions','question_options',
    'schedules','seasons','teams','team_members','scrims','promotions',
    'attendance','payments','profiles','support_tickets','ticket_responses',
    'conversations','conversation_participants','chat_messages','notifications',
    'certificates','coach_assignments','member_achievements','member_vods',
    'promotion_requirements','public_profiles'])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, ignore
      END;
    END IF;
  END LOOP;
END;
$$;
