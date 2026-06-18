-- Fix RLS recursion: make user_role() and is_coach() SECURITY DEFINER
-- so they bypass RLS when querying profiles, breaking the infinite loop.

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.user_role() = 'coach';
END;
$$;
