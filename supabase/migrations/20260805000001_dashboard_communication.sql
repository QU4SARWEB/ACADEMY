CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'direct' CHECK (kind IN ('direct', 'course', 'team')),
  title TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile ON public.conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON public.chat_messages(conversation_id, created_at);

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND profile_id = p_profile_id
  );
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_select_members ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_owner ON public.conversations;
DROP POLICY IF EXISTS conversations_update_owner ON public.conversations;
CREATE POLICY conversations_select_members ON public.conversations
  FOR SELECT USING (created_by = auth.uid() OR public.is_conversation_member(id, auth.uid()));
CREATE POLICY conversations_insert_owner ON public.conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY conversations_update_owner ON public.conversations
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS conversation_participants_select_members ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_insert_authorized ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_update_self ON public.conversation_participants;
CREATE POLICY conversation_participants_select_members ON public.conversation_participants
  FOR SELECT USING (
    profile_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid())
  );
CREATE POLICY conversation_participants_insert_authorized ON public.conversation_participants
  FOR INSERT WITH CHECK (
    profile_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );
CREATE POLICY conversation_participants_update_self ON public.conversation_participants
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS chat_messages_select_members ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_members ON public.chat_messages;
CREATE POLICY chat_messages_select_members ON public.chat_messages
  FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY chat_messages_insert_members ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '#/',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, route, metadata)
  SELECT e.profile_id, 'task', 'Nueva tarea', NEW.title, '#/students/tasks', jsonb_build_object('task_id', NEW.id)
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id AND e.status = 'active';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_task_created ON public.course_tasks;
CREATE TRIGGER trigger_notify_task_created
AFTER INSERT ON public.course_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_created();

CREATE OR REPLACE FUNCTION public.notify_schedule_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, route, metadata)
  SELECT e.profile_id, 'schedule', 'Nuevo horario', COALESCE(NEW.title, 'Hay una nueva clase en tu horario.'), '#/students/schedule', jsonb_build_object('schedule_id', NEW.id)
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id AND e.status = 'active';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_schedule_created ON public.schedules;
CREATE TRIGGER trigger_notify_schedule_created
AFTER INSERT ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.notify_schedule_created();

CREATE OR REPLACE FUNCTION public.notify_payment_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, route, metadata)
    VALUES (NEW.profile_id, 'payment', 'Actualización de pago', 'Tu estado de pago cambió a ' || NEW.status || '.', '#/payments', jsonb_build_object('payment_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_payment_status_changed ON public.payments;
CREATE TRIGGER trigger_notify_payment_status_changed
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_status_changed();

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, route, metadata)
  SELECT cp.profile_id, 'message', 'Nuevo mensaje', left(NEW.content, 120), '#/chat', jsonb_build_object('conversation_id', NEW.conversation_id)
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.profile_id <> NEW.sender_id;
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END
$$;
