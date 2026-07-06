-- Drop unused tables (features removed from frontend)
-- Ordered by dependency (child tables first)

-- Chat / tickets
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS ticket_responses CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;

-- Messages (legacy)
DROP TABLE IF EXISTS message_recipients CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Practical exams
DROP TABLE IF EXISTS practical_scores CASCADE;
DROP TABLE IF EXISTS practical_team_members CASCADE;
DROP TABLE IF EXISTS practical_teams CASCADE;
DROP TABLE IF EXISTS practical_rubrics CASCADE;
DROP TABLE IF EXISTS coach_rubric_templates CASCADE;
DROP TABLE IF EXISTS practical_exams CASCADE;

-- Legacy evaluations
DROP TABLE IF EXISTS evaluation_answers CASCADE;
DROP TABLE IF EXISTS evaluation_questions CASCADE;
DROP TABLE IF EXISTS evaluation_results CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;

-- Exams system
DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS exam_assignments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- Tasks system
DROP TABLE IF EXISTS task_submissions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Scrims
DROP TABLE IF EXISTS scrims CASCADE;

-- Promotions
DROP TABLE IF EXISTS promotions CASCADE;

-- Achievements
DROP TABLE IF EXISTS member_achievements CASCADE;

-- Course structure (unused)
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS course_modules CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;

-- Other unused
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS coach_assignments CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS promotion_requirements CASCADE;

-- Notification triggers (tables removed)
DROP FUNCTION IF EXISTS notify_task_graded CASCADE;
DROP FUNCTION IF EXISTS notify_ticket_response CASCADE;
DROP FUNCTION IF EXISTS notify_chat_message CASCADE;
DROP FUNCTION IF EXISTS notify_exam_published CASCADE;
DROP FUNCTION IF EXISTS notify_exam_graded CASCADE;

-- Legacy sync functions
DROP FUNCTION IF EXISTS sync_eval_score CASCADE;
DROP FUNCTION IF EXISTS sync_conversation_participants CASCADE;
