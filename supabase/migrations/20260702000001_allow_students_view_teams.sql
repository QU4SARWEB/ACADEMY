ALTER POLICY players_coaches_view_teams ON teams
  USING (user_role() = ANY (ARRAY['player', 'coach', 'student']));
