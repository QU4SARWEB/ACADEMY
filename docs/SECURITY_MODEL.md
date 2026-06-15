# QU4SAR WEB V2 — Security Model

> Modelo de seguridad: RLS, policies, storage, middleware.

---

## 1. Principios de Seguridad

1. **Service Role Key nunca en frontend.** Solo server-side (API routes, migraciones).
2. **RLS en todas las tablas** desde el primer día.
3. **Políticas por rol** (student, player, coach).
4. **Storage policies** para cada bucket.
5. **Middleware** para protección de rutas y verificación de sesión.
6. **Auditoría** de todas las acciones críticas.
7. **Validación de permisos** en server components antes de renderizar.

---

## 2. Row Level Security (RLS)

### 2.1 Configuración General

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrim_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_requirements ENABLE ROW LEVEL SECURITY;
```

### 2.2 Helper Function

```sql
-- Función helper para verificar rol
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'public'
  );
$$ LANGUAGE SQL STABLE;

-- Función helper para verificar si es coach
CREATE OR REPLACE FUNCTION auth.is_coach()
RETURNS BOOLEAN AS $$
  SELECT auth.role() = 'coach';
$$ LANGUAGE SQL STABLE;

-- Función helper para verificar propiedad
CREATE OR REPLACE FUNCTION auth.is_owner(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth.uid() = user_id;
$$ LANGUAGE SQL STABLE;
```

### 2.3 Policies por Tabla

#### `profiles`

```sql
-- SELECT: propio perfil, coach, o público si es perfil público
CREATE POLICY "users_view_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "coaches_view_all"
  ON profiles FOR SELECT
  USING (auth.is_coach());

-- Solo el propio usuario (vía trigger signup)
CREATE POLICY "users_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: propio usuario o coach
CREATE POLICY "users_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- No permitir cambiar rol propio
      (OLD.role = NEW.role)
      OR auth.is_coach()
    )
  );

CREATE POLICY "coaches_update_any"
  ON profiles FOR UPDATE
  USING (auth.is_coach());
```

#### `seasons`

```sql
CREATE POLICY "all_view"
  ON seasons FOR SELECT
  USING (auth.role() IN ('student', 'player', 'coach'));

CREATE POLICY "coaches_manage"
  ON seasons FOR ALL
  USING (auth.is_coach());
```

#### `courses`

```sql
CREATE POLICY "enrolled_students_view"
  ON courses FOR SELECT
  USING (
    auth.role() = 'coach'
    OR EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = courses.id
      AND enrollments.profile_id = auth.uid()
    )
  );

CREATE POLICY "coaches_manage"
  ON courses FOR ALL
  USING (auth.is_coach());
```

#### `course_modules`, `materials`, `evaluations`, `exams`, `tasks`

Misma política: estudiantes inscritos ven, coaches gestionan.

```sql
CREATE POLICY "enrolled_view"
  ON course_modules FOR SELECT
  USING (
    auth.is_coach()
    OR EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      JOIN course_modules cm ON cm.course_id = c.id
      WHERE cm.id = course_modules.id
      AND e.profile_id = auth.uid()
    )
  );

CREATE POLICY "coaches_manage"
  ON course_modules FOR ALL
  USING (auth.is_coach());
```

#### `evaluation_results`, `exam_results`

```sql
-- Estudiante ve solo sus propios resultados
CREATE POLICY "student_view_own"
  ON evaluation_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.id = evaluation_results.enrollment_id
      AND enrollments.profile_id = auth.uid()
    )
  );

-- Coach ve todos
CREATE POLICY "coaches_view_all"
  ON evaluation_results FOR SELECT
  USING (auth.is_coach());

-- Solo coach inserta/actualiza
CREATE POLICY "coaches_grade"
  ON evaluation_results FOR INSERT
  WITH CHECK (auth.is_coach());

CREATE POLICY "coaches_update"
  ON evaluation_results FOR UPDATE
  USING (auth.is_coach());
```

#### `task_submissions`

```sql
-- Estudiante ve/c rea su propia entrega
CREATE POLICY "student_own_submissions"
  ON task_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.id = task_submissions.enrollment_id
      AND enrollments.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.id = task_submissions.enrollment_id
      AND enrollments.profile_id = auth.uid()
    )
  );

-- Coach ve y califica todas
CREATE POLICY "coaches_grade_submissions"
  ON task_submissions FOR ALL
  USING (auth.is_coach());
```

#### `payments`

```sql
-- Estudiante/player ve sus propios pagos
CREATE POLICY "user_view_own_payments"
  ON payments FOR SELECT
  USING (profile_id = auth.uid());

-- Coach gestiona todos
CREATE POLICY "coaches_manage_payments"
  ON payments FOR ALL
  USING (auth.is_coach());
```

#### `notifications`

```sql
-- Cada usuario ve sus propias notificaciones
CREATE POLICY "user_view_own_notifications"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

-- Usuario marca como leída
CREATE POLICY "user_mark_read"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND NEW.read = true
    AND OLD.read = false
  );

