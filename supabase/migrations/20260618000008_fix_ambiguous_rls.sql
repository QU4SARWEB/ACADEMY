-- Fix: RLS policy had ambiguous column 'id' in correlated subquery
-- 'id' was resolving to conversation_participants.id instead of conversations.id
-- This caused conversations SELECT to always return empty for all users

DROP POLICY IF EXISTS "view_own_conversations" ON conversations;
CREATE POLICY "view_own_conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND profile_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_participants" ON conversation_participants;
CREATE POLICY "insert_participants" ON conversation_participants FOR INSERT WITH CHECK (
  profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.profile_id = auth.uid())
  OR public.is_coach()
);
