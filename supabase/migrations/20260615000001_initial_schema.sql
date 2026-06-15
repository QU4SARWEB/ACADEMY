-- ============================================
-- QU4SAR WEB V2 — Complete Initial Schema
-- ============================================

-- 2. Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'player', 'coach')),
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT DEFAULT '',
  riot_id TEXT,
  rank TEXT DEFAULT 'Unranked',
  country TEXT,
  social_discord TEXT,
  social_youtube TEXT,
  social_twitter TEXT,
  social_twitch TEXT,
  institutional_email TEXT UNIQUE,
  scholarship BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Helper functions (defined here, after profiles table, for RLS policies)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'public'
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
  SELECT public.user_role() = 'coach';
$$ LANGUAGE SQL STABLE;

CREATE POLICY "users_view_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "coaches_view_all" ON profiles FOR SELECT USING (public.is_coach());
CREATE POLICY "users_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "coaches_update_all" ON profiles FOR UPDATE USING (public.is_coach());

-- 3. Seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_seasons_active ON seasons(is_active) WHERE is_active = true;

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_view" ON seasons FOR SELECT USING (public.user_role() IN ('student', 'player', 'coach'));
CREATE POLICY "coaches_manage" ON seasons FOR ALL USING (public.is_coach());

-- 4. Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  min_rank TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_season ON courses(season_id);
CREATE UNIQUE INDEX idx_courses_slug_season ON courses(slug, season_id);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view" ON courses FOR SELECT USING (public.is_coach() OR EXISTS (
  SELECT 1 FROM enrollments WHERE enrollments.course_id = courses.id AND enrollments.profile_id = auth.uid()
));
CREATE POLICY "coaches_manage" ON courses FOR ALL USING (public.is_coach());

-- 5. Course Modules
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  month_number INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modules_course ON course_modules(course_id);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view_modules" ON course_modules FOR SELECT USING (
  public.is_coach() OR EXISTS (
    SELECT 1 FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE c.id = course_modules.course_id AND e.profile_id = auth.uid()
  )
);
CREATE POLICY "coaches_manage_modules" ON course_modules FOR ALL USING (public.is_coach());

-- 6. Materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'image', 'link', 'embed')),
  url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_module ON materials(module_id);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view_materials" ON materials FOR SELECT USING (
  public.is_coach() OR EXISTS (
    SELECT 1 FROM course_modules cm
    JOIN courses c ON c.id = cm.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE cm.id = materials.module_id AND e.profile_id = auth.uid()
  )
);
CREATE POLICY "coaches_manage_materials" ON materials FOR ALL USING (public.is_coach());

-- 7. Enrollments
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('student', 'player')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recovery', 'graduated', 'inactive')),
  current_module INTEGER DEFAULT 1,
  final_grade NUMERIC(5,2),
  exam_score NUMERIC(5,2),
  promoted BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, season_id, course_id)
);

CREATE INDEX idx_enrollments_profile ON enrollments(profile_id);
CREATE INDEX idx_enrollments_season ON enrollments(season_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_enrollments" ON enrollments FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "coaches_view_enrollments" ON enrollments FOR SELECT USING (public.is_coach());
CREATE POLICY "coaches_manage_enrollments" ON enrollments FOR ALL USING (public.is_coach());

-- 8. Evaluations
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  weight NUMERIC(3,2) NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_module ON evaluations(module_id);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view_evaluations" ON evaluations FOR SELECT USING (public.is_coach() OR EXISTS (
  SELECT 1 FROM course_modules cm
  JOIN courses c ON c.id = cm.course_id
  JOIN enrollments e ON e.course_id = c.id
  WHERE cm.id = evaluations.module_id AND e.profile_id = auth.uid()
));
CREATE POLICY "coaches_manage_evaluations" ON evaluations FOR ALL USING (public.is_coach());

-- 9. Evaluation Results
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evaluation_id, enrollment_id)
);

CREATE INDEX idx_eval_results_evaluation ON evaluation_results(evaluation_id);
CREATE INDEX idx_eval_results_enrollment ON evaluation_results(enrollment_id);

ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_eval_results" ON evaluation_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = evaluation_results.enrollment_id AND profile_id = auth.uid())
);
CREATE POLICY "coaches_view_eval_results" ON evaluation_results FOR SELECT USING (public.is_coach());
CREATE POLICY "coaches_grade" ON evaluation_results FOR INSERT WITH CHECK (public.is_coach());
CREATE POLICY "coaches_update_grades" ON evaluation_results FOR UPDATE USING (public.is_coach());

-- 10. Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 100,
  allow_pdf BOOLEAN DEFAULT true,
  allow_image BOOLEAN DEFAULT true,
  allow_video BOOLEAN DEFAULT true,
  allow_audio BOOLEAN DEFAULT true,
  allow_link BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_module ON tasks(module_id);
CREATE INDEX idx_tasks_season ON tasks(season_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view_tasks" ON tasks FOR SELECT USING (public.is_coach() OR EXISTS (
  SELECT 1 FROM course_modules cm
  JOIN courses c ON c.id = cm.course_id
  JOIN enrollments e ON e.course_id = c.id
  WHERE cm.id = tasks.module_id AND e.profile_id = auth.uid()
));
CREATE POLICY "coaches_manage_tasks" ON tasks FOR ALL USING (public.is_coach());

-- 11. Task Submissions
CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'graded', 'late')),
  submission_text TEXT,
  files JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  score NUMERIC(5,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, enrollment_id)
);

CREATE INDEX idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_enrollment ON task_submissions(enrollment_id);

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_submissions" ON task_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = task_submissions.enrollment_id AND profile_id = auth.uid())
);
CREATE POLICY "coaches_manage_submissions" ON task_submissions FOR ALL USING (public.is_coach());

