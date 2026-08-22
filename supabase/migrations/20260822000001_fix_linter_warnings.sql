-- FIX: Database Linter Security Warnings
-- 1. Fix search_path on 8 mutable functions
-- 2. Revoke anon EXECUTE on internal trigger functions
-- 3. Fix course_assignments RLS (always-true policy)

-- ================================================
-- 1. Fix search_path on mutable functions
-- ================================================

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'task', 'Tarea calificada', 'Tu tarea ha sido calificada.', '/students/tasks/' || NEW.task_id
    FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (profile_id, type, title, body, link)
  SELECT t.profile_id, 'message', 'Respuesta a tu ticket', 'Tu ticket ha recibido una respuesta.', '/support/' || NEW.ticket_id
  FROM public.support_tickets t WHERE t.id = NEW.ticket_id AND t.profile_id != NEW.profile_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT COALESCE(display_name, full_name) INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (profile_id, type, title, body, link)
  SELECT unnest(c.participant_ids), 'message', 'Nuevo mensaje', sender_name || ' te ha enviado un mensaje.', '/chat'
  FROM public.conversations c WHERE c.id = NEW.conversation_id
    AND array_position(c.participant_ids, NEW.sender_id) IS NOT NULL;
  DELETE FROM public.notifications WHERE profile_id = NEW.sender_id AND title = 'Nuevo mensaje' AND created_at > NOW() - INTERVAL '1 second';
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_exam_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'evaluation', 'Nuevo examen', 'Un nuevo examen ha sido publicado: ' || NEW.title, '/students/courses/' || NEW.course_id || '/exams'
    FROM public.enrollments e WHERE e.course_id = NEW.course_id AND e.status = 'active';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_exam_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    INSERT INTO public.notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'grade', 'Examen calificado', 'Tu examen ha sido calificado. Puntaje: ' || COALESCE(NEW.score::text, '-'), '/students/courses/' || ex.course_id || '/exams/' || NEW.exam_id
    FROM public.enrollments e JOIN public.exams ex ON ex.id = NEW.exam_id WHERE e.id = NEW.enrollment_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.conversations SET participant_ids = ARRAY(
      SELECT profile_id FROM public.conversation_participants WHERE conversation_id = NEW.conversation_id
    ) WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.conversations SET participant_ids = ARRAY(
      SELECT profile_id FROM public.conversation_participants WHERE conversation_id = OLD.conversation_id
    ) WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_eval_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evaluation_id UUID;
  v_enrollment_id UUID;
  v_total_score NUMERIC(5,2);
BEGIN
  SELECT eq.evaluation_id, COALESCE(NEW.enrollment_id, OLD.enrollment_id)
  INTO v_evaluation_id, v_enrollment_id
  FROM public.evaluation_questions eq
  WHERE eq.id = COALESCE(NEW.evaluation_question_id, OLD.evaluation_question_id);

  SELECT COALESCE(SUM(ea.score), 0)
  INTO v_total_score
  FROM public.evaluation_questions eq
  LEFT JOIN public.evaluation_answers ea ON ea.evaluation_question_id = eq.id AND ea.enrollment_id = v_enrollment_id
  WHERE eq.evaluation_id = v_evaluation_id;

  INSERT INTO public.evaluation_results (evaluation_id, enrollment_id, score)
  VALUES (v_evaluation_id, v_enrollment_id, v_total_score)
  ON CONFLICT (evaluation_id, enrollment_id)
  DO UPDATE SET score = v_total_score, graded_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ================================================
-- 2. Revoke anon EXECUTE on internal trigger functions
-- ================================================
REVOKE EXECUTE ON FUNCTION public.notify_task_graded() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_response() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_chat_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_exam_published() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_exam_graded() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_conversation_participants() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_eval_score() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_set_updated_at() FROM anon, authenticated;

-- ================================================
-- 3. Fix course_assignments RLS (always-true policy)
-- ================================================
DROP POLICY IF EXISTS coaches_manage_assignments ON public.course_assignments;

CREATE POLICY admin_manage_assignments ON public.course_assignments
  FOR ALL
  USING (public.user_role() = 'admin');

CREATE POLICY coaches_read_assignments ON public.course_assignments
  FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY coaches_insert_assignments ON public.course_assignments
  FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY coaches_delete_assignments ON public.course_assignments
  FOR DELETE
  USING (coach_id = auth.uid());
