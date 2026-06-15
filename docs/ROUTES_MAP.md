# QU4SAR WEB V2 — Routes Map

> Mapa de rutas de la aplicación.
> Basado en Next.js App Router.

---

## 1. Convenciones

- `(public)` — Layout público (sin sidebar, sin auth requerida)
- `(dashboard)` — Layout protegido con sidebar izquierda
- `✅` — Ruta implementada
- `🟡` — Ruta planeada
- `❌` — Ruta futura (post-MVP)

---

## 2. Rutas Públicas `(public)`

| Ruta | Método | Descripción | Acceso | Estado |
|---|---|---|---|---|
| `/` | GET | Landing page | Public | 🟡 |
| `/news` | GET | Noticias públicas | Public | 🟡 |
| `/news/[slug]` | GET | Noticia individual | Public | 🟡 |
| `/register` | GET | Formulario de inscripción | Public | 🟡 |
| `/register` | POST | Enviar inscripción | Public | 🟡 |
| `/p/[slug]` | GET | Perfil público | Public | 🟡 |

### API Routes Públicas

| Ruta | Método | Descripción | Estado |
|---|---|---|---|
| `/api/public/profiles/[slug]` | GET | Obtener perfil público | 🟡 |

---

## 3. Dashboard Routes `(dashboard)`

### 3.1 Auth

| Ruta | Método | Descripción | Roles | Estado |
|---|---|---|---|---|
| `/login` | GET | Página de login | Public | 🟡 |
| `/login` | POST | Iniciar sesión | Public | 🟡 |
| `/logout` | POST | Cerrar sesión | All | 🟡 |
| `/auth/callback` | GET | Callback Supabase Auth | Public | 🟡 |

### 3.2 Student Routes

| Ruta | Método | Descripción | Roles | Estado |
|---|---|---|---|---|
| `/students/dashboard` | GET | Dashboard principal | Student | 🟡 |
| `/students/courses` | GET | Cursos del estudiante | Student | 🟡 |
| `/students/courses/[id]` | GET | Curso específico + módulos | Student | 🟡 |
| `/students/courses/[id]/modules/[mid]` | GET | Módulo con materiales | Student | 🟡 |
| `/students/tasks` | GET | Lista de tareas | Student | 🟡 |
| `/students/tasks/[id]` | GET | Detalle de tarea + entrega | Student | 🟡 |
| `/students/tasks/[id]/submit` | POST | Entregar tarea | Student | 🟡 |
| `/students/schedule` | GET | Horario académico semanal | Student | 🟡 |
| `/students/grades` | GET | Notas y progreso | Student | 🟡 |
| `/students/grades/[courseId]` | GET | Detalle de notas por curso | Student | 🟡 |
| `/students/history` | GET | Historial académico completo | Student | 🟡 |
| `/students/profile` | GET | Ver/editar perfil | Student | 🟡 |
| `/students/profile` | PUT | Actualizar perfil | Student | 🟡 |
| `/students/payments` | GET | Estado de pagos | Student | 🟡 |
| `/students/payments/history` | GET | Historial de pagos | Student | 🟡 |
| `/students/notifications` | GET | Centro de notificaciones | Student | 🟡 |

### 3.3 Player Routes

| Ruta | Método | Descripción | Roles | Estado |
|---|---|---|---|---|
| `/players/dashboard` | GET | Dashboard competitivo | Player | 🟡 |
| `/players/team` | GET | Equipo actual + miembros | Player | 🟡 |
| `/players/scrims` | GET | Próximos scrims | Player | 🟡 |
| `/players/scrims/history` | GET | Historial de scrims | Player | 🟡 |
| `/players/scrims/[id]` | GET | Detalle de scrim | Player | 🟡 |
| `/players/schedule` | GET | Horario competitivo semanal | Player | 🟡 |
| `/players/stats` | GET | Estadísticas competitivas | Player | 🟡 |
| `/players/history` | GET | Historial competitivo completo | Player | 🟡 |
| `/players/profile` | GET | Ver/editar perfil | Player | 🟡 |
| `/players/profile` | PUT | Actualizar perfil | Player | 🟡 |
| `/players/payments` | GET | Estado de pagos | Player | 🟡 |
| `/players/payments/history` | GET | Historial de pagos | Player | 🟡 |
| `/players/notifications` | GET | Centro de notificaciones | Player | 🟡 |

### 3.4 Coach Routes

