# Plan del Dashboard Academico QU4SAR

Fecha: 2026-08-05
Baseline protegida: `0b05a90`
Backup remoto: `backup-dashboard-redesign-20260805`
Backup tag: `backup-pre-dashboard-redesign-20260805`

## Objetivo

Convertir el dashboard actual en una plataforma academica completa, inspirada en la organizacion de Blackboard pero con identidad visual propia de QU4SAR.

La referencia sera funcional y estructural, no una copia visual. El dashboard debe responder rapidamente a estas preguntas:

- Que tengo que hacer hoy.
- Que esta pendiente o vencido.
- Cual es mi progreso.
- Que cambio desde la ultima visita.
- Como contacto a mi coach o a mis alumnos.
- Cual es el siguiente paso recomendado.

## Principios

- El curso sera la unidad principal de la experiencia academica.
- La pantalla de inicio mostrara contexto y acciones, no solo accesos.
- Cada estado tendra una lectura clara: pendiente, en progreso, entregado, calificado, vencido o completado.
- Las fechas, prioridades y siguientes acciones siempre seran visibles.
- La navegacion sera consistente para alumnos y coaches, con permisos por rol.
- Las nuevas tablas y funciones se agregaran de forma compatible, sin eliminar datos existentes.
- Se conservaran las rutas hash actuales durante la migracion.
- La experiencia movil sera parte del diseno, no un ajuste final.
- Las notificaciones no seran invasivas: agrupadas, deduplicadas y configurables.

## Arquitectura visual

### Shell global

- Sidebar por rol con secciones academicas y de cuenta.
- Topbar con nombre de pagina, breadcrumbs, busqueda y acciones rapidas.
- Centro de notificaciones con contador de no leidas.
- Acceso permanente a mensajes.
- Perfil, preferencias, plataforma y cerrar sesion.
- Contenedor principal con ancho, espaciado y estados de carga consistentes.
- Navegacion movil inferior o drawer segun la cantidad de items.

### Estados compartidos

- Loading skeleton por tipo de contenido.
- Empty state con explicacion y accion recomendada.
- Error state con reintento.
- Confirmaciones para acciones destructivas.
- Toast para acciones completadas.
- Modal para acciones cortas y panel de detalle para tareas largas.

## Navegacion del alumno

### Inicio

- Saludo y resumen del estado actual.
- Tarjeta de continuar aprendiendo.
- Progreso general y progreso por curso.
- Tareas proximas y vencidas.
- Proxima clase o evento del calendario.
- Ultima calificacion y actividad reciente.
- Avisos importantes y pagos pendientes.

### Mis cursos

- Lista de cursos inscritos.
- Progreso por curso.
- Ultimo modulo visitado.
- Acceso a materiales, tareas, examenes y notas del curso.
- Detalle de curso con tabs o secciones consistentes.

### Tareas

- Vistas: todas, pendientes, entregadas, calificadas y vencidas.
- Filtros por curso y semana.
- Fecha limite destacada.
- Estado de entrega visible sin abrir la tarea.
- Entrega de texto, archivos y enlaces.
- Feedback y calificacion dentro del detalle.

### Calendario

- Clases, scrims, tareas, examenes y eventos en una misma vista.
- Vista mensual y agenda proxima.
- Filtros por tipo de evento.
- Accion directa para abrir el detalle.

### Examenes y notas

- Examenes disponibles, iniciados y terminados.
- Intentos y resultados.
- Diferenciacion entre teoria y practica.
- Notas por curso y evolucion historica.
- Feedback del coach asociado.

### Mensajes, equipo y comunidad

- Conversaciones con coaches.
- Conversaciones relacionadas a un curso.
- Equipo actual y miembros.
- Avisos de comunidad y coordinacion.

### Pagos y perfil

- Estado de pago, fecha limite y dias restantes.
- Historial de comprobantes.
- Accion de renovar claramente visible.
- Perfil, plataforma, rango, configuracion y preferencias de notificaciones.

## Navegacion del coach

### Inicio

- Alumnos que requieren atencion.
- Tareas pendientes de calificar.
- Examenes pendientes de revisar.
- Proximas clases y horarios.
- Actividad reciente de alumnos.
- Acciones rapidas: nueva tarea, examen, horario o mensaje.

