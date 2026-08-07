-- Uploads: portada de cursos + adjuntos de chat + políticas de storage

-- 1) Portada de curso (imagen de tarjeta / hero)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS cover_url text;

-- 2) Adjuntos en mensajes del chat
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text,
ADD COLUMN IF NOT EXISTS attachment_type text;

-- 3) Políticas de storage para el bucket "task-files" (entregas de tareas)
drop policy if exists "task_files_insert" on storage.objects;
create policy "task_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-files'::text);

drop policy if exists "task_files_select" on storage.objects;
create policy "task_files_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'task-files'::text);

drop policy if exists "task_files_delete" on storage.objects;
create policy "task_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-files'::text);

-- 4) Adjuntos del chat: delete/update solo de los archivos del propio usuario
--    (path con el id de usuario como primer segmento). chat_upload ya permite insertar.
drop policy if exists "chat_manage_delete" on storage.objects;
create policy "chat_manage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat'::text
    AND ((auth.uid())::text = (storage.foldername(name))[1])
  );

drop policy if exists "chat_manage_update" on storage.objects;
create policy "chat_manage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'chat'::text
    AND ((auth.uid())::text = (storage.foldername(name))[1])
  );