-- 12. Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
  verified_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, date)
);

CREATE INDEX idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX idx_attendance_season ON attendance(season_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = attendance.enrollment_id AND profile_id = auth.uid())
);
CREATE POLICY "coaches_manage_attendance" ON attendance FOR ALL USING (public.is_coach());

-- 13. Schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 24),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('academic', 'competitive')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_season ON schedules(season_id);
CREATE INDEX idx_schedules_week ON schedules(season_id, week_number);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrolled_view_schedules" ON schedules FOR SELECT USING (
  public.user_role() IN ('student', 'player', 'coach')
);
CREATE POLICY "coaches_manage_schedules" ON schedules FOR ALL USING (public.is_coach());

-- 14. Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_coaches_view_teams" ON teams FOR SELECT USING (public.user_role() IN ('player', 'coach'));
CREATE POLICY "coaches_manage_teams" ON teams FOR ALL USING (public.is_coach());

-- 15. Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('captain', 'player', 'substitute', 'coach')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, profile_id, season_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_profile ON team_members(profile_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_team_members" ON team_members FOR SELECT USING (
  public.is_coach() OR EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.profile_id = auth.uid() AND tm.team_id = team_members.team_id
  )
);
CREATE POLICY "coaches_manage_team_members" ON team_members FOR ALL USING (public.is_coach());

-- 16. Scrims
CREATE TABLE scrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  result TEXT CHECK (result IN ('win', 'loss', 'draw', 'pending')),
  score_quasar INTEGER,
  score_opponent INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrims_team ON scrims(team_id);
CREATE INDEX idx_scrims_season ON scrims(season_id);

ALTER TABLE scrims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_scrims" ON scrims FOR SELECT USING (
  public.is_coach() OR EXISTS (
    SELECT 1 FROM team_members WHERE team_members.team_id = scrims.team_id AND team_members.profile_id = auth.uid()
  )
);
CREATE POLICY "coaches_manage_scrims" ON scrims FOR ALL USING (public.is_coach());

-- 17. Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('student', 'player')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'scholarship', 'expired')),
  paid_at TIMESTAMPTZ,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_profile ON payments(profile_id);
CREATE INDEX idx_payments_season ON payments(season_id);
CREATE INDEX idx_payments_status ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_payments" ON payments FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "coaches_manage_payments" ON payments FOR ALL USING (public.is_coach());

-- 18. Messages (Internal Mail)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  thread_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_manage_messages" ON messages FOR ALL USING (public.is_coach());
CREATE POLICY "send_messages" ON messages FOR INSERT WITH CHECK (public.user_role() IN ('student', 'player', 'coach'));

-- 19. Message Recipients
CREATE TABLE message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, recipient_id)
);

CREATE INDEX idx_msg_recipients_recipient ON message_recipients(recipient_id);
CREATE INDEX idx_msg_recipients_unread ON message_recipients(recipient_id, read) WHERE read = false;

ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_recipients" ON message_recipients FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "update_own_recipients" ON message_recipients FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "coaches_manage_recipients" ON message_recipients FOR ALL USING (public.is_coach());

-- 20. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task','evaluation','schedule','payment','scrim','system','message','grade','promotion')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_notifications" ON notifications FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "insert_notifications" ON notifications FOR INSERT WITH CHECK (public.user_role() IN ('student', 'player', 'coach'));

-- 21. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_profile ON audit_logs(profile_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_view_audit_logs" ON audit_logs FOR SELECT USING (public.is_coach());
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT WITH CHECK (public.user_role() IN ('student', 'player', 'coach'));

-- 22. Public Profiles
CREATE TABLE public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  banner_url TEXT,
  display_name TEXT,
  bio TEXT,
  social_links JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_public_profiles_slug ON public_profiles(slug);

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON public_profiles FOR SELECT USING (true);
CREATE POLICY "own_update" ON public_profiles FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "coaches_manage_public" ON public_profiles FOR ALL USING (public.is_coach());

-- 23. Promotion Requirements
CREATE TABLE promotion_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  min_grade NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  min_rank TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id)
);

ALTER TABLE promotion_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_requirements" ON promotion_requirements FOR SELECT USING (true);
CREATE POLICY "coaches_manage_requirements" ON promotion_requirements FOR ALL USING (public.is_coach());

-- 24. Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  to_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  promoted_by UUID REFERENCES profiles(id),
  grade_at_time NUMERIC(5,2),
  rank_at_time TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_profile ON promotions(profile_id);
CREATE INDEX idx_promotions_enrollment ON promotions(enrollment_id);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_promotions" ON promotions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "coaches_view_promotions" ON promotions FOR SELECT USING (public.is_coach());
CREATE POLICY "coaches_insert_promotions" ON promotions FOR INSERT WITH CHECK (public.is_coach());

-- 25. Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certificates_profile ON certificates(profile_id);
CREATE INDEX idx_certificates_enrollment ON certificates(enrollment_id);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_certificates" ON certificates FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "coaches_view_certificates" ON certificates FOR SELECT USING (public.is_coach());
CREATE POLICY "coaches_insert_certificates" ON certificates FOR INSERT WITH CHECK (public.is_coach());

-- 26. Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_seasons BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_courses BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_modules BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_materials BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_enrollments BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_evaluations BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_eval_results BEFORE UPDATE ON evaluation_results FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_submissions BEFORE UPDATE ON task_submissions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_attendance BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_schedules BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_teams BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_scrims BEFORE UPDATE ON scrims FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_notifications BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_public_profiles BEFORE UPDATE ON public_profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_promotions BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_certificates BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_audit_logs BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_messages BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_message_recipients BEFORE UPDATE ON message_recipients FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
