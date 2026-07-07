-- Function to delete users whose payments expired 5+ days ago
-- Called from the frontend when coaches load the dashboard
CREATE OR REPLACE FUNCTION public.delete_expired_accounts()
RETURNS TABLE(deleted_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count INT := 0;
  v_user_id UUID;
BEGIN
  v_cutoff := now() - INTERVAL '5 days';

  FOR v_user_id IN
    SELECT DISTINCT p.id
    FROM profiles p
    JOIN payments pay ON pay.profile_id = p.id
    WHERE pay.status = 'expired'
      AND pay.created_at < v_cutoff
      AND p.role != 'coach'
  LOOP
    DELETE FROM auth.users WHERE id = v_user_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;
