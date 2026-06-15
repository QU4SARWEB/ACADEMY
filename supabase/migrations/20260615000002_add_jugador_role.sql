-- ============================================================
-- Migration: Add jugador role to profiles CHECK constraint
-- ============================================================

-- Drop existing CHECK constraint and recreate with jugador
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'coach', 'student', 'jugador'));

-- RLS policy: jugador can view own profile, admin/coach can view all
CREATE POLICY "admins_coaches_view_jugadores" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'coach'))
  );

-- Update the trigger function to handle jugador role (same as student for now)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    'pending_payment'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
