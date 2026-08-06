# Integraciones y mejoras — Plan acumulado

> Estado: `[x] hecho · [~] en curso · [ ] pendiente`

## 1. Exportar a Excel (.xls SpreadsheetML) en vez de CSV — `[x]`

- **CSV** (*Comma-Separated Values*) es texto plano: una fila por línea, valores
  separados por comas. Excel lo abre, pero a veces muestra mal los acentos y las
  celdas con saltos de línea.
- Para que "lo dé en Excel" como pidió el usuario, los exportes pasan a generar
  un **archivo SpreadsheetML** (XML nativo de Excel con `.xls`) que abre directo,
  con acentos y formatos correctos.

| Archivo | Cambio |
|---|---|
| `src/4725dc/ui_kit.ts` | Nueva función `exportExcel(fileName, sheetName, headers, rows)` |
| `src/b3b32a/8abf18/75d37c.ts` | Botón "Exportar Excel" de estudiantes (Nombre, Email, Cursos, Estado) |
| `src/b3b32a/9e81e7/e639e9.ts` | Botón "Exportar Excel" de pagos (Estudiante, Email, Estado) |

**Formato**: XML SpreadsheetML con namespace `urn:schemas-microsoft-com:office:spreadsheet`,
celdas `<Cell><Data ss:Type="String">valor</Data></Cell>`. Se escapan `&`, `<`, `>`, `"`.
`exportCsv` se mantiene por compatibilidad pero ya no se usa en estos botones.

---

## 2. Llamadas con Google Meet (sustituye a LiveKit) — `[x]`

La sección Llamadas estaba oculta del menú y usaba LiveKit (audio/video). Se
reemplaza por **Google Meet**:

- Cada sala guarda un **enlace de Google Meet** (`meet_url`).
- El formulario del coach permite pegar el enlace de la sala al crearla.
- El coach puede agregar/cambiar el enlace por sala con el botón de ajustes.
- El botón "Entrar" abre el enlace de Meet en pestaña nueva (y además copia el
  enlace de la sala).
- Si la sala no tiene enlace aún se muestra "Enlace pendiente".
- Se volvió a mostrar "Llamadas" en el menú lateral (alumno y coach).

| Archivo | Cambio |
|---|---|
| `src/b3b32a/calls.ts` | Refactor → enlace Meet por sala |
| `src/34d59f/dc7161.ts` | Ítem Llamadas reactivado en el menú |
| `src/bc4150/0c54ed.css` | Estilos `call-meet-badge`, `call-meet-missing` |
| `supabase/migrations/20260806000001_call_rooms.sql` | Añade columna `meet_url` |
| `supabase/functions/livekit-token` | Se deja sin usar (deprecated) |
| `package.json` | Se quitó `livekit-client` |

> La migración de `call_rooms` + `call_sessions` + `call_room_participants` se
> aplicó a producción con la Management API (RLS, políticas, trigger de
> notificaciones y publicación realtime incluidos).

> Advertencia: crear una reunión Meet programáticamente requiere credenciales
> de Google (OAuth). La solución práctica: el coach pega un enlace Meet en la
> sala. Es lo que se documenta e implementa aquí.

---

## 3. Realtime en toda la web (actualización sin recarga) — `[x]`

Antes un cambio en BD provocaba `location.reload()` (recarga completa). Ahora:

- Se re-ejecuta `router.resolve()` (el `init` de la ruta actual) al recibir un
  evento realtime.
- Se mantiene el debounce en `reloadSoon()` para no saturar a Supabase.
- No refresca en `/new`, `/edit`, `/settings`.
- Se añadieron avisos (`notifyDevice`) para `call_rooms` y `call_sessions`.

| Archivo | Cambio |
|---|---|
| `src/fad58d.ts` | `reloadSoon()` re-renderiza vía `router.resolve()` (fallback a reload) |
| `src/f3395c.ts` | Se expone `router.resolve()` (ya existía, no cambió) |

---

## 4. Columna "Plataforma" en todas las tablas de alumnos — `[x]`

Pedido del usuario: que en todas las tablas donde aparece un alumno se muestre la
**plataforma** en la que juega (PC o Mobile, campo `profiles.platform`).

Se añadió como una columna con badge `PC`/`Mobile` en todas las tablas del área de coach:

| Archivo | Tabla |
|---|---|
| `8abf18/75d37c.ts` | Lista de Estudiantes (ya existía) + export Excel con Plataforma |
| `8abf18/70ec15.ts` | Modal de Notas en Horarios |
| `8abf18/attendance.ts` | Modal de Asistencia |
| `8abf18/tasks.ts` | Modal de Entregas de tareas |
| `8abf18/enroll.ts` | Inscribir – tabla Mis alumnos y Alumnos sin curso |
| `8abf18/exams.ts` | Resultados de exámenes |
| `8abf18/grades.ts` | Planilla de Notas por curso |
| `8abf18/practical.ts` | Exámenes Prácticos por curso |
| `9e81e7/e639e9.ts` | Gestión de Pagos (tabla + export Excel) |

Sin plataforma no hay badge: default = PC.

---

## 5. PWA — resumen
**PWA** (*Progressive Web App*) = web que se comporta como app nativa mediante:
`manifest.webmanifest` (instalable, iconos) + `service worker` (offline, push).

En QU4SAR: `public/manifest.webmanifest` + `public/sw.js` registrado en
`src/4725dc/device_notifications.ts`. Corregido el precache (sin `APP_CORE`) y
el meta-tag en `index.html`. Pendiente probarlo en producción.

---

## Estado
- `[x]` Export a Excel en `ui_kit.ts` + botones estudiantes/pagos.
- `[x]` Llamadas → Google Meet (enlace por sala) + menú visible + BD aplicada.
- `[x]` Realtime suave en `fad58d.ts`.
- `[x]` Columna Plataforma en todas las tablas de alumnos (coach: Excel, asistencia, tareas, inscripciones, exámenes, notas, prácticos, pagos).
- `[x]` Builds `tsc` + `vite` verificados sin errores.
- `[ ]` Explicar lo de PWA y confirmar con el usuario.