| Ruta | Método | Descripción | Roles | Estado |
|---|---|---|---|---|
| `/coaches/dashboard` | GET | Dashboard general | Coach | 🟡 |
| `/coaches/students` | GET | Lista de estudiantes | Coach | 🟡 |
| `/coaches/students/[id]` | GET | Perfil de estudiante | Coach | 🟡 |
| `/coaches/players` | GET | Lista de players | Coach | 🟡 |
| `/coaches/players/[id]` | GET | Perfil de player | Coach | 🟡 |
| `/coaches/courses` | GET | Gestión de cursos | Coach | 🟡 |
| `/coaches/courses/create` | GET | Crear curso | Coach | 🟡 |
| `/coaches/courses/create` | POST | Guardar curso | Coach | 🟡 |
| `/coaches/courses/[id]/edit` | GET/PUT | Editar curso | Coach | 🟡 |
| `/coaches/courses/[id]/modules` | GET | Módulos del curso | Coach | 🟡 |
| `/coaches/courses/[id]/modules/create` | POST | Crear módulo | Coach | 🟡 |
| `/coaches/courses/[id]/modules/[mid]/materials` | POST | Subir material | Coach | 🟡 |
| `/coaches/courses/[id]/modules/[mid]/evaluations` | POST | Crear evaluación | Coach | 🟡 |
| `/coaches/tasks` | GET | Gestión de tareas | Coach | 🟡 |
| `/coaches/tasks/create` | POST | Crear tarea | Coach | 🟡 |
| `/coaches/tasks/[id]` | GET | Ver entregas de tarea | Coach | 🟡 |
| `/coaches/tasks/[id]/grade/[submissionId]` | POST | Calificar entrega | Coach | 🟡 |
| `/coaches/schedules` | GET | Gestión de horarios | Coach | 🟡 |
| `/coaches/schedules/create` | POST | Crear horario | Coach | 🟡 |
| `/coaches/teams` | GET | Gestión de equipos | Coach | 🟡 |
| `/coaches/teams/create` | POST | Crear equipo | Coach | 🟡 |
| `/coaches/teams/[id]/members` | POST | Asignar miembro | Coach | 🟡 |
| `/coaches/scrims` | GET | Gestión de scrims | Coach | 🟡 |
| `/coaches/scrims/create` | POST | Crear scrim | Coach | 🟡 |
| `/coaches/scrims/[id]/result` | PUT | Registrar resultado | Coach | 🟡 |
| `/coaches/payments` | GET | Gestión de pagos | Coach | 🟡 |
| `/coaches/payments/[id]` | PUT | Actualizar estado de pago | Coach | 🟡 |
| `/coaches/seasons` | GET | Gestión de seasons | Coach | 🟡 |
| `/coaches/seasons/create` | POST | Crear season | Coach | 🟡 |
| `/coaches/seasons/[id]/activate` | PUT | Activar season | Coach | 🟡 |
| `/coaches/logs` | GET | Auditoría y logs | Coach | 🟡 |
| `/coaches/profile` | GET | Perfil de coach | Coach | 🟡 |
| `/coaches/profile` | PUT | Actualizar perfil | Coach | 🟡 |

---

## 4. API Routes (Server-side)

| Ruta | Método | Descripción | Roles | Estado |
|---|---|---|---|---|
| `/api/auth/signup` | POST | Registro de usuario | Public | 🟡 |
| `/api/enrollments` | GET | Listar inscripciones | Coach | 🟡 |
| `/api/enrollments` | POST | Crear inscripción | Coach | 🟡 |
| `/api/enrollments/[id]/grade` | PUT | Calcular nota final | Coach | 🟡 |
| `/api/enrollments/[id]/promote` | POST | Promover estudiante | Coach | 🟡 |
| `/api/grades/[enrollmentId]` | GET | Notas del estudiante | Student/Coach | 🟡 |
| `/api/grades/[enrollmentId]/calculate` | POST | Calcular nota final | System | 🟡 |
| `/api/payments/check-debt` | GET | Verificar deuda | System | 🟡 |
| `/api/notifications` | GET | Obtener notificaciones | All | 🟡 |
| `/api/notifications/[id]/read` | PUT | Marcar como leída | All | 🟡 |
| `/api/logs` | GET | Obtener logs | Coach | 🟡 |
| `/api/storage/upload` | POST | Subir archivo | All | 🟡 |
| `/api/public/profiles/[slug]` | GET | Perfil público | Public | 🟡 |

---

## 5. Middleware (Protección de Rutas)

```typescript
// src/middleware.ts
//
// Comportamiento esperado:

// 1. Si no hay sesión:
//    - Rutas públicas (/) → permitir
//    - Rutas dashboard (/students, /players, /coaches) → redirect /login
//    - API routes protegidas → 401

// 2. Si hay sesión pero perfil inactivo:
//    - Solo permitir: /login, /logout
//    - Mostrar mensaje: "Cuenta pendiente de activación"

// 3. Si hay sesión y perfil activo:
//    - Verificar rol vs ruta
//    - /students/* → solo role=student
//    - /players/*  → solo role=player
//    - /coaches/*  → solo role=coach
//    - Si rol no coincide → redirect al dashboard correspondiente

// 4. Si hay deuda pendiente (payment_status = pending > 7 días):
//    - Solo permitir: /payments, /payments/history, /logout
//    - Resto de rutas → redirect a /payments con mensaje
```

---

## 6. Resumen de Rutas por Rol

| Rol | Rutas Aprox. |
|---|---|
| Public | 5 |
| Student | 18 |
| Player | 15 |
| Coach | 40+ |

---

> **Documentos relacionados:**
> - `USER_FLOWS.md` — Flujos de usuario detallados
> - `PERMISSIONS_MATRIX.md` — Matriz de permisos por tabla
> - `SECURITY_MODEL.md` — Modelo de seguridad
