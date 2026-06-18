-- Fase 7.1: Chat tables
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cpart_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cpart_profile ON conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_chatmsg_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatmsg_created ON chat_messages(created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "view_own_conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND profile_id = auth.uid())
);
CREATE POLICY "insert_conversations" ON conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "view_own_participants" ON conversation_participants FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "insert_participants" ON conversation_participants FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM conversation_participants WHERE conversation_id = conversation_id) OR public.is_coach()
);

CREATE POLICY "view_conv_messages" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = chat_messages.conversation_id AND profile_id = auth.uid())
);
CREATE POLICY "insert_own_messages" ON chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = chat_messages.conversation_id AND profile_id = auth.uid())
);
