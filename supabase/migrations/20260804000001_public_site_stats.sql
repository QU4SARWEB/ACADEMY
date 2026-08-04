CREATE TABLE IF NOT EXISTS public.site_stats (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  total_visits BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_stats (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_site_stats()
RETURNS TABLE (visits BIGINT, students BIGINT, registrations BIGINT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE(s.total_visits, 0)::BIGINT,
    COUNT(*) FILTER (WHERE p.role IN ('student', 'player'))::BIGINT,
    COUNT(p.id)::BIGINT
  FROM public.site_stats s
  LEFT JOIN public.profiles p ON true
  WHERE s.id = true
  GROUP BY s.total_visits;
$$;

CREATE OR REPLACE FUNCTION public.register_public_site_visit()
RETURNS TABLE (visits BIGINT, students BIGINT, registrations BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.site_stats
  SET total_visits = total_visits + 1,
      updated_at = now()
  WHERE id = true;

  RETURN QUERY SELECT * FROM public.get_public_site_stats();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_site_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_public_site_visit() TO anon, authenticated;
