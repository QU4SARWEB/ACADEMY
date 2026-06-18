-- Allow all participants to delete messages and conversations (not just coaches)
DROP POLICY IF EXISTS "coaches_delete_conversations" ON conversations;
DROP POLICY IF EXISTS "coaches_delete_messages" ON chat_messages;

CREATE POLICY "participants_delete_conversations" ON conversations FOR DELETE USING (
  auth.uid() = ANY(participant_ids)
);

CREATE POLICY "participants_delete_messages" ON chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = chat_messages.conversation_id AND profile_id = auth.uid())
);

-- Tickets remain coach-only for delete
