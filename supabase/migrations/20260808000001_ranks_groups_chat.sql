-- 20260808000001_ranks_groups_chat.sql
-- 1) material_type 'image' para materiales de cursos
ALTER TABLE public.course_materials DROP CONSTRAINT IF EXISTS course_materials_material_type_check;
ALTER TABLE public.course_materials ADD CONSTRAINT course_materials_material_type_check
  CHECK (material_type IN ('video', 'document', 'link', 'text', 'image'));

-- 2) kind 'group' en conversations (grupos personalizados de mensajería)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('direct', 'course', 'team', 'group'));

-- 3) Políticas de borrado de mensajería
-- 3.1 Borrar mensajes propios
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
CREATE POLICY chat_messages_delete_own ON public.chat_messages
  FOR DELETE USING (sender_id = auth.uid());
GRANT DELETE ON public.chat_messages TO authenticated;

-- 3.2 Borrar/abandonar la conversación: el creador puede eliminar el hilo
DROP POLICY IF EXISTS conversations_delete_creator ON public.conversations;
CREATE POLICY conversations_delete_creator ON public.conversations
  FOR DELETE USING (created_by = auth.uid());
-- 3.3 Un miembro puede eliminarse (salir) de una conversación
DROP POLICY IF EXISTS conversation_participants_delete_self ON public.conversation_participants;
CREATE POLICY conversation_participants_delete_self ON public.conversation_participants
  FOR DELETE USING (profile_id = auth.uid());
GRANT DELETE ON public.conversations TO authenticated;
GRANT DELETE ON public.conversation_participants TO authenticated;