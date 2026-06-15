# QU4SAR WEB V2 — User Flows

> Flujos de usuario por rol.
> Basado en la especificación maestra y el esquema de base de datos.

---

## 1. Flujo General de Autenticación

```
[Público] → Landing Page
              ├── Ver noticias
              ├── Ver información
              ├── Registrarse (inscripción)
              └── Iniciar sesión
                    │
                    ▼
              [Supabase Auth]
                    │
                    ▼
              Redirect según rol:
              ├── /students → Student Dashboard
              ├── /players  → Player Dashboard
              └── /coaches  → Coach Dashboard
```

---

## 2. Flujo Público (Sin autenticación)

```
Landing (/)
  ├── Hero + Info institucional
  ├── Noticias (/news)
  ├── Registro (/register)
  │     └── Formulario: nombre, email, Riot ID, rol deseado
  │           └── Enviar → Admin/Coach revisa → Activa cuenta
  └── Perfil público (/p/[slug])
        └── Solo accesible con link
```

---

## 3. Flujo Student

```
Login → /students/dashboard
  │
  ├── Dashboard
  │   ├── Curso actual + progreso
  │   ├── Próximas tareas
  │   ├── Próximas clases (horario)
  │   └── Notificaciones recientes
  │
  ├── Cursos
  │   ├── Vista actual (módulo activo)
  │   ├── Materiales del módulo
  │   ├── Evaluaciones pendientes
  │   └── Historial de cursos anteriores
  │
  ├── Tareas
  │   ├── Lista de tareas (pendientes, entregadas, calificadas)
  │   ├── Entregar tarea (subir archivos, links)
  │   └── Ver calificación + feedback
  │
  ├── Horario
  │   ├── Vista semanal (Semana 1-24)
  │   └── Clases programadas
  │
  ├── Notas
  │   ├── Nota actual del curso
  │   ├── Desglose: examen 50%, evaluaciones 35%, asistencia 15%
  │   └── Requisito de promoción
  │
  ├── Perfil
  │   ├── Ver/editar perfil
  │   ├── Avatar, banner, redes, bio
  │   └── Compartir perfil público (link + PNG)
  │
  ├── Pagos
  │   ├── Estado de pago actual
  │   ├── Historial de pagos
  │   └── Renovar inscripción
  │
  └── Notificaciones
      ├── Campana (últimas)
      └── Centro de notificaciones (historial)
```

---

## 4. Flujo Player

```
Login → /players/dashboard
  │
  ├── Dashboard
  │   ├── Equipo actual
  │   ├── Próximos scrims
  │   ├── Estadísticas recientes
  │   └── Notificaciones
  │
  ├── Equipos
  │   ├── Equipo actual + miembros
  │   ├── Historial de equipos (por season)
  │   └── Rol en el equipo
  │
  ├── Scrims
  │   ├── Próximos scrims
  │   ├── Historial de scrims
  │   └── Estadísticas por scrim
  │
  ├── Horario Competitivo
  │   ├── Vista semanal
  │   └── Prácticas programadas
  │
  ├── Perfil
  │   ├── Ver/editar perfil
  │   ├── Estadísticas competitivas
  │   └── Compartir perfil público
  │
  ├── Pagos
  │   ├── Estado de pago
  │   ├── Historial
  │   └── Renovación
  │
  └── Notificaciones
```

---

## 5. Flujo Coach

```
Login → /coaches/dashboard
  │
  ├── Dashboard General
  │   ├── Alumnos activos (total, por curso)
  │   ├── Players activos
  │   ├── Alertas (tareas vencidas, pagos pendientes)
  │   ├── Próximos eventos
  │   └── Gráficas rápidas
  │
  ├── Estudiantes
  │   ├── Lista completa con filtros (curso, estado, season)
  │   ├── Perfil de cada estudiante
  │   ├── Progreso académico
  │   ├── Notas, tareas, asistencia
  │   └── Promoción manual
  │
  ├── Players
  │   ├── Lista de players
  │   ├── Perfil de cada player
  │   ├── Estadísticas competitivas
  │   └── Asignación a equipos
  │
  ├── Cursos (CRUD)
  │   ├── Crear/editar cursos
  │   ├── Crear módulos por curso
  │   ├── Subir materiales (PDF, video, link)
  │   ├── Crear evaluaciones
  │   ├── Crear exámenes finales
  │   └── Definir requisitos de promoción
  │
  ├── Tareas (CRUD)
  │   ├── Crear tareas por módulo
  │   ├── Revisar entregas
  │   ├── Calificar + feedback
  │   └── Ver estadísticas de entregas
  │
  ├── Horarios
  │   ├── Crear horarios académicos (Semana 1-24)
  │   ├── Crear horarios competitivos
  │   └── Vista general semanal
  │
  ├── Equipos (CRUD)
  │   ├── Crear equipos
  │   ├── Asignar miembros
  │   └── Gestionar roles
  │
  ├── Scrims (CRUD)
  │   ├── Programar scrims
  │   ├── Registrar resultados
  │   └── Ver historial
  │
  ├── Pagos
  │   ├── Ver estado de pagos por alumno
  │   ├── Marcar como pagado/beca
  │   └── Ver historial completo
  │
  ├── Seasons
  │   ├── Crear/activar seasons
  │   └── Cerrar season actual
  │
  ├── Auditoría
  │   ├── Ver logs por usuario
  │   ├── Ver logs por módulo
  │   └── Filtros por fecha/acción
  │
  └── Configuración
      ├── Perfil de coach
      └── Preferencias
```

