ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_scope TEXT NOT NULL DEFAULT 'user' CHECK (target_scope IN ('user', 'all', 'course', 'platform'));
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_platform TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#8B5CF6';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_label TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_target_course ON public.notifications(target_course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scope ON public.notifications(target_scope);

CREATE OR REPLACE FUNCTION public.send_coach_notification(
  p_title TEXT,
  p_body TEXT,
  p_scope TEXT DEFAULT 'all',
  p_course_id UUID DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_route TEXT DEFAULT '#/',
  p_action_label TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_accent_color TEXT DEFAULT '#8B5CF6'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF NOT public.is_coach() THEN
    RAISE EXCEPTION 'Only coaches can send campaign notifications';
  END IF;
  IF length(trim(coalesce(p_title, ''))) = 0 OR length(trim(coalesce(p_body, ''))) = 0 THEN
    RAISE EXCEPTION 'Title and body are required';
  END IF;
  IF p_scope NOT IN ('all', 'course', 'platform') THEN
    RAISE EXCEPTION 'Invalid notification scope';
  END IF;
  IF p_scope = 'course' AND p_course_id IS NULL THEN
    RAISE EXCEPTION 'A course is required';
  END IF;
  IF p_scope = 'platform' AND p_platform NOT IN ('pc', 'mobile') THEN
    RAISE EXCEPTION 'A valid platform is required';
  END IF;

  INSERT INTO public.notifications (
    user_id, sender_id, type, title, body, route, metadata,
    target_scope, target_course_id, target_platform, accent_color, image_url, action_label
  )
  SELECT
    p.id,
    auth.uid(),
    'announcement',
    left(trim(p_title), 140),
    left(trim(p_body), 1000),
    coalesce(nullif(p_route, ''), '#/'),
    jsonb_build_object('campaign', true),
    p_scope,
    CASE WHEN p_scope = 'course' THEN p_course_id ELSE NULL END,
    CASE WHEN p_scope = 'platform' THEN p_platform ELSE NULL END,
    CASE WHEN p_accent_color ~ '^#[0-9A-Fa-f]{6}$' THEN p_accent_color ELSE '#8B5CF6' END,
    nullif(trim(p_image_url), ''),
    nullif(trim(p_action_label), '')
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND p.is_active = true
    AND (
      p_scope = 'all'
      OR (p_scope = 'platform' AND p.platform = p_platform)
      OR (p_scope = 'course' AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.profile_id = p.id AND e.course_id = p_course_id AND e.status = 'active'
      ))
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_coach_notification(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
