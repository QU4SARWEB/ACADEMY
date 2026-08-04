CREATE OR REPLACE FUNCTION public.get_public_coach_courses(p_coach_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  min_rank TEXT,
  duration_months NUMERIC,
  price NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.min_rank,
    c.duration_months::NUMERIC,
    c.price
  FROM public.course_assignments ca
  JOIN public.courses c ON c.id = ca.course_id
  WHERE ca.coach_id = p_coach_id
    AND c.is_active = true
  ORDER BY c.display_order, c.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_coach_courses(UUID) TO anon, authenticated;
