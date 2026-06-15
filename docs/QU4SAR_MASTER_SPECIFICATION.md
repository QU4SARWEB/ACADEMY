# QU4SAR WEB V2 — Master Specification

> Documento maestro de especificación del sistema.
> Versión: 2.0
> Fecha: 2026-06-15

---

## 1. Resumen del Proyecto

Plataforma web de gestión para **QU4SAR (QSR)**, una organización/esports academy de **Valorant Premier**.

**Objetivo:** Reconstruir QU4SAR WEB desde cero con arquitectura moderna, eliminando el legacy de V1 (archivos monolíticos HTML/JS vanilla, backend Express deprecated, credenciales expuestas).

---

## 2. Stack Tecnológico (Obligatorio)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15+ (App Router) |
| Lenguaje | TypeScript (estricto) |
| Estilos | Tailwind CSS |
| Iconos | Lucide React (única librería permitida) |
| Backend | Supabase Auth / Database / Storage / Realtime |
| Auth | Supabase Auth (email/password) |
| DB | PostgreSQL vía Supabase |
| Archivos | Supabase Storage |
| Tiempo real | Supabase Realtime |

**Prohibido:**
- Express o servidores Node.js personalizados (salvo necesidad justificada futura)
- HTML/CSS/JS vanilla (salvo casos excepcionales)
- Librerías de iconos que no sean Lucide
- Frameworks CSS que no sean Tailwind

---

## 3. Identidad Visual (Obligatorio)

### 3.1 Colores

| Token | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#0A0A0A` | Fondo principal (negro profundo) |
| `--bg-secondary` | `#111111` | Fondos secundarios, cards |
| `--bg-tertiary` | `#1A1A1A` | Fondos terciarios, hover |
| `--neon` | `#8B5CF6` | Morado principal (acento, botones, links) |
| `--neon-hover` | `#7C3AED` | Morado secundario (hover) |
| `--text-primary` | `#FFFFFF` | Texto principal |
| `--text-secondary` | `#A1A1AA` | Texto secundario |
| `--border` | `rgba(139,92,246,0.2)` | Bordes |

### 3.2 Tipografía

Reutilizar la misma fuente de QU4SAR V1 (extraer de `fonts/valorant.woff` + `css/base.css`).

Combinación principal:
- **Orbitron** — títulos, navbar, badges (estilo esports)
- **Inter** — textos, párrafos, formularios

### 3.3 Estética General

- Oscura (dark mode como único tema)
- Esports profesional
- Minimalista
- Neon purple como color de acento
- Animaciones sutiles (hover, glow, transiciones)
- Glassmorphism en cards y modales

**Evitar:**
- Colores aleatorios sin coherencia
- Temas claros
- Diseños escolares
- Componentes genéricos sin personalización

### 3.4 Componentes Visuales (Herencia V1)

Mantener el estilo visual existente de V1 en:

- **Botones:** bordes, hover, sombras, animaciones, estados activos
- **Modales:** overlay + dialog estilizado (todos los formularios en modal)
- **Cards:** glass effect, bordes sutiles
- **Navbar:** efecto de scroll, logo + enlaces
- **Loading:** overlay circular con logo, 3 fases de carga
- **Toast:** notificaciones temporales

La V2 debe sentirse visualmente familiar para los usuarios actuales.

---

## 4. Roles del Sistema

| Rol | Acceso | Descripción |
|---|---|---|
| **Public** | Landing, noticias, información, inscripciones | Sin autenticación |
| **Student** | Dashboard académico completo | Alumno de la academia |
| **Player** | Dashboard competitivo completo | Jugador del equipo |
| **Coach** | Administración completa de la plataforma | Personal administrativo |

**Nota:** El rol Admin de V1 se elimina. Los coaches cubren toda la gestión administrativa.

### 4.1 Jerarquía de permisos

```
Coach → Todo
Player → Player dashboard + perfil público
Student → Student dashboard + perfil público
Public → Solo contenido público
```

---

## 5. Arquitectura

### 5.1 Patrón

- **Feature-based modular structure**
- Cada feature es autocontenida (componentes + hooks + servicios + tipos)
- Separación estricta entre lógica e interfaz

### 5.2 Estructura de directorios

