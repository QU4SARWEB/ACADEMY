# TODO — QU4SAR WEB V2

## Fases de Implementación (según Master Spec §18)

| Fase | Nombre | Estado |
|------|--------|--------|
| 0 | Infraestructura (Next.js, TS, Tailwind, Supabase) | ✅ |
| 1 | Diseño (tema + componentes base) | ✅ |
| 2 | Auth + Roles | ✅ |
| 3 | Base de Datos completa (con Seasons) | ✅ |
| 3.5 | Seguridad y RLS | ✅ |
| 4 | Student Dashboard | ✅ |
| 5 | Player Dashboard | ✅ |
| 6 | Coach Dashboard | ✅ |
| 7 | Cursos + Módulos + Materiales | ✅ |
| 8 | Tareas + Sistema de Notas | ✅ |
| 9 | Promoción (nota >= 80 + rango mínimo) | ✅ |
| 10 | Horarios (Académico + Competitivo) | ✅ |
| 11 | Notificaciones (campana + Realtime) | ✅ |
| 12 | Pagos + Becas | ✅ |
| 13 | Correo Interno | ✅ |
| 14 | Logs de Auditoría | ✅ |
| 15 | Optimización + Pulido | ✅ |
| — | Features adicionales | ✅ |

**Leyenda:** ✅ Completada · ⬜ Parcial · ❌ Pendiente

---

## Detalle por fase

### Fase 0 — Infraestructura ✅
- [x] Next.js 16 + TypeScript + Tailwind
- [x] Supabase client / server / middleware
- [x] Lucide React (única librería de iconos)
- [x] `.env.local` (URL + Anon Key)
- [x] `src/types/index.ts` (interfaces globales)
- [x] Build limpio (`npx next build --webpack`)

### Fase 1 — Diseño (tema + componentes base) ✅
- [x] Tema oscuro (`#0A0A0A` bg, `#8B5CF6` purple, blanco texto)
- [x] Fuentes Orbitron + Inter + Valorant .woff
- [x] Favicon QU4SAR.ico
- [x] Landing page con logo QU4SAR.ico + botón Discord
- [x] Glassmorphism en cards (`.glass` utility con backdrop-blur)
- [x] Animaciones (float en logo, glow en botones, hover transitions)
- [x] Mobile responsive (sidebar hamburguesa, overlay, padding)
- [x] Componentes UI: Button, Modal, Input/Textarea/Select, Toast, Loading

### Fase 2 — Auth + Roles ✅
- [x] Server actions (signIn, signUp, resetPassword, updatePassword, signOut)
- [x] Service + hooks
- [x] Páginas: login, register, reset-password
- [x] Auth callback OAuth
- [x] Middleware de protección por rol

### Fase 3 — Base de Datos ✅
- [x] Migración SQL (`20260615000001_initial_schema.sql` + `restructured`)
- [x] 24 tablas con relaciones y constraints
- [x] 22 triggers (updated_at + new_user_after_signup)
- [x] 59 RLS policies
- [x] Ejecutado contra Supabase remoto vía Management API
- [x] Verificado: todas las tablas, policies y triggers creados correctamente

### Fase 3.5 — Seguridad y RLS ✅
- [x] RLS policies por rol en todas las tablas
- [x] Storage policies (avatars, banners, tasks, materials, certificates, public-profiles)
- [x] Middleware de rutas

### Fase 4 — Student Dashboard ✅
- [x] Dashboard principal (cursos inscritos, tareas pendientes, accesos directos)
- [x] Lista de cursos inscritos
- [x] Detalle de curso con módulos + materiales (PDF, video, link)
- [x] Lista de tareas asignadas con estado
- [x] Detalle de tarea + formulario de entrega
- [x] Horario académico agrupado por semana
- [x] Notas por curso con indicador de aprobación (>= 80)
- [x] Edición de perfil (nombre, Riot ID, rango, bio)

### Fase 5 — Player Dashboard ✅
- [x] Dashboard principal (equipo, próximos scrims, accesos directos)
- [x] Equipo actual (miembros, roles, ranks)
- [x] Scrims (historial completo con resultado y score)
- [x] Horario competitivo agrupado por semana
- [x] Perfil de jugador (nombre, Riot ID, rango, bio)

