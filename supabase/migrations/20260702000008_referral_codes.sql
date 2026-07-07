CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaches_manage_referral_codes ON referral_codes
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY users_read_referral_codes ON referral_codes
  FOR SELECT USING (true);

-- SECURITY DEFINER function to allow new users to redeem codes (bypasses RLS)
CREATE OR REPLACE FUNCTION public.use_referral_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_id UUID;
BEGIN
  SELECT id INTO v_ref_id FROM referral_codes
    WHERE code = p_code AND is_active = true;
  IF v_ref_id IS NULL THEN RETURN false; END IF;

  UPDATE referral_codes SET used_by = p_user_id, used_at = now(), is_active = false
    WHERE id = v_ref_id;
  UPDATE profiles SET role = 'coach' WHERE id = p_user_id;
  RETURN true;
END;
$$;