```
src/
├── app/                    → Next.js App Router pages
│   ├── (public)/           → Rutas públicas (landing, news, register)
│   ├── (dashboard)/        → Layout protegido con sidebar
│   │   ├── students/       → Student pages
│   │   ├── players/        → Player pages
│   │   └── coaches/        → Coach pages
│   ├── api/                → API routes (solo si necesario)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 → Button, Modal, Input, Toast, Loading
│   ├── layout/             → Sidebar, Navbar, Footer
│   └── shared/             → Avatar, Badge, Card, etc.
├── features/
│   ├── auth/               → Login, register, logout
│   ├── profiles/           → Perfiles públicos y privados
│   ├── courses/            → Sistema académico
│   ├── tasks/              → Sistema de tareas
│   ├── schedules/          → Horarios
│   ├── attendance/         → Asistencia
│   ├── payments/           → Pagos y becas
│   ├── notifications/      → Notificaciones Realtime
│   ├── teams/              → Gestión de equipos
│   ├── scrims/             → Scrims
│   ├── mail/               → Correo interno (futuro)
│   └── logs/               → Auditoría
├── lib/
│   ├── supabase/
│   │   ├── client.ts       → Cliente browser
│   │   ├── server.ts       → Cliente server
│   │   └── middleware.ts   → Cliente middleware
│   └── utils.ts            → Utilidades generales
├── hooks/                  → Custom hooks globales
├── types/                  → TypeScript interfaces globales
└── services/               → Servicios (capa de datos)
```

### 5.3 Principios de Desarrollo

1. TypeScript estricto en toda la base de código
2. Componentes reutilizables y pequeños
3. Lucide React como única librería de iconos
4. Integración Supabase desde el primer commit
5. Mobile First + responsive completo
6. Código modular (no archivos >500 líneas)
7. Seguridad basada en roles (RLS + middleware)
8. Escalabilidad horizontal (multi-team, multi-season)
9. Identidad visual de QU4SAR V1 mantenida
10. No HTML/CSS/JS vanilla — solo Next.js + React + TS + Tailwind

---

## 6. Sistema de Seasons

### 6.1 Concepto

Todo el contenido académico y competitivo depende de una **Season**.

Tabla: `seasons`

| Columna | Tipo | Descripción |
|---|---|---|
| id | UUID | Primary Key |
| name | TEXT | Ej: "Season 1 2026" |
| start_date | DATE | Inicio |
| end_date | DATE | Fin |
| is_active | BOOLEAN | Season actual |
| created_at | TIMESTAMPTZ | |

### 6.2 Entidades vinculadas a season

```
courses          → season_id
tasks            → season_id
evaluations      → season_id
attendance       → season_id
payments         → season_id
schedules        → season_id
scrims           → season_id
teams            → season_id
```

---

## 7. Sistema Académico

### 7.1 Cursos (Progresión)

| Curso | Meses | Rango Mínimo |
|---|---|---|
| Rookie | 1-2 | Hierro+ |
| Trainee | 3-4 | Bronce+ |
| Amateur | 5-6 | Plata+ |
| Competitor | 7-8 | Oro+ |
| Elite | 9-10 | Platino+ |
| Semi-Pro | 11-12 | Diamante+ |
| Pro | Graduado | Ascendente+ |

### 7.2 Estructura de cursos por season

```
Season
└── Courses (Rookie → Pro)
    └── Modules (por mes)
        ├── Materials (PDF, video, link)
        ├── Evaluations
        └── Tasks
```

Los coaches pueden crear módulos, materiales, evaluaciones y tareas **sin modificar código**.

### 7.3 Sistema de Notas

**Nota final:** 100 puntos

| Componente | Peso |
|---|---|
| Examen Final | 50% |
| Evaluaciones | 35% |
| Asistencia | 15% |

**Nota mínima de aprobación:** 80/100

### 7.4 Sistema de Promoción

Para promocionar al siguiente curso, el estudiante debe cumplir **AMBOS** requisitos:

1. Nota final >= 80/100
2. Rango mínimo requerido del curso

Si falla uno, **no promociona**.

### 7.5 Historial Académico

El estudiante conserva su historial completo a través de las seasons:
- Cursos anteriores y notas
- Certificados obtenidos
- Asistencias registradas
- Tareas entregadas y calificadas

---

## 8. Sistema de Tareas

### 8.1 Tipos de entrega permitidos

- PDF
- Imágenes (JPG, PNG, WebP)
- Videos (MP4, embed)
- Audio (MP3)
- Links externos

