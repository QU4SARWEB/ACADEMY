-- Fix team_members RLS recursion (42P17)
-- The old policies referenced team_members through is_team_member() or is_coach()->user_role()->profiles
-- Now all helper functions are SECURITY DEFINER, but PostgreSQL 14+ still detects
-- plan-level recursion when a policy references the same table through a function.

-- Drop ALL old policies on team_members
DROP POLICY IF EXISTS "view_team_members" ON team_members;
DROP POLICY IF EXISTS "coaches_manage_team_members" ON team_members;
DROP POLICY IF EXISTS "users_manage_own_team" ON team_members;

-- Coaches can do everything (no same-table reference)
CREATE POLICY "coaches_manage_team_members" ON team_members
  FOR ALL
  USING (public.is_coach());

-- Users can see their own memberships (no same-table reference: uses auth.uid() directly)
CREATE POLICY "users_manage_own" ON team_members
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- SECURITY DEFINER function to get all members of a team (bypasses RLS entirely)
CREATE OR REPLACE FUNCTION public.get_team_members(check_team_id UUID)
RETURNS SETOF team_members
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.team_members WHERE team_id = check_team_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members TO authenticated;

-- Fix scrims policy to use SD function instead of direct subquery
DROP POLICY IF EXISTS "view_scrims" ON scrims;
CREATE POLICY "view_scrims" ON scrims
  FOR SELECT USING (
    public.is_coach() OR
    EXISTS (SELECT 1 FROM public.get_team_members(team_id) WHERE profile_id = auth.uid())
  );
