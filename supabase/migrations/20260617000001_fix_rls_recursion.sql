-- Fix infinite RLS recursion on team_members
-- The original policy queried team_members inside its own policy, causing stack overflow.

-- 1. Create a SECURITY DEFINER helper that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE profile_id = auth.uid()
      AND team_members.team_id = is_team_member.team_id
  );
END;
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "view_team_members" ON team_members;

-- 3. Recreate without self-referencing subquery
CREATE POLICY "view_team_members" ON team_members
  FOR SELECT USING (
    public.is_coach() OR public.is_team_member(team_id)
  );
