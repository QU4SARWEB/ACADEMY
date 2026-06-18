-- Fix RLS policies for chat tables
-- Issue: INSERT into conversations with .select() fails because user isn't yet a participant

-- Conversations: allow INSERT with explicit ID, allow SELECT for participants
DROP POLICY IF EXISTS "insert_conversations" ON conversations;
DROP POLICY IF EXISTS "view_own_conversations" ON conversations;

CREATE POLICY "insert_conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "view_own_conversations" ON conversations FOR SELECT USING (
  auth.uid() IN (SELECT profile_id FROM conversation_participants WHERE conversation_id = id)
);

-- Conversation participants: allow INSERT for the creator or coach
DROP POLICY IF EXISTS "insert_participants" ON conversation_participants;
DROP POLICY IF EXISTS "view_own_participants" ON conversation_participants;

CREATE POLICY "insert_participants" ON conversation_participants FOR INSERT WITH CHECK (
  profile_id = auth.uid() OR public.is_coach()
);
CREATE POLICY "view_own_participants" ON conversation_participants FOR SELECT USING (profile_id = auth.uid());

-- Messages: keep existing policies
DROP POLICY IF EXISTS "insert_own_messages" ON chat_messages;
DROP POLICY IF EXISTS "view_conv_messages" ON chat_messages;

CREATE POLICY "insert_own_messages" ON chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);
CREATE POLICY "view_conv_messages" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = chat_messages.conversation_id AND profile_id = auth.uid())
);
