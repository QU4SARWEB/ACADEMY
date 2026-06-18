-- Fix: break mutual recursion between conversation_participants and conversations RLS
-- view_conv_participants → queries conversations → view_own_conversations → queries conversation_participants → infinite loop

-- Step 1: Create a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT conversation_id FROM conversation_participants WHERE profile_id = auth.uid();
$$;

-- Step 2: Recreate view_conv_participants using the helper function (no RLS recursion)
DROP POLICY IF EXISTS "view_conv_participants" ON conversation_participants;
CREATE POLICY "view_conv_participants" ON conversation_participants FOR SELECT USING (
  conversation_id IN (SELECT public.get_user_conversation_ids())
);
