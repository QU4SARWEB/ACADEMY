# QU4SAR WEB V2 — Database Schema

> Esquema completo de base de datos para QU4SAR Academy.
> PostgreSQL vía Supabase.

---

## Convenciones

- **UUID** como Primary Key en todas las tablas (`gen_random_uuid()`)
- **Timestamps**: `created_at` y `updated_at` en todas las tablas
- **Soft delete** no implementado (hard delete con logs de auditoría)
- **RLS** habilitado en todas las tablas
- **Índices** en todas las foreign keys y columnas de búsqueda frecuente

---

## 1. Tabla: `profiles`

Extensión del auth.users de Supabase. Un perfil por usuario.

```sql
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

-- Índices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_institutional_email ON profiles(institutional_email);
CREATE INDEX idx_profiles_riot_id ON profiles(riot_id);
```

**RLS:**
- `SELECT`: El propio usuario, coaches, o público (solo perfiles públicos)
- `INSERT`: El propio usuario (vía trigger after signup)
- `UPDATE`: El propio usuario o coaches
- `DELETE`: Solo coaches

---

## 2. Tabla: `seasons`

Ciclos académicos/competitivos.

```sql
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
```

**RLS:**
- `SELECT`: Todos los autenticados
- `INSERT/UPDATE/DELETE`: Solo coaches

---

## 3. Tabla: `courses`

Cursos del programa académico (Rookie → Pro).

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  min_rank TEXT NOT NULL, -- Rango mínimo requerido
  duration_months INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_season ON courses(season_id);
CREATE UNIQUE INDEX idx_courses_slug_season ON courses(slug, season_id);
```

**RLS:**
- `SELECT`: Todos los autenticados
- `INSERT/UPDATE/DELETE`: Solo coaches

---

## 4. Tabla: `course_modules`

Módulos dentro de un curso (1 por mes).

```sql
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  month_number INTEGER NOT NULL, -- 1-12
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modules_course ON course_modules(course_id);
```

**RLS:** Mismo que courses.

---

## 5. Tabla: `materials`

Materiales didácticos dentro de un módulo.

```sql
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
```

**RLS:** Mismo que courses.

---

## 6. Tabla: `enrollments`

Inscripción de estudiantes/players a cursos y seasons.

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('student', 'player')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'recovery', 'graduated', 'inactive')),
  current_module INTEGER DEFAULT 1,
  final_grade NUMERIC(5,2),
  promoted BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, season_id, course_id)
);

CREATE INDEX idx_enrollments_profile ON enrollments(profile_id);
CREATE INDEX idx_enrollments_season ON enrollments(season_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

**RLS:**
- `SELECT`: Propio estudiante, coaches, o coaches del equipo
- `INSERT/UPDATE/DELETE`: Solo coaches

---

## 7. Tabla: `evaluations`

Evaluaciones dentro de un módulo.

```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  weight NUMERIC(3,2) NOT NULL DEFAULT 0, -- Porcentaje del 35% total de evaluaciones
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_module ON evaluations(module_id);
```

**RLS:** Mismo que courses.

---

## 8. Tabla: `evaluation_results`

Resultados de evaluaciones por estudiante.

```sql
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
```

**RLS:**
- `SELECT`: Propio estudiante, coaches
- `INSERT/UPDATE/DELETE`: Solo coaches

---

## 9. Tabla: `exams`

Exámenes finales de curso.

```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  weight NUMERIC(3,2) NOT NULL DEFAULT 0.50, -- 50% de la nota final
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_course ON exams(course_id);
```

---

## 10. Tabla: `exam_results`

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, enrollment_id)
);

CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_enrollment ON exam_results(enrollment_id);
```

---

## 11. Tabla: `tasks`

Tareas asignadas a estudiantes.

```sql
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
```

---

## 12. Tabla: `task_submissions`

Entregas de tareas por estudiante.

```sql
CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'reviewed', 'graded', 'late')),
  submission_text TEXT,
  files JSONB DEFAULT '[]', -- Array de {url, type, name}
  links JSONB DEFAULT '[]', -- Array de {url, title}
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
CREATE INDEX idx_task_submissions_status ON task_submissions(status);
```

---

## 13. Tabla: `attendance`