### Fase 6 — Coach Dashboard ✅
- [x] Dashboard principal (stats cards + quick actions)
- [x] Sub-layout con tabs de navegación (11 tabs: Dashboard, Cursos, Estudiantes, Jugadores, Tareas, Evaluaciones, Horarios, Seasons, Equipos, Scrims, Perfil)
- [x] Gestión de cursos, módulos, materiales (CRUD)
- [x] Gestión de estudiantes (list, detail, promote, scholarship, activate/deactivate)
- [x] Gestión de jugadores (list)
- [x] Gestión de tareas (CRUD + grading + pendientes)
- [x] Gestión de evaluaciones (list + create)
- [x] Gestión de horarios (list + create)
- [x] Gestión de seasons (list + create + activate)
- [x] Gestión de equipos (CRUD + miembros + roles)
- [x] Gestión de scrims (CRUD + resultado + score + notas)
- [x] Perfil de coach

### Fase 7 — Cursos + Módulos + Materiales ✅
- [x] Curso CRUD (list, create con selector Rookie→Pro, detail, edit)
- [x] Módulo CRUD (create bajo curso, detail con materiales + evaluaciones)
- [x] Material create (bajo módulo)

### Fase 8 — Tareas + Sistema de Notas ✅
- [x] Coach: CRUD (list, create con módulo/season/due_date/tipos)
- [x] Coach: detail con submissions + grading (score + feedback)
- [x] Coach: lista de pendientes por estudiante
- [x] Student: ver tareas asignadas con estado
- [x] Student: entregar tarea (enlace externo)
- [x] Penalización automática por atraso (12h grace window)
- [x] Cálculo de nota final (exam 50% + evals 35% + attendance 15%)
- [x] Registro de notas de examen (coach: /coaches/courses/[id]/exam)
- [x] Registro de asistencia (coach: /coaches/courses/[id]/attendance)

### Fase 9 — Promoción ✅
- [x] Lógica: nota >= 80 AND rango mínimo del curso
- [x] Botón de promoción desde coach (detail estudiante) con verificación de requisitos
- [x] Generación de certificados (Storage + DB)
- [x] Historial de promociones

### Fase 10 — Horarios ✅
- [x] Coach: crear horarios (semana 1-24, día, hora, tipo académico/competitivo)
- [x] Coach: listar horarios en tabla
- [x] Student: ver horario académico agrupado por semana
- [x] Player: ver horario competitivo agrupado por semana

### Fase 11 — Notificaciones ✅
- [x] Campana superior con Realtime (Supabase Realtime)
- [x] Centro de notificaciones con historial completo
- [x] Tipos: tarea asignada, tarea próxima a vencer, tarea calificada, evaluación programada, cambio de horario, pago requerido

### Fase 12 — Pagos + Becas ✅
- [x] Sistema de pago (1 USD inscripción)
- [x] Estados: pending, paid, scholarship, expired
- [x] Coach: flip estados manualmente
- [x] Historial de pagos por season
- [x] Bloqueo de acceso por deuda (banner + redirect en layout)

### Fase 13 — Correo Interno ✅
- [x] Inbox / Sent / Compose
- [x] Mensajes con destinatarios múltiples
- [x] Read tracking + archivado
- [x] Notificaciones push al recibir mensaje

### Fase 14 — Logs de Auditoría ✅
- [x] Registro por acción (user_id, action, module, description, ip)
- [x] Visible para coaches

### Fase 15 — Optimización + Pulido ✅
- [x] SEO (metadatos, Open Graph)
- [x] loading.tsx skeletons para dashboard
- [x] Perfiles con subida de avatar + redes sociales + display name
- [x] ProfileForm compartido (student/player/coach)

---

## Features adicionales (no listadas en Master Spec §18)
- [x] Subida de archivos a Supabase Storage (avatares)
- [x] Perfiles públicos compartibles por link (/p/[slug])
- [x] Edición de perfil (avatar, banner, subida de imágenes)

---

## Supabase — Conexión Completa
- [x] Migration SQL ejecutado (24 tablas, 59 RLS, 22 triggers, 3 helpers)
- [x] Storage bucket `avatars` creado (público, 5MB, imágenes)
- [x] Auth config: auto-confirm email, site URL localhost:3000
- [x] Seed data: temporada activa, curso de inicio, módulo 1
- [x] Build: 45 rutas compiladas sin errores
- [x] Dev server: http://localhost:3000 respondiendo
