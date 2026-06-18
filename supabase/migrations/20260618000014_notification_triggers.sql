-- Auto-create notifications for key platform events

-- 1. Task submission graded → notify student
CREATE OR REPLACE FUNCTION notify_task_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    INSERT INTO notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'task', 'Tarea calificada', 'Tu tarea ha sido calificada.', '/students/tasks/' || NEW.task_id
    FROM enrollments e WHERE e.id = NEW.enrollment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_graded ON task_submissions;
CREATE TRIGGER trg_notify_task_graded
AFTER UPDATE ON task_submissions
FOR EACH ROW EXECUTE FUNCTION notify_task_graded();

-- 2. Ticket responded → notify ticket creator (if responder is not creator)
CREATE OR REPLACE FUNCTION notify_ticket_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (profile_id, type, title, body, link)
  SELECT t.profile_id, 'message', 'Respuesta a tu ticket', 'Tu ticket ha recibido una respuesta.', '/support/' || NEW.ticket_id
  FROM support_tickets t WHERE t.id = NEW.ticket_id AND t.profile_id != NEW.profile_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_response ON ticket_responses;
CREATE TRIGGER trg_notify_ticket_response
AFTER INSERT ON ticket_responses
FOR EACH ROW EXECUTE FUNCTION notify_ticket_response();

-- 3. New message in chat → notify other participants
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT COALESCE(display_name, full_name) INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (profile_id, type, title, body, link)
  SELECT unnest(c.participant_ids), 'message', 'Nuevo mensaje', sender_name || ' te ha enviado un mensaje.', '/chat'
  FROM conversations c WHERE c.id = NEW.conversation_id
    AND array_position(c.participant_ids, NEW.sender_id) IS NOT NULL;
  -- Delete the notification for the sender (they don't need to be notified of their own message)
  DELETE FROM notifications WHERE profile_id = NEW.sender_id AND title = 'Nuevo mensaje' AND created_at > NOW() - INTERVAL '1 second';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_message ON chat_messages;
CREATE TRIGGER trg_notify_chat_message
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION notify_chat_message();

-- 4. New exam published → notify enrolled students
CREATE OR REPLACE FUNCTION notify_exam_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    INSERT INTO notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'evaluation', 'Nuevo examen', 'Un nuevo examen ha sido publicado: ' || NEW.title, '/students/courses/' || NEW.course_id || '/exams'
    FROM enrollments e WHERE e.course_id = NEW.course_id AND e.status = 'active';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_exam_published ON exams;
CREATE TRIGGER trg_notify_exam_published
AFTER UPDATE ON exams
FOR EACH ROW EXECUTE FUNCTION notify_exam_published();

-- Also for INSERT (new exam created published)
DROP TRIGGER IF EXISTS trg_notify_exam_created ON exams;
CREATE TRIGGER trg_notify_exam_created
AFTER INSERT ON exams
FOR EACH ROW EXECUTE FUNCTION notify_exam_published();

-- 5. Exam graded → notify student
CREATE OR REPLACE FUNCTION notify_exam_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    INSERT INTO notifications (profile_id, type, title, body, link)
    SELECT e.profile_id, 'grade', 'Examen calificado', 'Tu examen ha sido calificado. Puntaje: ' || COALESCE(NEW.score::text, '-'), '/students/courses/' || ex.course_id || '/exams/' || NEW.exam_id
    FROM enrollments e JOIN exams ex ON ex.id = NEW.exam_id WHERE e.id = NEW.enrollment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_exam_graded ON exam_attempts;
CREATE TRIGGER trg_notify_exam_graded
AFTER UPDATE ON exam_attempts
FOR EACH ROW EXECUTE FUNCTION notify_exam_graded();
