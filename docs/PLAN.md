# PLAN QU4SAR eSports Academy v3

> **"Sistema operativo de entrenamiento competitivo para esports"**

No es un LMS. Es una plataforma donde todo gira alrededor de:
entrenar → practicar → revisar → competir → mejorar.

Progreso, disciplina, XP, logros, feedback de coach, rachas, objetivos, temporadas y evolución.

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | HTML/CSS/JS vanilla (estático puro) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Hosting | Local (Live Server / `serve`) → Cloudflare Pages o Vercel después |
| Tema | Dark mode + Morado (#8B5CF6 neon) |

---

## Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `admin` | Full access, gestión de coaches, pagos, sistema, temporadas |
| `coach` | CRUD total en cursos, training sessions, alumnos/jugadores, scrims, feedback, goals |
| `student` | Acceso a cursos, perfil, progreso, XP, logros, scrims, VOD reviews |
| `jugador` | Portal separado: cursos, horarios, training, scrims propios |

Los coaches asignan el rol. No hay autoselección por parte del usuario en registro.

---

## Sistema de Rangos

Dos ejes independientes. Un alumno puede ser `Trainee` en academia y `Diamond` en el juego.

### Academy Ranks (progreso académico)

| Rango | Meses |
|-------|-------|
| Curso | 1-2 |
| Rookie | 3-4 |
| Trainee | 5 |
| Amateur | 6-7 |
| Elite | 8-9 |
| Semi-Pro | 10-11 |
| Pro | 12+ |

### Valorant Ranks (rango competitivo)

Iron → Bronze → Silver → Gold → Platinum → Diamond → Ascendant → Immortal → Radiant

---

## Temporadas (Seasons)

Todo el ecosistema vive por temporadas. Cada season tiene 3-6 meses y resetea ciertos progresos.

Tablas que apuntan a `season_id`:
- `student_achievements`
- `scrims`
- `attendance`
- `xp_transactions`
- `goals`
- `tournaments`
- `training_sessions`
- `teams`
- `enrollments`
- `vod_reviews`
- `coach_reviews`

---

## Dashboard competitivo

El dashboard principal NO es una lista de cursos. Muestra:

```
Nivel actual        XP actual          Barra de XP
Rango Academia      Rango Valorant     Streak actual
Objetivos activos   Próxima clase      Próximo scrim
Último feedback     Logros recientes   Temporada actual
```

---

## Esquema de Base de Datos (Supabase/PostgreSQL)

```sql
-- ============================================================
-- SEASONS
-- ============================================================

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE
-- ============================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('admin', 'coach', 'student', 'jugador')),
  is_competitive BOOLEAN DEFAULT false,
  student_type TEXT CHECK (student_type IN ('casual', 'competitive')) DEFAULT 'casual',
  academy_rank_id INT REFERENCES academy_ranks(id),
  valorant_rank_id INT REFERENCES valorant_ranks(id),
  xp INT DEFAULT 0,
  level_id INT REFERENCES student_levels(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RANKS
-- ============================================================

CREATE TABLE academy_ranks (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL,
  meses_min INT NOT NULL,
  meses_max INT NOT NULL
);

CREATE TABLE valorant_ranks (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL,
  icon_url TEXT
);

-- ============================================================
-- ACADEMY (cursos, módulos, lecciones, tareas)
-- ============================================================

CREATE TABLE courses (
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

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  contenido TEXT,
  tipo TEXT CHECK (tipo IN ('video', 'articulo', 'guia', 'ejercicio')),
  duracion_minutos INT,
  orden INT NOT NULL
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT CHECK (tipo IN ('vod', 'quiz', 'practica', 'reflexion')),
  fecha_limite INT,
  xp_recompensa INT DEFAULT 0
);

-- ============================================================
-- ENROLLMENTS & PROGRESS
-- ============================================================

CREATE TABLE enrollments (
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

CREATE TABLE task_submissions (
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

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  lesson_id UUID REFERENCES lessons(id),
  completado BOOLEAN DEFAULT false,
  completado_at TIMESTAMPTZ
);

-- ============================================================
-- TRAINING SESSIONS (núcleo de QU4SAR)
-- ============================================================

CREATE TABLE training_sessions (
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

CREATE TABLE training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMPTZ
);

-- ============================================================
-- XP & LEVELS
-- ============================================================

CREATE TABLE student_levels (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  nivel INT NOT NULL,
  xp_requerido INT NOT NULL
);

CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  cantidad INT NOT NULL,
  tipo TEXT CHECK (tipo IN ('task_completed', 'scrim_win', 'achievement', 'attendance',
                            'coach_bonus', 'streak_bonus', 'goal_completed', 'adjustment')),
  referencia_id UUID,
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STREAKS
-- ============================================================

CREATE TABLE student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) UNIQUE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GOALS (objetivos coach → alumno)
-- ============================================================

CREATE TABLE goals (
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

-- ============================================================
-- ACHIEVEMENTS & BADGES
-- ============================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon_url TEXT,
  xp_recompensa INT DEFAULT 0,
  criterio JSONB
);

CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  season_id UUID REFERENCES seasons(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icon_url TEXT,
  tipo TEXT CHECK (tipo IN ('rank', 'special', 'seasonal', 'event'))
);

CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACADEMY PROGRESS (métrica global del alumno)
-- ============================================================

CREATE TABLE academy_progress (
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

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE teams (
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

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  rol TEXT,
  fecha_ingreso DATE,
  fecha_salida DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE team_stats (
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

-- ============================================================
-- SCRIMS & MATCH REVIEWS
-- ============================================================

CREATE TABLE scrims (
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

CREATE TABLE scrim_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  agente TEXT,
  acs INT,
  kda TEXT
);

CREATE TABLE match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_id UUID REFERENCES scrims(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id),
  resumen TEXT,
  puntos_fuertes TEXT[],
  puntos_mejora TEXT[],
  nota_global INT CHECK (nota_global BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VOD REVIEWS (módulo estrella de QU4SAR)
-- ============================================================

CREATE TABLE vod_reviews (
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

CREATE TABLE vod_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES vod_reviews(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  timestamp_seconds INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TOURNAMENTS
-- ============================================================

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT DEFAULT 'upcoming' CHECK (estado IN ('upcoming', 'ongoing', 'finished', 'cancelled')),
  bracket JSONB,
  season_id UUID REFERENCES seasons(id)
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id),
  student_id UUID REFERENCES profiles(id),
  seed INT
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
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

-- ============================================================
-- COACH REVIEWS (feedback periódico)
-- ============================================================

CREATE TABLE coach_reviews (
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

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  monto DECIMAL(10,2) NOT NULL,
  mes_correspondiente DATE NOT NULL,
  fecha_pago DATE NOT NULL,
  concepto TEXT,
  metodo TEXT,
  estado TEXT DEFAULT 'paid' CHECK (estado IN ('pending', 'paid', 'late', 'cancelled')),
  registrado_por UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS & ANNOUNCEMENTS
-- ============================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all', 'coach', 'student', 'jugador')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  titulo TEXT NOT NULL,
  contenido TEXT,
  tipo TEXT CHECK (tipo IN ('achievement', 'review', 'task', 'payment',
                            'announcement', 'scrim', 'goal', 'system')),
  referencia_id UUID,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Estructura de Archivos

```
QU4SAR-WEB/
├── index.html                    # Landing (logo + hero + botones)
├── package.json                  # serve -l 4321
│
├── html/
│   ├── login.html
│   ├── register.html
│   ├── admin/
│   │   └── dashboard.html
│   ├── coaches/
│   │   └── dashboard.html
│   ├── alumnos/
│   │   ├── dashboard.html
│   ├── jugadores/                # Portal separado para jugadores
│   │   ├── dashboard.html
│   │   ├── cursos/index.html
│   │   ├── training/index.html
│   │   ├── scrims/index.html
│   │   ├── vod/index.html
│   │   ├── objetivos/index.html
│   │   ├── logros/index.html
│   │   ├── clasificacion/index.html
│   │   ├── equipos/index.html
│   │   ├── perfil/index.html
│   │   ├── progreso/index.html
│   │   └── pagos/index.html
│   ├── cursos/index.html
│   ├── training/index.html
│   ├── scrims/index.html
│   ├── vod/index.html
│   ├── objetivos/index.html
│   ├── logros/index.html
│   ├── clasificacion/index.html
│   ├── equipos/index.html
│   ├── perfil/index.html
│   ├── progreso/index.html
│   └── pagos/index.html
│
├── css/
│   ├── index.css
│   ├── login.css
│   ├── register.css
│   ├── global.css                # Sidebar, topbar, tablas, loader
│   ├── admin/dashboard.css
│   ├── coaches/dashboard.css
│   ├── alumnos/dashboard.css
│   ├── jugadores/dashboard.css
│   ├── cursos/index.css
│   ├── training/index.css
│   ├── scrims/index.css
│   ├── vod/index.css
│   ├── objetivos/index.css
│   ├── logros/index.css
│   ├── clasificacion/index.css
│   ├── equipos/index.css
│   ├── perfil/index.css
│   ├── progreso/index.css
│   └── pagos/index.css
│
├── javascript/
│   ├── supabase.js               # Cliente singleton
│   ├── index.js
│   ├── login.js
│   ├── register.js
│   ├── admin/dashboard.js
│   ├── coaches/dashboard.js
│   ├── alumnos/dashboard.js
│   ├── jugadores/dashboard.js
│   ├── cursos/index.js
│   ├── training/index.js
│   ├── scrims/index.js
│   ├── vod/index.js
│   ├── objetivos/index.js
│   ├── logros/index.js
│   ├── clasificacion/index.js
│   ├── equipos/index.js
│   ├── perfil/index.js
│   ├── progreso/index.js
│   └── pagos/index.js
│
├── img/
│   └── QU4SAR.ico
│
├── supabase/migrations/
│   ├── 20260614235959_profiles.sql
│   ├── 20260615000001_full_schema.sql
│   └── 20260615000002_add_jugador_role.sql
│
├── docs/
│   └── PLAN.md
│
├── python/                       # (Futuro) ML / analítica
├── go/                           # (Futuro) microservicios alta perf
└── rust/                         # (Futuro) motor core
```

---

## Loader (Pantalla de carga)

Todas las páginas tienen un loading overlay con:
- Anillo giratorio de **60px** (loader-ring) con borde morado neon
- Icono QU4SAR centrado de 28px (loader-icon)
- Fallback inline en `<head>`: oculta loader tras 3.5s si JS falla
- `lucide.createIcons()` se llama desde cada JS al cargar

---

## APIs (Edge Functions de Supabase)

| # | API | Propósito |
|---|-----|-----------|
| 1 | Auth | Registro, login, RBAC |
| 2 | Profiles | CRUD perfiles (admin, coach, student, jugador) |
| 3 | Seasons | Gestión de temporadas activas |
| 4 | Academy Ranks | Rangos académicos |
| 5 | Courses | CRUD cursos + módulos + lecciones |
| 6 | Tasks | Tareas + entregas + feedback |
| 7 | Training Sessions | Clases, VOD review grupal, aim training, theory |
| 8 | Teams | CRUD equipos + members + stats |
| 9 | Scrims | Registro de scrims + participantes |
| 10 | Match Reviews | Feedback del coach sobre scrims |
| 11 | VOD Reviews | Reviews individuales con comentarios timestamped |
| 12 | Goals | Objetivos coach → alumno con progreso |
| 13 | XP & Streaks | Transacciones de XP + rachas diarias |
| 14 | Achievements | Logros desbloqueables |
| 15 | Badges | Insignias especiales |
| 16 | Academy Progress | Métrica global del alumno |
| 17 | Attendance | Registro de asistencia |
| 18 | Coach Reviews | Feedback periódico con habilidades |
| 19 | Tournaments | Sistema de torneos |
| 20 | Payments | Registro de pagos presenciales |
| 21 | Notifications | Sistema de notificaciones + announcements |

> El chat en tiempo real se omite. Se reemplaza con announcements, notifications y comments.

---

## Tema Visual (Dark + Morado)

```css
:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --primary-light: #A78BFA;
  --bg: #0A0A0A;
  --bg-card: #111;
  --bg-sidebar: #0C0C0C;
  --glass: rgba(12,12,12,0.85);
  --border: rgba(139,92,246,0.08);
  --text: #f0f0f0;
  --text-muted: #888;
  --success: #22c55e;
  --danger: #ef4444;
  --gold: #f59e0b;
}
```

---

## Roadmap de Implementación

| Fase | Qué se hace |
|------|-------------|
| **0. Arquitectura** | Definir seasons, goals, streaks, training sessions, VOD reviews, academy progress |
| **1. MVP** | Auth, roles (admin/coach/student), profiles, courses básicos |
| **2. Core QU4SAR** | XP, levels, achievements, badges, goals, streaks |
| **3. Competitivo** | Teams, scrims, match reviews, VOD reviews, team stats |
| **4. Administración** | Payments, attendance, coach reviews, training sessions |
| **5. Escalado** | Tournaments, seasons, leaderboards, analytics |
| **6. Jugadores** | Portal separado con cursos/horarios/scrims propios |

---

## Principios de diseño

- **Multi-Page App (MPA)** con HTML/CSS/JS vanilla → cero frameworks
- **Rutas por feature** (cursos/, training/, scrims/, vod/), no por rol
- **Protección por rol** en cada página JS (redirect si no corresponde)
- **Temporadas** como eje transversal de todo el sistema
- **Dashboard competitivo** como página principal post-login
- **Los coaches tienen control total** sobre alumnos, jugadores, cursos, training sessions, goals y feedback
- **VOD Reviews** como módulo estrella con comentarios anclados al segundo exacto
- **Sin chat** en fase 1 → announcements + notifications + comments
- **Pagos presenciales** con tracking completo (estado, mes, historial)
- **Hosting**: local (Live Server / serve) inicialmente, migrar a Cloudflare Pages o Vercel
- **Loader**: anillo giratorio 60px con icono QU4SAR, fallback 3.5s inline
- **Lucide icons** cargados vía CDN antes de `</body>`
- **Futuro**: Python (ML/analítica), Go/Rust (microservicios alto rendimiento) en sus propias carpetas