### 8.2 Estados

| Estado | Descripción |
|---|---|
| `pending` | Pendiente de entrega |
| `submitted` | Entregada por el alumno |
| `reviewed` | En revisión por el coach |
| `graded` | Calificada |
| `late` | Atrasada (automático) |

### 8.3 Ventana de Gracia

12 horas después de la fecha límite.

Las tareas atrasadas generan penalización automática en la nota.

---

## 9. Sistema de Horarios

Separados por tipo:

### 9.1 Horario Académico

Para estudiantes (Student role). Clases, tutorías, sesiones de entrenamiento.

### 9.2 Horario Competitivo

Para jugadores (Player role). Scrims, partidas, prácticas de equipo.

### 9.3 Programación

Los coaches pueden programar desde la **Semana 1** hasta la **Semana 24** de una Season.

---

## 10. Sistema de Pagos

### 10.1 Inscripción

**Costo:** 1 USD

**Tipos:**
- Alumno (Student)
- Jugador (Player)

### 10.2 Estados de pago

| Estado | Descripción |
|---|---|
| `pending` | Pendiente de pago |
| `paid` | Pagado |
| `scholarship` | Becado (exento) |
| `expired` | Vencido |

### 10.3 Becas

Solo becas completas (cubren el 100%).

Aplicables a Students y Players.

Flag: `scholarship: boolean` en profiles.

### 10.4 Restricción por deuda

Si existe deuda:
- Restringir acceso a toda la plataforma
- Solo permitir: estado de pagos, historial, renovación

### 10.5 Historial de Pagos

Cada transacción queda registrada con:
- Fecha
- Monto
- Método
- Season asociada
- Estado

Implementado desde el inicio (es parte del sistema de bloqueo).

---

## 11. Sistema de Equipos (Teams)

### 11.1 Arquitectura Multi-Team

Aunque inicialmente exista 1 equipo, la base de datos debe soportar múltiples equipos sin migraciones:

```
Team A (Main)
Team B (Academy)
Premier
```

### 11.2 Scrims

Gestionados completamente por coaches.

Registro por scrim:
- Fecha y hora
- Rival
- Resultado
- Estadísticas
- Asistencia de jugadores

### 11.3 Historial Competitivo

El jugador conserva:
- Scrims jugados
- Estadísticas por season
- Evaluaciones competitivas
- Equipos en los que ha estado

---

## 12. Sistema de Perfiles

### 12.1 Tipos de Perfil

| Tipo | Descripción |
|---|---|
| Student Profile | Perfil académico completo |
| Player Profile | Perfil competitivo completo |
| Coach Profile | Perfil simplificado |

### 12.2 Campos comunes

- Avatar
- Banner/cover
- Redes sociales
- Biografía
- Riot ID + Rango Valorant

### 12.3 Perfil Público

Generado automáticamente para cada usuario.

**Nunca exponer datos privados** (email, pago, notas internas).

Compartible mediante:
- Link único
- Descarga PNG

Solo quienes tengan el enlace pueden ver el perfil público.

---

## 13. Storage Organization (Supabase Storage)

Desde el día 1, organizado jerárquicamente:

```
avatars/
  {user_id}.jpg

banners/
  {user_id}.jpg

tasks/
  images/
  videos/

materials/
  pdf/
  videos/

certificates/
  {user_id}_{season_id}.png

public-profiles/
  {username}.png
```

---

## 14. Sistema de Notificaciones

### 14.1 Campana Superior

Notificaciones rápidas en tiempo real (Supabase Realtime).

### 14.2 Centro de Notificaciones

Historial completo de notificaciones recibidas.

### 14.3 Tipos de notificaciones

- Tarea asignada
- Tarea próxima a vencer
- Tarea calificada
- Evaluación programada
- Cambio de horario
- Pago requerido
- Mensaje recibido (futuro correo interno)

---

## 15. Sistema de Correo Interno (Futuro — Post-MVP)

### 15.1 Secciones

- Inbox (bandeja de entrada)
- Sent (enviados)

### 15.2 Formato de email institucional

```
nombreapellido@qu4sar.com
```

Si existe duplicado:

```
nombreapellido1@qu4sar.com
```

### 15.3 Prioridad

**Baja.** Se implementa después de:
- Login ✓
- Cursos ✓
- Notas ✓
- Horarios ✓
- Tareas ✓