-- Sistema inserta (service role)
CREATE POLICY "system_insert"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Solo service_role
```

#### `audit_logs`

```sql
-- Solo coaches leen
CREATE POLICY "coaches_view_logs"
  ON audit_logs FOR SELECT
  USING (auth.is_coach());

-- Sistema inserta (service role)
CREATE POLICY "system_insert_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

---

## 3. Storage Policies

### 3.1 Buckets Setup

```sql
-- Buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('tasks', 'tasks', false),
  ('materials', 'materials', false),
  ('certificates', 'certificates', false),
  ('public-profiles', 'public-profiles', true);
```

### 3.2 Storage Policies

#### `avatars` (público)

```sql
-- SELECT: cualquiera
CREATE POLICY "public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- INSERT: propio usuario
CREATE POLICY "user_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: propio usuario o coach
CREATE POLICY "user_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.is_coach()
    )
  );
```

#### `tasks` (privado)

```sql
-- SELECT: coach o estudiante dueño de la submission
CREATE POLICY "task_access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tasks'
    AND (
      auth.is_coach()
      OR EXISTS (
        SELECT 1 FROM task_submissions ts
        JOIN enrollments e ON e.id = ts.enrollment_id
        WHERE e.profile_id = auth.uid()
        AND ts.id::text = (storage.foldername(name))[2]
      )
    )
  );

-- INSERT: estudiante o coach
CREATE POLICY "task_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tasks'
    AND (
      auth.is_coach()
      OR EXISTS (
        SELECT 1 FROM task_submissions ts
        JOIN enrollments e ON e.id = ts.enrollment_id
        WHERE e.profile_id = auth.uid()
        AND ts.id::text = (storage.foldername(name))[2]
      )
    )
  );
```

---

## 4. Middleware (Next.js)

### 4.1 Comportamiento

```typescript
// src/middleware.ts
//
// 1. Verificar sesión Supabase
// 2. Si no hay sesión:
//    - Rutas públicas → permitir
//    - Rutas protegidas → redirect /login
// 3. Si hay sesión:
//    - Verificar role en profiles
//    - Coincidencia de rol vs ruta → ok
//    - No coincide → redirect al dashboard del rol correcto
// 4. Si deuda pendiente:
//    - Bloquear excepto /payments
//    - Redirect a /payments con mensaje
```

### 4.2 Rutas Protegidas

| Grupo | Prefix | Roles Permitidos |
|---|---|---|
| Student | `/students/*` | `student` |
| Player | `/players/*` | `player` |
| Coach | `/coaches/*` | `coach` |
| API Auth | `/api/auth/*` | Public |
| API Protected | `/api/*` | Según endpoint |

---

## 5. Server-Side Validation

En cada Server Component o API Route:

```typescript
// Patrón de verificación
const { data: { user } } = await supabase.auth.getUser();
if (!user) return redirect('/login');

const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_active')
  .eq('id', user.id)
  .single();

if (!profile?.is_active) {
  return redirect('/pending-activation');
}

if (profile.role !== expectedRole) {
  return redirect(`/${profile.role}/dashboard`);
}
```

---

## 6. Service Role Key Usage

**NUNCA en frontend.** Solo en:

1. Migraciones SQL vía Supabase CLI
2. API Routes de Next.js (server-side)
3. Scripts administrativos (seed, backfill)
4. Triggers de base de datos (si necesitan bypassear RLS)

**Almacenada en:** `.env.local` (gitignorado)

**Nunca en:**
- Código frontend (componentes, hooks)
- Documentación
- Chats
- Repositorios

---

## 7. Auditoría (Logs Automáticos)

### 7.1 Trigger para Logs

```sql
-- Ejemplo: trigger que registra cambios en enrollments
CREATE OR REPLACE FUNCTION log_enrollment_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (profile_id, action, module, description, ip)
  VALUES (
    auth.uid(),
    TG_OP,
    'enrollments',
    CASE TG_OP
      WHEN 'INSERT' THEN 'Inscripción creada: ' || NEW.id
      WHEN 'UPDATE' THEN 'Inscripción actualizada: ' || NEW.id
      WHEN 'DELETE' THEN 'Inscripción eliminada: ' || OLD.id
    END,
    current_setting('request.headers')::json->>'x-forwarded-for'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enrollment_log
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION log_enrollment_changes();
```

---

## 8. Checklist de Seguridad

- [ ] RLS habilitado en TODAS las tablas
- [ ] Policies definidas por rol (student, player, coach)
- [ ] Storage policies para cada bucket
- [ ] Middleware de protección de rutas
- [ ] Validación de permisos en server components
- [ ] Service Role Key solo en servidor
- [ ] Triggers de auditoría para acciones críticas
- [ ] Rate limiting en login (Supabase Auth config)
- [ ] No hardcodeo de credenciales
- [ ] Perfiles públicos no exponen datos privados
- [ ] Bloqueo por deuda implementado en middleware
- [ ] Refresh token rotation habilitado

---

> **Documentos relacionados:**
> - `PERMISSIONS_MATRIX.md` — Matriz completa de permisos
> - `DATABASE_SCHEMA.md` — Esquema de base de datos
> - `ROUTES_MAP.md` — Protección de rutas
