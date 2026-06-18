-- Fix RLS for chat to work across all roles
-- 1. Allow all authenticated users to read profiles (needed for chat: sender name, avatar, etc.)
--    The platform already exposes names in enrollments, courses, etc. so this is consistent
DROP POLICY IF EXISTS "auth_read_profiles" ON profiles;
CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow viewing participants of conversations you belong to (needed for duplicate detection)
DROP POLICY IF EXISTS "view_conv_participants" ON conversation_participants;
CREATE POLICY "view_conv_participants" ON conversation_participants FOR SELECT USING (
  conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE profile_id = auth.uid())
);
