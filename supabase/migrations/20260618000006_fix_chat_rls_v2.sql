-- Fix RLS for conversation_participants: allow adding others after user joins
DROP POLICY IF EXISTS "insert_participants" ON conversation_participants;

CREATE POLICY "insert_participants" ON conversation_participants FOR INSERT WITH CHECK (
  profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.profile_id = auth.uid())
  OR public.is_coach()
);

-- Create storage bucket for chat attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
SELECT 'chat', 'chat', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat');

-- Allow authenticated users to upload to chat bucket
DROP POLICY IF EXISTS "chat_upload" ON storage.objects;
CREATE POLICY "chat_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'chat' AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "chat_select" ON storage.objects;
CREATE POLICY "chat_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'chat' AND auth.role() = 'authenticated'
);
