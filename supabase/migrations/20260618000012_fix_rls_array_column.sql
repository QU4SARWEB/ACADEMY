-- Fix RLS recursion definitively: store participant IDs directly in conversations table
-- This eliminates the need for subqueries to conversation_participants in RLS policies

-- Step 1: Add participants array column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_ids UUID[] DEFAULT '{}';

-- Step 2: Populate participant_ids from existing data
UPDATE conversations c SET participant_ids = ARRAY(
  SELECT cp.profile_id FROM conversation_participants cp WHERE cp.conversation_id = c.id
);

-- Step 3: Recreate RLS policies without subqueries (breaks recursion)
DROP POLICY IF EXISTS "view_own_conversations" ON conversations;
CREATE POLICY "view_own_conversations" ON conversations FOR SELECT USING (
  auth.uid() = ANY(participant_ids)
);

DROP POLICY IF EXISTS "view_conv_participants" ON conversation_participants;
DROP POLICY IF EXISTS "view_own_participants" ON conversation_participants;
CREATE POLICY "view_own_participants" ON conversation_participants FOR SELECT USING (
  profile_id = auth.uid()
);

-- Step 4: Trigger to auto-update participant_ids when participants change
CREATE OR REPLACE FUNCTION sync_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations SET participant_ids = ARRAY(
      SELECT profile_id FROM conversation_participants WHERE conversation_id = NEW.conversation_id
    ) WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE conversations SET participant_ids = ARRAY(
      SELECT profile_id FROM conversation_participants WHERE conversation_id = OLD.conversation_id
    ) WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conv_participants ON conversation_participants;
CREATE TRIGGER trg_sync_conv_participants
AFTER INSERT OR DELETE ON conversation_participants
FOR EACH ROW EXECUTE FUNCTION sync_conversation_participants();
