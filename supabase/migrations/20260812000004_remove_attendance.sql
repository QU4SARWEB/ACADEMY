-- Eliminar sistema de asistencia completo (tabla y sus índices/constraints)
begin;

drop table if exists public.attendance;

commit;
