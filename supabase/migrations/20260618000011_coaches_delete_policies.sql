-- Allow coaches to delete conversations, messages, tickets and responses
DROP POLICY IF EXISTS "coaches_delete_conversations" ON conversations;
CREATE POLICY "coaches_delete_conversations" ON conversations FOR DELETE USING (public.is_coach());

DROP POLICY IF EXISTS "coaches_delete_messages" ON chat_messages;
CREATE POLICY "coaches_delete_messages" ON chat_messages FOR DELETE USING (public.is_coach());

DROP POLICY IF EXISTS "coaches_delete_tickets" ON support_tickets;
CREATE POLICY "coaches_delete_tickets" ON support_tickets FOR DELETE USING (public.is_coach());

DROP POLICY IF EXISTS "coaches_delete_responses" ON ticket_responses;
CREATE POLICY "coaches_delete_responses" ON ticket_responses FOR DELETE USING (public.is_coach());