### Estudiantes

- Tabla optimizada para desktop y tarjetas para movil.
- Busqueda, filtros por curso, plataforma, estado y rango.
- Indicadores de ultima actividad.
- Acceso al detalle academico del alumno.
- Acciones masivas con confirmacion.

### Cursos

- Cursos asignados al coach.
- Modulos y materiales.
- Estudiantes inscritos.
- Progreso general del curso.
- Acciones de crear, editar y ordenar contenido.

### Tareas, examenes, asistencia y notas

- Crear y publicar contenido.
- Seleccionar curso y semana.
- Ver entregas pendientes.
- Calificar con feedback.
- Registrar asistencia por clase.
- Consultar el historial del alumno.
- Publicar notas y mantener trazabilidad de cambios.

### Mensajes, equipos y pagos

- Bandeja de conversaciones.
- Mensaje directo a uno o varios alumnos.
- Comunicacion por curso o equipo.
- Gestion de equipos y roster.
- Revision de pagos y comprobantes.

## Sistema de notificaciones

### Tipos iniciales

- Nueva tarea.
- Tarea calificada.
- Nuevo examen.
- Examen revisado.
- Nuevo horario o cambio de clase.
- Nuevo curso o inscripcion.
- Nuevo mensaje.
- Cambio de equipo.
- Pago pendiente, aprobado o vencido.
- Aviso general de academia.

### Flujo

1. Una accion de la base de datos genera un evento.
2. El evento se guarda en una tabla de notificaciones.
3. El dashboard actualiza el centro en tiempo real.
4. Si el usuario dio permiso, se envia notificacion del dispositivo.
5. Si la aplicacion esta visible, se usa toast y contador sin duplicar ruido.
6. Al abrir una notificacion se navega a la ruta relacionada.

### Datos previstos

Tabla `notifications`:

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `route`
- `read_at`
- `created_at`
- `metadata` JSONB

RLS: cada usuario solo puede leer y marcar sus propias notificaciones. Los coaches podran generar avisos mediante acciones autorizadas, nunca con acceso global desde el cliente.

## Mensajeria

### Primera version

- Conversacion directa alumno-coach.
- Lista de conversaciones ordenada por actividad.
- Mensajes no leidos.
- Envio en tiempo real.
- Estado de envio y fecha.
- Navegacion desde una notificacion.
- Scroll al ultimo mensaje.

### Segunda version

- Conversaciones por curso.
- Conversaciones por equipo.
- Adjuntos e imagenes.
- Respuestas y menciones.
- Busqueda de mensajes.
- Silenciar conversaciones.

### Seguridad

- Participantes explicitos por conversacion.
- RLS por participante.
- Validacion de tamano y tipo de archivo.
- Nunca exponer mensajes por consultas publicas.

## Modelo de datos a revisar

Se reutilizaran primero las entidades existentes:

- `profiles`
- `courses`
- `course_assignments`
- `enrollments`
- `tasks`
- `task_submissions`
- `schedules`
- `exams`
- `attendance`
- `grades`
- `teams`
- `team_members`
- `payments`

Antes de crear nuevas tablas se verificaran las tablas de mensajes existentes y sus politicas RLS. Las migraciones nuevas seran aditivas, idempotentes y se probaran contra el proyecto Supabase real.

## Fases de implementacion

### Fase 0: inventario y contratos

- Mapear rutas actuales.
- Revisar consultas y permisos por rol.
- Definir estados compartidos.
- Definir tipos de datos para dashboard, notificaciones y mensajes.
- No cambiar comportamiento todavia.

### Fase 1: shell global

- Crear topbar.
- Ordenar sidebar por rol.
- Agregar breadcrumbs, busqueda y acciones rapidas.
- Unificar loading, empty, error y toast.
- Validar desktop y movil.

### Fase 2: dashboard de alumno

- Reorganizar la pantalla de inicio.
- Conectar progreso, pendientes, calendario, notas y pagos.
- Agregar enlaces de contexto a cada tarjeta.

### Fase 3: dashboard de coach

