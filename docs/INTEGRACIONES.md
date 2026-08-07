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

## 6. Uploads: portadas, materiales, chat y subida desde el dispositivo — `[x]`

Pedido del usuario: "faltan funciones y buckets para subir imágenes en varias
zonas y poder subir desde el dispositivo".

### Buckets (ya existentes y en uso)
`avatars`, `banners`, `attachments`, `receipts`, `uploads`, `chat`,
`task-files`, `coaches`. El bucket `chat` y `task-files` no tenían políticas
completas de storage: migración nueva añade INSERT/SELECT/DELETE y update
propio de cada usuario.

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260807000001_uploads_features.sql` | `courses.cover_url`, `chat_messages.attachment_*`, políticas storage de `task-files` y `chat` |
| `src/2b3583/76ee3d.ts` | `getCourseCoverPath` + `uploadCourseCover`, helper de rutas |
| `src/4725dc/forms/FileDropzone.ts` | Dropzone con cámara en móvil (`capture`), botón "Tomar foto", preview con miniatura y drag & drop |
| `src/b3b32a/8abf18/ec35bd.ts` | Constructor de curso: subir archivo de material (bucket `attachments`) |
| `src/b3b32a/chat.ts` | Composer con adjunto (imagen/video/PDF/zip) en bucket `chat`, rende del attach en la burbuja |
| `src/b3b32a/8abf18/d74f85.ts` | Nuevo curso: elegir imagen de portada |
| `src/b3b32a/8abf18/e2b7c4.ts` | Editar curso: cambiar/quitar portada |
| `src/b3b32a/8abf18/0dfcce.ts` | Tabla de cursos del coach: miniatura de portada |
| `src/b3b32a/75d37c/0dfcce.ts` | Mis cursos + disponibles: tarjetas con portada |
| `src/b3b32a/75d37c/ec35bd.ts`, `8abf18/ec35bd.ts` | Detalle del curso: portada en cabecera |
| `src/b3b32a/shared/tasks.ts` | Entrega de tareas: botón "Tomar foto / escanear" (capture) + adjuntos |

### Subida desde el dispositivo
- Inputs `file` de todo el portal aceptan cámara del celular (`capture`) en las
  dropzones (`FileDropzone`) y en la entrega de tareas ("Tomar foto / escanear").
- Drag & drop en escritorio ya funcionaba en dropzones y ahora con preview y
  validación de tamaño.

---

## 7. Selects desplegables oscuros y rendimiento — `[x]`

- Estilos globales de `select` (fondo oscuro, flecha SVG propia, color texto
  claro) agregados al final de `src/bc4150/0c54ed.css` → ya no se ven "blanco
  horrible". Aplica a dashboards y web pública.
- Carga perezosa (`loading="lazy" decoding="async"`) en imágenes pesadas de la
  web pública (qu4sarfondoPublico/Vmobile).
- `initCoachDashboard` y `initStudentDashboard`: queries en `Promise.all`.
- `vite.config.ts`: `manualChunks` separa `vendor-supabase`, `vendor-icons`,
  `vendor-core` y `vendor` → el bundle principal pasó de ~792 kB a ~534 kB
  (gzip 195→128 kB) y los vendor se cachean por separado.

---

## Estado
- `[x]` Export a Excel en `ui_kit.ts` + botones estudiantes/pagos.
- `[x]` Llamadas → Google Meet (enlace por sala) + menú visible + BD aplicada.
- `[x]` Realtime suave en `fad58d.ts`.
- `[x]` Columna Plataforma en todas las tablas de alumnos (coach: Excel, asistencia, tareas, inscripciones, exámenes, notas, prácticos, pagos).
- `[x]` Uploads: portada de cursos, material de cursos, adjuntos de chat, subir desde el dispositivo (dropzone cámara + tareas).
- `[x]` Selects desplegables corregidos y más rápido el build (code-splitting vendors).
- `[x]` Builds `tsc` + `vite` verificados sin errores.
- `[ ]` Explicar lo de PWA y confirmar con el usuario.

---

## 8. Material "Imagen", mensajería completa y rangos visuales — `[x]`

### Bloque de curso con opción de imagen
- El select de "Nuevo material" en el constructor de curso ahora incluye **Imagen**,
  y al subir un archivo de imagen el `material_type` se guarda como `image`.
- En la lista de materiales del coach se muestra una miniatura de la imagen, y en la
  vista del estudiante se renderiza como tarjeta imagen (grilla con thumb).
- DB: `course_materials.material_type` admite `image` (migración aplicada).

| Archivo | Cambio |
|---|---|
| `src/b3b32a/8abf18/ec35bd.ts` | Select + detección `image` + miniatura en el constructor |
| `src/b3b32a/75d37c/ec35bd.ts` | Render imagen material en contenido del curso |
| `src/bc4150/0c54ed.css` | `.course-material--image`, `.course-material__img`, thumb |

**Mensajería en equipo y curso + "Coaches" + grupos + borrado**

- Ya se soportaba crear conversaciones de **Curso** y **Equipo**; ahora se añade
  accesibilidad desde el menú y **grupos personalizados** (nombre + integrantes).
- El menú lateral (estudiante y coach) incluye **Mensajes**. Los alumnos además ven
  una opción **Coaches** con todas las tarjetas de coaches y botón "Enviar mensaje".
- Borrado: cada mensaje propio tiene papelera; cada conversación/grupo tiene botón
  de eliminar (borra el hilo si eres el creador, o te quita de él si eres miembro).
- DB: política DELETE para `chat_messages` (propios), `conversations` (creador) y
  `conversation_participants` (salir); `conversations.kind` acepta `'group'`.

| Archivo | Cambio |
|---|---|
| `src/b3b32a/chat.ts` | Grupos, `?with=` (abrir directo con coach), eliminar mensajes y conversaciones |
| `src/b3b32a/75d37c/coaches.ts` | Nueva página Coaches (lista + enviar mensaje) |
| `src/34d59f/dc7161.ts` | Menú: Mensajes (ambos roles) y Coaches (estudiante) |
| `src/fad58d.ts` | Ruta `#/students/coaches` |
| `supabase/migrations/20260808_estructure` | `ranks_groups_chat.sql`: constraints + políticas DELETE |

**Rango en imágenes (dashboard, público y perfil)**

- Las imágenes de rango de Valorant (Iron→Radiante) que el usuario integró a
  `public/` ahora se muestran con badges: donde aparecen los cursos (dashboard,
  detalle, tabla del coach, modal de cursos del coach, tarjetas de estudiante),
  elegidas en la flecha pública del modal de cursos y en los perfiles.
- Nueva función `rankImage()/rankBadge()` en `src/2b3583/ranks.ts` mapea nombre de
  rango (ES/EN, con división) a la imagen correspondiente.

**Disposición**

- Perfil: las dos columnas `w-[600px]` fijas se cambian a `grid lg:grid-cols-2`,
  responsivo en móvil.
- Detalle de curso del coach: se quitó un `</div>` extra que desalineaba el encabezado.

---

## Estado
- `[x]` Export a Excel, llamadas Meet, realtime, plataforma, uploads, selects, perf.
- `[x]` Material de bloque con imagen, mensajería con grupos/borrado, Coaches, rangos visuales, disposición corregida.
- `[x]` Build `tsc` + `vite` verificados sin errores.
- `[ ]` Explicar lo de PWA y confirmar con el usuario.