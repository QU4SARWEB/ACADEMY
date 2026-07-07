ALTER TABLE referral_codes
  DROP CONSTRAINT IF EXISTS referral_codes_coach_id_fkey,
  ADD CONSTRAINT referral_codes_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE referral_codes
  DROP CONSTRAINT IF EXISTS referral_codes_used_by_fkey,
  ADD CONSTRAINT referral_codes_used_by_fkey
    FOREIGN KEY (used_by) REFERENCES profiles(id) ON DELETE SET NULL;
