CREATE TABLE IF NOT EXISTS public.call_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  room_name TEXT NOT NULL UNIQUE DEFAULT ('qu4sar-' || replace(gen_random_uuid()::text, '-', '')),
  schedule_type TEXT NOT NULL DEFAULT 'custom' CHECK (schedule_type IN ('custom', 'weekly')),
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 480),
  meet_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, starts_at),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.call_room_participants (
  room_id UUID NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_call_rooms_created_by ON public.call_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_call_rooms_course ON public.call_rooms(course_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_room_start ON public.call_sessions(room_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_call_sessions_start ON public.call_sessions(starts_at);
CREATE INDEX IF NOT EXISTS idx_call_participants_profile ON public.call_room_participants(profile_id);

CREATE OR REPLACE FUNCTION public.can_view_call_room(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.call_rooms r
    WHERE r.id = p_room_id
      AND (
        r.created_by = auth.uid()
        OR public.is_coach()
        OR EXISTS (
          SELECT 1
          FROM public.call_room_participants p
          WHERE p.room_id = r.id AND p.profile_id = auth.uid() AND p.status <> 'declined'
        )
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE r.course_id IS NOT NULL
            AND e.course_id = r.course_id
            AND e.profile_id = auth.uid()
            AND e.status = 'active'
        )
      )
  );
$$;

ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_room_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_rooms_select_visible ON public.call_rooms;
CREATE POLICY call_rooms_select_visible ON public.call_rooms
  FOR SELECT USING (public.can_view_call_room(id));

DROP POLICY IF EXISTS call_rooms_insert_coaches ON public.call_rooms;
CREATE POLICY call_rooms_insert_coaches ON public.call_rooms
  FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_coach());

DROP POLICY IF EXISTS call_rooms_update_hosts ON public.call_rooms;
CREATE POLICY call_rooms_update_hosts ON public.call_rooms
  FOR UPDATE USING (created_by = auth.uid() OR public.is_coach())
  WITH CHECK (created_by = auth.uid() OR public.is_coach());

DROP POLICY IF EXISTS call_rooms_delete_hosts ON public.call_rooms;
CREATE POLICY call_rooms_delete_hosts ON public.call_rooms
  FOR DELETE USING (created_by = auth.uid() OR public.is_coach());

DROP POLICY IF EXISTS call_sessions_select_visible ON public.call_sessions;
CREATE POLICY call_sessions_select_visible ON public.call_sessions
  FOR SELECT USING (public.can_view_call_room(room_id));

DROP POLICY IF EXISTS call_sessions_manage_coaches ON public.call_sessions;
CREATE POLICY call_sessions_manage_coaches ON public.call_sessions
  FOR ALL USING (created_by = auth.uid() OR public.is_coach())
  WITH CHECK (created_by = auth.uid() OR public.is_coach());

DROP POLICY IF EXISTS call_participants_select_visible ON public.call_room_participants;
CREATE POLICY call_participants_select_visible ON public.call_room_participants
  FOR SELECT USING (public.can_view_call_room(room_id));

DROP POLICY IF EXISTS call_participants_manage_hosts ON public.call_room_participants;
CREATE POLICY call_participants_manage_hosts ON public.call_room_participants
  FOR INSERT WITH CHECK (
    public.is_coach()
    OR EXISTS (SELECT 1 FROM public.call_rooms r WHERE r.id = room_id AND r.created_by = auth.uid())
  );

DROP POLICY IF EXISTS call_participants_update_self ON public.call_room_participants;
CREATE POLICY call_participants_update_self ON public.call_room_participants
  FOR UPDATE USING (profile_id = auth.uid() OR public.is_coach())
  WITH CHECK (profile_id = auth.uid() OR public.is_coach());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_room_participants TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_call_session_created()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  room_row public.call_rooms%ROWTYPE;
BEGIN
  SELECT * INTO room_row FROM public.call_rooms WHERE id = NEW.room_id;

  INSERT INTO public.notifications (user_id, type, title, body, route, metadata)
  SELECT DISTINCT recipients.profile_id,
    'call',
    'Nueva llamada agendada',
    room_row.title || ' · ' || to_char(NEW.starts_at AT TIME ZONE room_row.timezone, 'DD/MM/YYYY HH24:MI'),
    '#/calls?room=' || room_row.id,
    jsonb_build_object('room_id', room_row.id, 'session_id', NEW.id)
  FROM (
    SELECT p.profile_id
    FROM public.call_room_participants p
    WHERE p.room_id = room_row.id AND p.profile_id <> NEW.created_by
    UNION
    SELECT e.profile_id
    FROM public.enrollments e
    WHERE room_row.course_id IS NOT NULL
      AND e.course_id = room_row.course_id
      AND e.status = 'active'
      AND e.profile_id <> NEW.created_by
  ) recipients;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_call_session_created ON public.call_sessions;
CREATE TRIGGER trigger_notify_call_session_created
AFTER INSERT ON public.call_sessions
FOR EACH ROW EXECUTE FUNCTION public.notify_call_session_created();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_room_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_room_participants;
  END IF;
END
$$;
