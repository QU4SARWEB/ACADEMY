-- Notas: rangos por curso, nota mínima para aprobar y banderas de recuperación
begin;

-- 1) Actualizar rangos mínimos de los cursos existentes (escalado profesional)
update public.courses set min_rank = 'Ascendente' where slug = 'competitor' or lower(name) = 'competitor';
update public.courses set min_rank = 'Inmortal' where slug = 'elite' or lower(name) = 'elite';
update public.courses set min_rank = 'Ascendente' where slug = 'semi-pro' or lower(name) = 'semi-pro';
update public.courses set min_rank = 'Radiante' where slug = 'pro' or lower(name) = 'pro';

-- 2) Nota mínima para aprobar (por curso, default 14)
alter table public.courses add column if not exists min_pass_grade integer not null default 14;
comment on column public.courses.min_pass_grade is 'Nota mínima (sobre 20) para aprobar el curso';

-- 3) Banderas de recuperación en exámenes y tareas
alter table public.exams add column if not exists is_recovery boolean not null default false;
alter table public.course_tasks add column if not exists is_recovery boolean not null default false;

commit;