Registro de asistencia.

```sql
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
CREATE INDEX idx_attendance_date ON attendance(date);
```

---

## 14. Tabla: `schedules`

Horarios (académicos y competitivos).

```sql
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
  location TEXT, -- Online / presencial
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_season ON schedules(season_id);
CREATE INDEX idx_schedules_week ON schedules(season_id, week_number);
```

---

## 15. Tabla: `teams`

Equipos competitivos.

```sql
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
```

---

## 16. Tabla: `team_members`

Miembros de equipos por season.

```sql
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
CREATE INDEX idx_team_members_season ON team_members(season_id);
```

---

## 17. Tabla: `scrims`

Prácticas/partidos amistosos.

```sql
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
```

---

## 18. Tabla: `scrim_participants`

Jugadores que participaron en un scrim.

```sql
CREATE TABLE scrim_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID NOT NULL REFERENCES scrims(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT true,
  stats JSONB DEFAULT '{}', -- {kills, deaths, assists, acs, adr}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scrim_id, profile_id)
);

CREATE INDEX idx_scrim_participants_scrim ON scrim_participants(scrim_id);
```

---

## 19. Tabla: `payments`

Registro de pagos.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('student', 'player')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'scholarship', 'expired')),
  paid_at TIMESTAMPTZ,
  method TEXT, -- Stripe, manual, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_profile ON payments(profile_id);
CREATE INDEX idx_payments_season ON payments(season_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

## 20. Tabla: `notifications`

Notificaciones del sistema.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL CHECK (type IN ('task', 'evaluation', 'schedule', 'payment', 'scrim', 'system', 'message')),
  reference_id UUID, -- ID del objeto relacionado
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id, read) WHERE read = false;
```

---

## 21. Tabla: `mails` (Futuro — Post-MVP)

Correo interno.

```sql
CREATE TABLE mails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mail_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id UUID NOT NULL REFERENCES mails(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent')),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  UNIQUE(mail_id, recipient_id)
);

CREATE INDEX idx_mails_sender ON mails(sender_id);
CREATE INDEX idx_mail_recipients ON mail_recipients(recipient_id);
CREATE INDEX idx_mail_folder ON mail_recipients(recipient_id, folder);
```

---

## 22. Tabla: `audit_logs`

Registro de auditoría.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  ip TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_profile ON audit_logs(profile_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## 23. Tabla: `public_profiles`

Perfiles públicos generados automáticamente.

```sql
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
```

---

## 24. Tabla: `promotion_requirements`

Requisitos de promoción por curso.

```sql
CREATE TABLE promotion_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  min_grade NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  min_rank TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id)
);
```

---

## Resumen de Tablas (23)

| # | Tabla | Propósito |
|---|---|---|
| 1 | `profiles` | Perfiles de usuario (extensión de auth.users) |
| 2 | `seasons` | Ciclos académicos/competitivos |
| 3 | `courses` | Cursos del programa (Rookie→Pro) |
| 4 | `course_modules` | Módulos por curso |
| 5 | `materials` | Materiales didácticos |
| 6 | `enrollments` | Inscripciones a cursos |
| 7 | `evaluations` | Evaluaciones |
| 8 | `evaluation_results` | Resultados de evaluaciones |
| 9 | `exams` | Exámenes finales |
| 10 | `exam_results` | Resultados de exámenes |
| 11 | `tasks` | Tareas |
| 12 | `task_submissions` | Entregas de tareas |
| 13 | `attendance` | Asistencia |
| 14 | `schedules` | Horarios (académico + competitivo) |
| 15 | `teams` | Equipos (multi-team) |
| 16 | `team_members` | Miembros de equipos por season |
| 17 | `scrims` | Scrims |
| 18 | `scrim_participants` | Participantes de scrims |
| 19 | `payments` | Pagos y becas |
| 20 | `notifications` | Notificaciones |
| 21 | `mails` / `mail_recipients` | Correo interno (futuro) |
| 22 | `audit_logs` | Auditoría |
| 23 | `public_profiles` | Perfiles públicos |
| 24 | `promotion_requirements` | Requisitos de promoción |

---

> **Próximo paso:** Generar migración SQL ejecutable en Supabase.
