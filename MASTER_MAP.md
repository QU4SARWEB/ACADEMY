# Mapa Maestro QU4SAR — Fase 0.5

> Documento de referencia para la consolidación.
> Cada página tiene: Ruta | Rol | Archivo | Estado | Acción | Reemplazo

---

## RUTAS PÚBLICAS

| Ruta | Rol | Archivo | Estado | Acción | Reemplazo |
|------|-----|---------|--------|--------|-----------|
| `/` | Todos | `b3b32a/106a6c` | ✅ COMPLETO | Mantener | — |
| `/login` | Todos | `fa53b9/d56b69` | ✅ COMPLETO | Mantener | — |
| `/register` | Todos | `fa53b9/9de4a9` | ✅ COMPLETO | Mantener | — |
| `/reset-password` | Todos | `fa53b9/037c60` | ✅ COMPLETO | Mantener | — |
| `/p/:slug` | Todos | `b3b32a/9e81e7/90b027` | ✅ COMPLETO | Mantener | — |

---

## RUTAS COACH

| Ruta | Archivo | Estado | Acción | Reemplazo |
|------|---------|--------|--------|-----------|
| `/coaches/dashboard` | `8abf18/4866e3` | ✅ COMPLETO | Mantener + agregar sidebar | — |
| `/coaches/profile` | `8abf18/7d9748` | ✅ COMPLETO | Mantener | — |
| `/coaches/students` | `8abf18/75d37c` | ✅ COMPLETO | Mantener | — |
| `/coaches/students/:id` | `8abf18/b60dbf` | ✅ COMPLETO | Mantener | — |
| `/coaches/players` | `8abf18/a2bbab` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses` | `8abf18/0dfcce` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/new` | `8abf18/d74f85` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id` | `8abf18/ec35bd` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id/edit` | `8abf18/e2b7c4` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id/exams` | `8abf18/a9f8d1` | ✅ COMPLETO | **MEJORAR**: unificar assessments | — |
| `/coaches/courses/:id/attendance` | `8abf18/64c62c` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id/grades` | `8abf18/c5e3f2` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id/modules/new` | `8abf18/b7d4a6` | ✅ COMPLETO | Mantener | — |
| `/coaches/courses/:id/modules/:mid` | `8abf18/201980` | ✅ COMPLETO | Mantener | — |
| `/coaches/tasks` | `8abf18/2cb1ad` | ✅ COMPLETO | Mantener | — |
| `/coaches/tasks/new` | `8abf18/cdc0b9` | ✅ COMPLETO | Mantener | — |
| `/coaches/tasks/:id` | `8abf18/2f2d16` | ✅ COMPLETO | Mantener | — |
| `/coaches/evaluations` | `8abf18/a116c0` | ❌ **ELIMINAR** | Bug: preguntas no persisten | Unificado en exams |
| `/coaches/evaluations/new` | `8abf18/7528d8` | ❌ **MIGRAR** luego ELIMINAR | Reemplazado por exams | Exams unified |
| `/coaches/evaluations/:id` | `8abf18/1868f3` | ❌ **MIGRAR** luego ELIMINAR | Reemplazado por exams | Exams unified |
| `/coaches/schedules` | `8abf18/70ec15` | ✅ COMPLETO | Mantener (ganador inline) | — |
| ~~`/coaches/schedules/new`~~ | ~~`8abf18/b41a3a`~~ | ❌ **ELIMINADO** F2 | Duplicado | Inline `70ec15` |
| `/coaches/seasons` | `8abf18/85ed15` | ✅ COMPLETO (+is_active) | Mantener (ganador inline) | — |
| ~~`/coaches/seasons/new`~~ | ~~`8abf18/3ca400`~~ | ❌ **ELIMINADO** F2 | Duplicado | Inline `85ed15` |
| `/coaches/teams` | `8abf18/8fd6f4` | ✅ COMPLETO | Mantener | — |
| `/coaches/scrims` | `8abf18/634637` | ✅ COMPLETO | Mantener | — |
| `/coaches/promotions` | `8abf18/ea6aeb` | ✅ COMPLETO | Mantener | — |
| `/coaches/questions` | `8abf18/478669` | ✅ COMPLETO | Mantener (ganador inline) | — |
| ~~`/coaches/questions/new`~~ | ~~`8abf18/e3b770`~~ | ❌ **ELIMINADO** F2 | Schema incorrecto (`text` vs `stem`) | Inline `478669` |
| `/coaches/questions/:id` | `8abf18/2784c7` | ✅ COMPLETO | Mantener | — |

---

## RUTAS STUDENT

| Ruta | Archivo | Estado | Acción | Reemplazo |
|------|---------|--------|--------|-----------|
| `/students/dashboard` | `75d37c/4866e3` | ✅ COMPLETO | Mantener | — |
| `/students/profile` | `75d37c/7d9748` | ✅ COMPLETO | Mantener | — |
| `/students/courses` | `75d37c/0dfcce` | ✅ COMPLETO | Mantener | — |
| `/students/courses/:id` | `75d37c/ec35bd` | ✅ COMPLETO | Mantener | — |
| `/students/courses/:id/evaluations` | `75d37c/a116c0` | ❌ **MIGRAR** luego ELIMINAR | Reemplazado por exams | Exams unified |
| `/students/courses/:id/exams` | `75d37c/e1760f` | ✅ COMPLETO | **MEJORAR**: mostrar unified assessments | — |
| `/students/courses/:id/exams/:examId` | `75d37c/916e16` | ✅ COMPLETO | **MEJORAR**: soportar manual grading | — |
| `/students/tasks` | `75d37c/2cb1ad` | ✅ COMPLETO | Mantener | — |
| `/students/tasks/:id` | `75d37c/2f2d16` | ✅ COMPLETO | Mantener | — |
| `/students/grades` | `75d37c/fce448` | 🟡 BÁSICO | **MEJORAR**: desglose por assessment | — |
| `/students/schedule` | `75d37c/799855` | ✅ COMPLETO | Mantener | — |
| `/students/evaluations` | `75d37c/f9e8d7` | ❌ **MIGRAR** luego ELIMINAR | Reemplazado por exams | Exams unified |
| `/students/evaluations/:id` | `75d37c/1868f3` | ❌ **MIGRAR** luego ELIMINAR | Reemplazado por exams | Exams unified |

---

## RUTAS PLAYER

| Ruta | Archivo | Estado | Acción | Reemplazo |
|------|---------|--------|--------|-----------|
| `/players/dashboard` | `a2bbab/4866e3` | ✅ COMPLETO | Mantener | — |
| `/players/profile` | `a2bbab/7d9748` | ✅ COMPLETO | Mantener | — |
| `/players/courses` | `a2bbab/d1e5f3` | 🟡 BÁSICO | **MEJORAR**: agregar course detail | — |
| `/players/tasks` | `a2bbab/e8f6c1` | 🟡 BÁSICO | **MEJORAR**: filtrar por enrollment, agregar detail | — |
| `/players/schedule` | `a2bbab/799855` | ✅ COMPLETO | Mantener | — |
| `/players/scrims` | `a2bbab/634637` | ✅ COMPLETO | Mantener | — |
| `/players/team` | `a2bbab/f89442` | ✅ COMPLETO | Mantener | — |

### Player — pendiente de crear

| Ruta | Archivo propuesto | Acción |
|------|-------------------|--------|
| `/players/tasks/:id` | `a2bbab/taskDetail.ts` | **CREAR** (basado en student) |
| `/players/courses/:id` | `a2bbab/courseDetail.ts` | **CREAR** (basado en student) |

---

## RUTAS COMPARTIDAS

| Ruta | Archivo | Estado | Acción | Reemplazo |
|------|---------|--------|--------|-----------|
| `/payments` | `9e81e7/e639e9` | ✅ COMPLETO | Mantener | — |
| `/notifications` | `9e81e7/f37bd2` | ✅ COMPLETO | Mantener | — |
| `/mail` | `9e81e7/b83a88` | ✅ MVP | **MEJORAR** después de consolidation | Chat fase 6 |
| `/logs` | `9e81e7/2165e4` | ✅ COMPLETO | Mantener | — |

---

## SIDEBAR — LINKS POR ROL

### Coach (actual: 12 links → después: 15 links)

| Antes | Después |
|-------|---------|
| ❌ No tiene Dashboard | ✅ Dashboard |
| ❌ No tiene Mensajes | ✅ Mensajes |
| ❌ No tiene Notificaciones | ✅ Notificaciones |
| ✅ Estudiantes | ✅ |
| ✅ Jugadores | ✅ |
| ✅ Cursos | ✅ |
| ✅ Tareas | ✅ |
| ✅ Evaluaciones → ❌ **ELIMINAR** | ✅ (reemplazado por Exams dentro de curso) |
| ✅ Preguntas | ✅ |
| ✅ Horarios | ✅ |
| ✅ Temporadas | ✅ |
| ✅ Equipos | ✅ |
| ✅ Scrims | ✅ |
| ✅ Promociones | ✅ |
| ✅ Auditoría | ✅ |
| ⚠️ Configuración (duplicado de Perfil) | ❌ **ELIMINAR** |

### Student (actual: 10 links → después: 9 links)

| Antes | Después |
|-------|---------|
| ✅ Dashboard | ✅ |
| ✅ Perfil | ✅ |
| ✅ Pagos | ✅ |
| ✅ Horario | ✅ |
| ✅ Tareas | ✅ |
| ✅ Cursos | ✅ |
| ✅ Evaluaciones → ❌ **ELIMINAR** | ✅ (reemplazado por Exams global) |
| ✅ Calificaciones | ✅ |
| ✅ Notificaciones | ✅ |
| ✅ Mensajes | ✅ |
| ⚠️ Configuración (duplicado) | ❌ **ELIMINAR** |

### Player (actual: 10 links → después: 9 links)

| Antes | Después |
|-------|---------|
| ✅ Dashboard | ✅ |
| ✅ Perfil | ✅ |
| ✅ Pagos | ✅ |
| ✅ Horario | ✅ |
| ✅ Tareas | ✅ |
| ✅ Cursos | ✅ |
| ✅ Equipo | ✅ |
| ✅ Scrims | ✅ |
| ✅ Notificaciones | ✅ |
| ✅ Mensajes | ✅ |
| ⚠️ Configuración (duplicado) | ❌ **ELIMINAR** |

---

## ARCHIVOS A DEPRECATED (6)

| Archivo | Ruta anterior | Fecha | Verificado |
|---------|--------------|-------|------------|
| `ce50a0.ts` | `4725dc/` | Hoy | 0 referencias |
| `608ece.ts` | `4725dc/` | Hoy | 0 referencias |
| `a43c1b.ts` | `4725dc/` | Hoy | 0 referencias |
| `b5c1f3.ts` | `34d59f/` | Hoy | 0 referencias |
| `8d777f.ts` | `2b3583/` | Hoy | 0 referencias |
| `84d5ea.ts` | `b3b32a/9e81e7/` | Hoy | 0 referencias (exports duplicados de e639e9) |

---

## ARCHIVOS A ELIMINAR (después de verificación) — 5

| Archivo | Ruta | Depende de | Eliminar cuando |
|---------|------|-----------|-----------------|
| ~~`3ca400.ts`~~ | ~~Seasons new~~ | ✅ **ELIMINADO** Fase 2 | ✔ |
| ~~`b41a3a.ts`~~ | ~~Schedules new~~ | ✅ **ELIMINADO** Fase 2 | ✔ |
| ~~`e3b770.ts`~~ | ~~Questions new~~ | ✅ **ELIMINADO** Fase 2 | ✔ |
| `a116c0.ts` | Coach eval list | Solo `fad58d.ts:23` | ⏳ Fase 3 (post-migración) |
| `7528d8.ts` | Coach eval new | Solo `fad58d.ts:42` | ⏳ Fase 3 (post-migración) |
| `1868f3.ts` | Coach eval detail | Solo `fad58d.ts:43` | ⏳ Fase 3 (post-migración) |
| `75d37c/1868f3.ts` | Student eval answer | Solo `fad58d.ts:57` | ⏳ Fase 3 (post-migración) |
| `75d37c/f9e8d7.ts` | Student eval list | Solo `fad58d.ts:56` | ⏳ Fase 3 (post-migración) |
| `75d37c/a116c0.ts` | Student course evals | Solo `fad58d.ts:54` | ⏳ Fase 3 (post-migración) |

---

## ORDEN DE EJECUCIÓN (FINAL)

```
Fase 0   ✔ Backup (git tag pre-consolidation + git branch)
Fase 0.5 ✔ Mapa maestro (este documento)
─────────────────────────────────────
Fase 1   Sidebar coach (dc7161.ts)
         + Eliminar Config duplicado
─────────────────────────────────────
Fase 2   ✅ Duplicados obvios
         Eliminados: 3ca400, b41a3a, e3b770
         + rutas en fad58d.ts
         + is_active agregado a seasons inline
         + type select agregado a schedules inline
─────────────────────────────────────
Fase 3   Assessments unificados
         SQL: migrar evaluations → exams
         Frontend: unificar en a9f8d1.ts
         Eliminar: 6 archivos de evaluations
─────────────────────────────────────
Fase 4   Completar Player
         Crear: /players/tasks/:id, /players/courses/:id
         Mejorar: player tasks list (filtrar), player courses (detalle)
─────────────────────────────────────
Fase 5   Formularios reutilizables
         Crear: SearchableSelect, FileDropzone, Toggle
         Aplicar a formularios existentes
─────────────────────────────────────
Fase 6   Chat moderno
         Reemplazar /mail con chat UI
─────────────────────────────────────
Fase 7   Soporte/Tickets
         Tabla + páginas coach/student/player
```
