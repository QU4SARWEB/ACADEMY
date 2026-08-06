# Profesionalización del Dashboard QU4SAR

Este documento registra el plan y el avance para subir el nivel profesional del
dashboard web. Se organiza por frentes de mejora con su estado y los archivos
involucrados.

> Convención de estado: `[x] hecho` · `[~] en curso` · `[ ] pendiente`

---

## 1. Búsqueda, filtros y paginación en tablas

Las listas largas (estudiantes, pagos, exámenes) cargaban todo sin paginación.
Se busca el patrón: input de búsqueda + filtros por curso/estado + paginación
en cliente, para que las vistas sigan siendo rápidas aunque haya cientos de filas.

- `[x]` Estudiantes (coach): búsqueda por nombre/Riot/Discord/email + filtros de curso + **paginación** + **exportar CSV**.
- `[x]` Pagos (coach): filtros por estado/curso + **exportar CSV**. (búsqueda por alumno pendiente)
- `[x]` Pagos (estudiante): búsqueda sobre el historial.
- `[ ]` Exámenes (coach): búsqueda por nombre en el modal de resultados.

**Componente compartido:** `src/4725dc/ui_kit.ts` provee `Pagination()`,
`SearchInput()`, `bindSearchInput()`, `EmptyState()`, `ErrorState()`,
`bindErrorRetry()`, `exportCsv()` y `initUiGlobals()` (atajos `/` y `Escape`).
Búsqueda y paginación se integran en cliente sobre los datos ya cargados.

---

## 2. Diálogos y confirmaciones

Unificar la confirmación en acciones destructivas. Coach ya usaba un modal propio
`confirmDialog` (`src/4725dc/b9f3a2.ts`); las vistas de estudiante usaban el
`confirm()` nativo del navegador, que se ve feo y es inconsistente.

- `[x]` Reemplazar `confirm()` por `confirmDialog` en vistas de estudiante:
  - Exámenes (reintentar, finalizar).
  - Tareas (reentregar).
- `[ ]` Revisar botones de borrado sin confirmación (borrado de preguntas en examen).

---

## 3. Estados vacíos y de error

Las páginas mostraban `<p>Error al cargar</p>` pelado o "sin datos" simple.
Se estandariza con un componente visual: icono + mensaje + acción ("Reintentar").

**Componente compartido:** `src/4725dc/ui_kit.ts`:
- `EmptyState({ icon, title, hint })` → bloque centrado para lista vacía.
- `ErrorState({ icon, title, hint })` → bloque con botón de reintentar (recarga la página).

`[x]` EmptyState/ErrorState en estudiantes, pagos (historial), dashboard y analítica. `[~]` resto de vistas (exámenes/tareas aún con texto simple).

---

## 4. Avatar y perfil

Ya existe subida de avatar en perfil de coach y alumno
(`src/b3b32a/8abf18/7d9748.ts`, `src/b3b32a/75d37c/7d9748.ts`) con bucket
`avatars/<uid>/...` (columna `profiles.avatar_url`). No crear columnas nuevas.

Pendiente menor:
- `[ ]` Vista previa con recorte (crop) antes de subir.
- `[x]` Avatar se muestra en sidebar, tablas y topbar.

---

## 5. Analítica del dashboard

El dashboard de coach muestra KPIs (alumnos, cursos, pagos por vencer) y tarjetas
de atención. Se quiere un resumen visual:
- `[x]` "Ingresos del mes" + bar chart (CSS) de pagos `paid` últimos 14 días ya en dashboard (4866e3.ts).
- `[ ]` "Actividad del mes": desglose de entregas/inscripciones por día pendiente.
- `[~]` Progreso por curso con barras ya existe en el dashboard de estudiante.

> Decisión: no agregar librería de charts pesada; SVG/CSS con clases de `0c54ed.css`. Si se requiere mucho más, integrar `chartist` o un web component local.

---

## 6. UX global

- `[x]` Atajos de teclado por página: `/` enfoca el buscador, `Escape` cierra diálogos/paneles (en `initUiGlobals`).
- `[ ]` Spinners de carga persistentes (`.btn` con estado "Guardando…" ya en varias vistas).
- `[ ]` Placeholder de portada en curso y avatar con inicial (ya en sidebar/tablas).
- `[ ]` Persistir tamaño de página buscada en `sessionStorage` (p. ej. `students.page`).

---

## 7. PWA

- `[x]` Manifest (`public/manifest.webmanifest`) + service worker consolidado (`public/sw.js`) con precache del shell, `fetch`-, push y `notificationclick`.
- `[x]` Registro en `src/4725dc/device_notifications.ts` apunta a `./sw.js` (se eliminó `notifications-sw.js` del registro; el archivo queda como huérfano en `public/`).
- `[ ]` Probar instalación/offline en producción (Vercel) y verificar que el precache guarda `404.html` para rutas deep-link.
- Registro del worker se hace solo en navegador (no en Tauri) y solo en producción
  para evitar cacheos en dev.

---

## 8. Accesibilidad

- `[x]` `aria-label` / roles en modales y botones icono (parcial).
- `[ ]` Contraste de textos secundarios en tablas.
- `[ ]` Focus ring visible al navegar con teclado (fuera de mouse).

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `src/4725dc/ui_kit.ts` | Componentes compartidos nuevos (empty/error/pager/csv) |
| `src/4725dc/b9f3a2.ts` | `confirmDialog` existente |
| `src/b3b32a/8abf18/75d37c.ts` | Lista de estudiantes (búsqueda/filtro/paginación/export) |
| `src/b3b32a/9e81e7/e639e9.ts` | Pagos (coach y estudiante) |
| `src/b3b32a/8abf18/4866e3.ts` | Dashboard coach (KPIs + analítica) |
| `src/b3b32a/75d37c/exams.ts` | Exámenes vista estudiante |
| `src/b3b32a/shared/tasks.ts` | Tareas compartidas (reentrega) |
| `public/manifest.webmanifest` | Manifest PWA |
| `public/sw.js` | Service worker básico |

## Decisiones tomadas

1. Vista de estudiante usa `confirmDialog` igual que coach (un solo patrón).
2. Charts sin librería externa (CSS/SVG) para no inflar el bundle (~ 1.3 MB ya).
3. No inventar columnas (p. ej. `avatar_url` ya existe; SIN `avatar_storage`).
4. Paginación siempre trabaja en la memoria ya cargada (no nueva query por página)
   para no aumentar llamadas a Supabase.
5. CSV usa BOM UTF-8 para que Excel abra acentos bien.