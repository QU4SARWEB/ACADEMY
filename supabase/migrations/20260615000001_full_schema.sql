-- ============================================================
-- Full QU4SAR Academy Schema (from PLAN.md v3)
-- Run after 00001_profiles.sql
-- ============================================================

-- SEASONS
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACADEMY RANKS
CREATE TABLE IF NOT EXISTS academy_ranks (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL,
  meses_min INT NOT NULL,
  meses_max INT NOT NULL
);

-- VALORANT RANKS
CREATE TABLE IF NOT EXISTS valorant_ranks (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL,
  icon_url TEXT
);

-- STUDENT LEVELS
CREATE TABLE IF NOT EXISTS student_levels (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  nivel INT NOT NULL,
  xp_requerido INT NOT NULL
);

-- COURSES
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  coach_id UUID REFERENCES profiles(id),
  academy_rank_requerido INT REFERENCES academy_ranks(id),
  duracion_meses INT,
  is_published BOOLEAN DEFAULT false,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MODULES
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL
);

-- LESSONS
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  contenido TEXT,
  tipo TEXT CHECK (tipo IN ('video', 'articulo', 'guia', 'ejercicio')),
  duracion_minutos INT,
  orden INT NOT NULL
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT CHECK (tipo IN ('vod', 'quiz', 'practica', 'reflexion')),
  fecha_limite INT,
  xp_recompensa INT DEFAULT 0
);

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  coach_id UUID REFERENCES profiles(id),
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'active' CHECK (estado IN ('active', 'completed', 'dropped')),
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASK SUBMISSIONS
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  student_id UUID REFERENCES profiles(id),
  url TEXT,
  nota TEXT,
  estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending', 'approved', 'rejected')),
  feedback TEXT,
  xp_ganado INT DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- LESSON PROGRESS
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  lesson_id UUID REFERENCES lessons(id),
  completado BOOLEAN DEFAULT false,
  completado_at TIMESTAMPTZ
);

-- TRAINING SESSIONS
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('class', 'vod_review', 'scrim', 'aim_training', 'theory', 'custom')),
  scheduled_at TIMESTAMPTZ,
  duration_minutes INT,
  max_students INT,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRAINING PARTICIPANTS
CREATE TABLE IF NOT EXISTS training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMPTZ
);

-- XP TRANSACTIONS
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  cantidad INT NOT NULL,
  tipo TEXT CHECK (tipo IN ('task_completed', 'scrim_win', 'achievement', 'attendance', 'coach_bonus', 'streak_bonus', 'goal_completed', 'adjustment')),
  referencia_id UUID,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STREAKS
CREATE TABLE IF NOT EXISTS student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  coach_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT,
  current_value NUMERIC,
  target_value NUMERIC NOT NULL,
  unit TEXT,
  progress INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  fecha_inicio DATE,
  fecha_limite DATE,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon_url TEXT,
  xp_recompensa INT DEFAULT 0,
  criterio JSONB
);

-- STUDENT ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  season_id UUID REFERENCES seasons(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- BADGES
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon_url TEXT,
  tipo TEXT CHECK (tipo IN ('rank', 'special', 'seasonal', 'event'))
);

-- STUDENT BADGES
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACADEMY PROGRESS
CREATE TABLE IF NOT EXISTS academy_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) UNIQUE,
  completion_percentage INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  total_scrims INT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_goals_completed INT DEFAULT 0,
  total_achievements INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id),
  captain_id UUID REFERENCES profiles(id),
  logo_url TEXT,
  description TEXT,
  game TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disbanded')),
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  rol TEXT,
  fecha_ingreso DATE,
  fecha_salida DATE,
  is_active BOOLEAN DEFAULT true
);

-- TEAM STATS
CREATE TABLE IF NOT EXISTS team_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  winrate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (wins + losses + draws) > 0
    THEN ROUND((wins::NUMERIC / (wins + losses + draws)) * 100, 1)
    ELSE 0 END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCRIMS
CREATE TABLE IF NOT EXISTS scrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  opponent TEXT,
  fecha TIMESTAMPTZ,
  mapas TEXT[],
  resultado TEXT CHECK (resultado IN ('win', 'loss', 'draw')),
  score TEXT,
  vod_url TEXT,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCRIM PARTICIPANTS
CREATE TABLE IF NOT EXISTS scrim_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  agente TEXT,
  acs INT,
  kda TEXT
);

