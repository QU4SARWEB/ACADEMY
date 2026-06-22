-- ============================================================
-- Cleanup: remove chat + notifications (legacy features)
-- Drops tables, trigger functions, storage bucket
-- ============================================================

-- Drop triggers that depend on notifications table
DROP TRIGGER IF EXISTS trg_notify_exam_created ON exams;
DROP TRIGGER IF EXISTS trg_notify_exam_graded ON exam_attempts;
DROP TRIGGER IF EXISTS trg_notify_exam_published ON exams;
DROP TRIGGER IF EXISTS trg_notify_task_graded ON task_submissions;
DROP TRIGGER IF EXISTS trg_notify_ticket_response ON ticket_responses;

-- Drop trigger functions
DROP FUNCTION IF EXISTS notify_exam_created CASCADE;
DROP FUNCTION IF EXISTS notify_exam_graded CASCADE;
DROP FUNCTION IF EXISTS notify_exam_published CASCADE;
DROP FUNCTION IF EXISTS notify_task_graded CASCADE;
DROP FUNCTION IF EXISTS notify_ticket_response CASCADE;

-- Drop chat tables
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Drop notifications table
DROP TABLE IF EXISTS notifications CASCADE;

-- Drop legacy internal mail (unused in code)
DROP TABLE IF EXISTS message_recipients CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Note: storage bucket 'chat' not removed via SQL (Supabase blocks direct storage DELETE).
-- Remove manually if desired: Storage → Buckets → chat → Delete
