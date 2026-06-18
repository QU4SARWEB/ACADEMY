-- Allow coaches to delete/desactivate profiles
DROP POLICY IF EXISTS "coaches_delete_profiles" ON profiles;
CREATE POLICY "coaches_delete_profiles" ON profiles FOR DELETE USING (public.is_coach());

-- Also update bulk delete to use the proper operation (profiles table RLS)