-- MATCH REVIEWS
CREATE TABLE IF NOT EXISTS match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  resumen TEXT,
  puntos_fuertes TEXT[],
  puntos_mejora TEXT[],
  nota_global INT CHECK (nota_global BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOD REVIEWS
CREATE TABLE IF NOT EXISTS vod_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  coach_id UUID REFERENCES profiles(id),
  video_url TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  game TEXT,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOD COMMENTS
CREATE TABLE IF NOT EXISTS vod_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES vod_reviews(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  timestamp_seconds INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'upcoming' CHECK (estado IN ('upcoming', 'ongoing', 'finished', 'cancelled')),
  bracket JSONB,
  season_id UUID REFERENCES seasons(id)
);

-- TOURNAMENT PARTICIPANTS
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  student_id UUID REFERENCES profiles(id),
  seed INT
);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  coach_id UUID REFERENCES profiles(id),
  fecha DATE NOT NULL,
  tipo TEXT CHECK (tipo IN ('class', 'scrim', 'training', 'meeting')),
  presente BOOLEAN DEFAULT true,
  justificacion TEXT,
  season_id UUID REFERENCES seasons(id),
  UNIQUE(student_id, fecha, tipo)
);

-- COACH REVIEWS
CREATE TABLE IF NOT EXISTS coach_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  coach_id UUID REFERENCES profiles(id),
  titulo TEXT,
  contenido TEXT,
  nota_global INT CHECK (nota_global BETWEEN 1 AND 10),
  habilidades JSONB,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'coach', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  titulo TEXT NOT NULL,
  contenido TEXT,
  tipo TEXT CHECK (tipo IN ('achievement', 'review', 'task', 'payment', 'announcement', 'scrim', 'goal', 'system')),
  referencia_id UUID,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO academy_ranks (nombre, orden, meses_min, meses_max) VALUES
  ('Curso', 1, 1, 2),
  ('Rookie', 2, 3, 4),
  ('Trainee', 3, 5, 5),
  ('Amateur', 4, 6, 7),
  ('Elite', 5, 8, 9),
  ('Semi-Pro', 6, 10, 11),
  ('Pro', 7, 12, 99)
ON CONFLICT DO NOTHING;

INSERT INTO valorant_ranks (nombre, orden) VALUES
  ('Iron', 1), ('Bronze', 2), ('Silver', 3), ('Gold', 4),
  ('Platinum', 5), ('Diamond', 6), ('Ascendant', 7),
  ('Immortal', 8), ('Radiant', 9)
ON CONFLICT DO NOTHING;

INSERT INTO student_levels (nombre, nivel, xp_requerido) VALUES
  ('Novato', 1, 0), ('Aprendiz', 2, 500), ('Intermedio', 3, 1500),
  ('Avanzado', 4, 3000), ('Experto', 5, 5000), ('Élite', 6, 8000),
  ('Maestro', 7, 12000)
ON CONFLICT DO NOTHING;

-- Create a default active season
INSERT INTO seasons (name, start_date, end_date, is_active)
SELECT 'Season 1 - 2026', '2026-06-01', '2026-12-31', true
WHERE NOT EXISTS (SELECT 1 FROM seasons WHERE is_active = true);

-- RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_reviews ENABLE ROW LEVEL SECURITY;

-- Basic RLS: admins see all, students see own
CREATE POLICY "admins_all" ON seasons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "all_read" ON seasons FOR SELECT USING (true);

CREATE POLICY "admins_all_courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_all_courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_read_courses" ON courses FOR SELECT USING (true);

CREATE POLICY "admins_all_enrollments" ON enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_own_enrollments" ON enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_own_enrollments" ON enrollments FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "admins_all_training" ON training_sessions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_own_training" ON training_sessions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_read_training" ON training_sessions FOR SELECT USING (true);

CREATE POLICY "admins_all_goals" ON goals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_own_goals" ON goals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_own_goals" ON goals FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "admins_all_teams" ON teams FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "all_read_teams" ON teams FOR SELECT USING (true);

CREATE POLICY "admins_all_scrims" ON scrims FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "all_read_scrims" ON scrims FOR SELECT USING (true);

CREATE POLICY "admins_all_announcements" ON announcements FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "all_read_announcements" ON announcements FOR SELECT USING (true);

CREATE POLICY "users_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admins_all_vod" ON vod_reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_own_vod" ON vod_reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_own_vod" ON vod_reviews FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "admins_all_reviews" ON coach_reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaches_own_reviews" ON coach_reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "students_own_reviews" ON coach_reviews FOR SELECT USING (auth.uid() = student_id);
