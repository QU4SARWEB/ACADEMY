-- Fix database linter warnings
-- 1. Enable RLS on coach_rubric_templates (ERROR: rls_disabled_in_public)
ALTER TABLE coach_rubric_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_manage_rubric_templates' AND tablename = 'coach_rubric_templates') THEN
    CREATE POLICY "coaches_manage_rubric_templates" ON coach_rubric_templates FOR ALL USING (public.is_coach());
  END IF;
END $$;

-- 2. Fix search_path on SECURITY DEFINER functions (WARN: function_search_path_mutable)

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'public'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN public.user_role() = 'coach';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.get_team_members(check_team_id UUID)
RETURNS SETOF team_members
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
STABLE
AS $$
  SELECT * FROM public.team_members WHERE team_id = check_team_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_profile_views(profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.public_profiles
  SET views = COALESCE(views, 0) + 1
  WHERE public_profiles.profile_id = increment_profile_views.profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE profile_id = auth.uid();
$$;

-- 3. Revoke EXECUTE from trigger-only functions for anon/authenticated (WARN: anon/authenticated_security_definer_function_executable)
-- These are called internally by triggers, not via RPC
REVOKE EXECUTE ON FUNCTION public.auto_enroll_on_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_exam_graded() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_exam_published() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_graded() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_response() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_conversation_participants() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_eval_score() FROM anon, authenticated;