- Resumen de atencion requerida.
- Tareas y examenes pendientes.
- Actividad de alumnos.
- Acciones rapidas y filtros.

### Fase 4: cursos y actividad academica

- Unificar detalle de curso.
- Mover tareas, materiales, examenes y notas al contexto del curso.
- Mejorar tablas y vistas moviles.

### Fase 5: notificaciones persistentes

- Crear tabla y politicas.
- Conectar eventos Realtime.
- Centro de notificaciones.
- Preferencias y deduplicacion.
- Integrar Web Notifications y service worker existente.

### Fase 6: mensajeria

- Auditar tablas actuales.
- Crear o adaptar conversaciones.
- RLS y realtime.
- Bandeja y detalle de conversacion.

### Fase 7: calidad y lanzamiento

- Pruebas por rol.
- Pruebas de RLS.
- Pruebas de rutas y refresh.
- Pruebas de notificaciones.
- Pruebas moviles.
- Verificacion de no regresion en pagos, tareas, examenes y perfiles.

## Criterios de aceptacion

- Un alumno entiende su siguiente accion en menos de cinco segundos.
- Un coach identifica pendientes sin abrir cada modulo.
- Cada notificacion lleva a una pantalla concreta.
- Los mensajes no se mezclan entre usuarios o cursos sin permiso.
- Todas las vistas importantes funcionan en movil.
- Las tablas no fuerzan scroll innecesario cuando existe una vista de tarjetas mejor.
- Ninguna migracion elimina datos existentes.
- Las rutas actuales siguen funcionando durante la transicion.
- `npm run build` pasa antes de cada push.

## Fuera de alcance inicial

- Copiar visualmente Blackboard.
- Rehacer la base de autenticacion.
- Cambiar el sistema de pagos sin una necesidad concreta.
- Cambiar datos academicos existentes.
- Agregar gamificacion antes de tener progreso y actividad bien estructurados.
- Enviar push real desde un servidor sin definir primero permisos, suscripciones y VAPID.

## Proximo paso

Cerrar pruebas de permisos y recorridos moviles del dashboard. Despues iniciaremos el cliente de PC usando los mismos contratos de autenticacion, cursos, mensajes y notificaciones.

## Estado de implementacion

Implementado en la primera iteracion posterior al backup:

- Shell global con topbar contextual, fecha, perfil y acceso a avisos.
- Centro de notificaciones persistentes con lectura, rutas y realtime.
- Notificaciones de dispositivo con permiso explicito, sonido y service worker.
- Eventos persistentes para tareas, horarios, pagos y mensajes.
- Ruta `/chat` para conversaciones directas realtime.
- RLS para conversaciones, participantes, mensajes y notificaciones.
- Inicio del alumno con siguiente tarea y proxima actividad reales.
- Accesos rapidos a Mensajes desde dashboards.
- Detalle de curso con modulos, materiales y progreso por material.
- Editor de contenido para coaches: crear/eliminar modulos y materiales.
- Mensajeria directa, por curso y por equipo con participantes y realtime.

Pendiente inmediato:

- Completar pruebas de permisos y recorridos moviles.

## Fases de la aplicacion de PC

### PC-0: contrato compartido

- Reutilizar Supabase Auth, perfiles, roles y permisos.
- Definir rutas y payloads compartidos con la web.
- Mantener una sola fuente de verdad para cursos, tareas, notas, mensajes y pagos.

### PC-1: shell de escritorio

- Ventana principal con sidebar, topbar y centro de actividad.
- Navegacion por cursos y conversaciones.
- Persistencia de sesion y preferencias visuales.
- Estados offline, reconexion y errores de red.

### PC-2: experiencia academica

- Cursos, modulos, materiales, tareas y examenes.
- Drag and drop de archivos.
- Vista de progreso y calendario.
- Mensajeria directa, por curso y equipo.

### PC-3: notificaciones y presencia

- Avisos de escritorio.
- Sonido configurable.
- Eventos realtime.
- Estado en linea y ultima actividad.

### PC-4: calidad y distribucion

- Instalador y actualizaciones.
- Logs de errores sin datos sensibles.
- Pruebas de permisos y sesiones expiradas.
- Pruebas en Windows y distintas resoluciones.