---

## 16. Sistema de Logs (Auditoría)

Registrar por cada acción importante:

| Campo | Descripción |
|---|---|
| user_id | Quién realizó la acción |
| action | Qué acción (CREATE, UPDATE, DELETE, LOGIN, etc.) |
| module | Módulo afectado (courses, tasks, payments, etc.) |
| description | Descripción legible |
| ip | Dirección IP |
| created_at | Fecha y hora |

Visible para coaches.

---

## 17. Navegación

### 17.1 Público (sin auth)

Landing independiente (sin sidebar).

Secciones: Hero, Noticias, Información, Inscripciones.

### 17.2 Usuarios autenticados

**Dashboard Layout único** compartido por todos los roles:

```
┌─────────────┬──────────────────────────┐
│   Sidebar   │                          │
│   (fija)    │   Content (dinámico)     │
│             │                          │
│  Icon + txt │                          │
│             │                          │
│  Perfil     │                          │
│  Cursos     │                          │
│  Tareas     │                          │
│  ...        │                          │
│             │                          │
│  Logout     │                          │
└─────────────┴──────────────────────────┘
```

### 17.3 Sidebar

- Izquierda, fija
- Items visibles según rol
- Icono + texto en desktop
- Collapsible en mobile
- Perfil del usuario en la parte inferior

---

## 18. Flujo de Fases de Implementación

| Fase | Nombre | Dependencias |
|---|---|---|
| 0 | Infraestructura | — |
| 1 | Diseño (tema + componentes base) | Fase 0 |
| 2 | Auth + Roles | Fase 1 |
| 3 | Base de Datos completa (con Seasons) | Fase 2 |
| 3.5 | Seguridad y RLS | Fase 3 |
| 4 | Student Dashboard | Fase 3.5 |
| 5 | Player Dashboard | Fase 3.5 |
| 6 | Coach Dashboard | Fase 3.5 |
| 7 | Cursos + Módulos + Materiales | Fase 4, 6 |
| 8 | Tareas + Sistema de Notas | Fase 7 |
| 9 | Promoción (nota >= 80 + rango mínimo) | Fase 8 |
| 10 | Horarios (Académico + Competitivo) | Fase 7 |
| 11 | Notificaciones (campana + Realtime) | Fase 4 |
| 12 | Pagos + Becas | Fase 4 |
| 13 | Correo Interno | Fase 4 |
| 14 | Logs de Auditoría | Fase 3 |
| 15 | Optimización + Pulido | Fase 14 |

---

## 19. Reglas de Negocio Clave

### 19.1 Promoción

```
IF nota_final >= 80 AND rango_actual >= rango_minimo_curso THEN
    promociona = true
ELSE
    promociona = false
```

### 19.2 Bloqueo por deuda

```
IF payment_status IN ('pending', 'expired') AND scholarship = false THEN
    acceso_restringido = true
    solo_visible = [payments, payment_history, renewal]
ELSE
    acceso_completo
```

### 19.3 Tarea atrasada

```
IF NOW() > due_date + INTERVAL '12 hours' AND status = 'pending' THEN
    status = 'late'
    aplicar_penalizacion()
```

---

## 20. Seguridad

### 20.1 Principios

- **Service Role Key** NO se usa en frontend. Solo server-side.
- **RLS (Row Level Security)** en todas las tablas desde el día 1.
- **Policies por rol** (student, player, coach).
- **Storage Policies** para buckets de archivos.
- **Middleware** para protección de rutas.
- **Validación de permisos** en server components.

### 20.2 Prohibiciones

- No hardcodear credenciales en código
- No exponer datos privados en perfiles públicos
- No permitir escalada de privilegios por manipulación de rutas
- No usar Service Role Key en cliente

---

## 21. Documentos Asociados

Este documento debe leerse junto con:

| Documento | Propósito |
|---|---|
| `DATABASE_SCHEMA.md` | Esquema completo de base de datos |
| `USER_FLOWS.md` | Flujos de usuario por rol |
| `PERMISSIONS_MATRIX.md` | Matriz de permisos por rol + tabla |
| `ROUTES_MAP.md` | Mapa de rutas de la aplicación |
| `SECURITY_MODEL.md` | Modelo de seguridad (RLS, policies, storage) |

---

> **Fin del Documento Maestro de Especificación**
> Versión 2.0 — 2026-06-15
