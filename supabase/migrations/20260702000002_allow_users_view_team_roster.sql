-- Allow users (players/students) to see all members of teams they belong to
CREATE POLICY users_view_team_roster ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE profile_id = auth.uid()
    )
  );
