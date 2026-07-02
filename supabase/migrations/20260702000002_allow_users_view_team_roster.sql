-- Security definer function to avoid infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.get_user_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS 'SELECT team_id FROM team_members WHERE profile_id = auth.uid()';

-- Allow users (players/students) to see all members of teams they belong to
CREATE POLICY users_view_team_roster ON team_members
  FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids()));