---

## 6. Flujo de Registro (Nuevo usuario)

```
1. Usuario llena formulario en /register
   ├── Nombre completo
   ├── Email
   ├── Riot ID (nombre#tag)
   ├── Rol deseado (student / player)
   └── Contraseña

2. Se crea usuario en Supabase Auth

3. Se crea perfil en profiles (role: solicitado, is_active: false)

4. Notificación a coaches: "Nuevo usuario registrado"

5. Coach revisa y activa cuenta (is_active: true)
   ├── Asigna curso inicial
   ├── Asigna season actual
   └── (Opcional) Asigna beca

6. Usuario recibe notificación: "Tu cuenta ha sido activada"

7. Usuario puede iniciar sesión
```

---

## 7. Flujo de Promoción

```
1. Finaliza módulo/curso

2. Sistema calcula nota final:
   ├── Examen Final × 50%
   ├── Evaluaciones × 35%
   ├── Asistencia × 15%
   └── = Nota final (/100)

3. Sistema verifica requisitos:
   ├── Nota >= 80? → Sí/No
   ├── Rango >= mínimo requerido? → Sí/No
   └── Ambos? → Promociona / No promociona

4. Si promociona:
   ├── enrollment.status = 'graduated'
   ├── enrollment.promoted = true
   ├── Crea nuevo enrollment al siguiente curso
   └── Notificación al estudiante

5. Si no promociona:
   ├── enrollment.status = 'recovery'
   ├── Coach revisa y decide siguiente paso
   └── Notificación al estudiante con detalles
```

---

## 8. Flujo de Pago

```
1. Inicio de season
   ├── Se genera payment pendiente para cada usuario activo
   └── Tipo según rol (student/player)

2. Usuario ve estado en /payments
   ├── Si scholarship = true → automático "paid"
   ├── Si pending → botón "Pagar" (futuro Stripe)
   └── Si paid → todo normal

3. Si deuda (pending > 7 días):
   ├── Acceso restringido
   ├── Solo visible: payments, historial, renew
   └── Notificación: "Pago pendiente"

4. Coach puede marcar manualmente:
   ├── paid (recibió pago)
   ├── scholarship (beca)
   └── expired (venció plazo)

5. Historial completo guardado en payments
```

---

## 9. Flujo de Tarea

```
1. Coach crea tarea:
   ├── Título, descripción
   ├── Fecha límite
   ├── Tipos de entrega permitidos
   └── Asociada a módulo + season

2. Estudiante recibe notificación:
   ├── "Nueva tarea: [título]"
   └── Aparece en dashboard

3. Estudiante entrega:
   ├── Sube archivos (PDF, img, video, audio)
   ├── Agrega links
   └── Texto opcional

4. Si pasa fecha límite + 12h:
   ├── status → "late"
   └── Penalización automática

5. Coach revisa:
   ├── Ve archivos
   ├── Asigna nota + feedback
   └── status → "graded"

6. Estudiante recibe notificación:
   └── "Tarea calificada: [nota]/100"
```

---

## 10. Flujo de Notificaciones (Realtime)

```
1. Evento en Supabase (INSERT/UPDATE en tabla relevante)
   │
   ▼
2. Supabase Realtime channel
   │
   ▼
3. Cliente recibe payload
   │
   ▼
4. Campana superior: badge + toast
   │
   ▼
5. Centro de notificaciones: registro permanente
   │
   ▼
6. Usuario hace clic → marca como leída
```

---

> **Documentos relacionados:**
> - `QU4SAR_MASTER_SPECIFICATION.md` — Especificación general
> - `PERMISSIONS_MATRIX.md` — Matriz de permisos
> - `ROUTES_MAP.md` — Mapa de rutas
