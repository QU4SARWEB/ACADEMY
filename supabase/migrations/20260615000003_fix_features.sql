-- ============================================
-- FIX FEATURES: Teams, Messages, Storage, Exams, Payments
-- ============================================

-- ============================================
-- PART 1: Teams fix — add status column to team_members
-- ============================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================
-- PART 2: Messages fix — allow senders to see recipients
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_recipients' AND policyname = 'senders_view_recipients') THEN
    CREATE POLICY "senders_view_recipients" ON message_recipients FOR SELECT USING (
      EXISTS (SELECT 1 FROM messages WHERE messages.id = message_id AND messages.sender_id = auth.uid())
    );
  END IF;
END $$;

-- ============================================
-- PART 3: Storage buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('uploads', 'uploads', true, 52428800, ARRAY['image/*','video/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','application/x-rar-compressed','audio/*','text/plain'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Extend storage policies to include new buckets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Read Storage') THEN
    CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'banners', 'attachments', 'uploads', 'receipts'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Upload Storage') THEN
    CREATE POLICY "Auth Upload Storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'banners', 'attachments', 'uploads', 'receipts') AND (auth.role() = 'authenticated'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Update Storage') THEN
    CREATE POLICY "Auth Update Storage" ON storage.objects FOR UPDATE USING (bucket_id IN ('avatars', 'banners', 'attachments', 'uploads', 'receipts') AND (auth.role() = 'authenticated'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth Delete Storage') THEN
    CREATE POLICY "Auth Delete Storage" ON storage.objects FOR DELETE USING (bucket_id IN ('avatars', 'banners', 'attachments', 'uploads', 'receipts') AND (auth.role() = 'authenticated'));
  END IF;
END $$;

-- ============================================
-- PART 4: Payments — add receipt_url column
-- ============================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ============================================
-- PART 5: Exam system — 6 new tables
-- ============================================

-- Question type enum
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'open_ended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type          question_type NOT NULL DEFAULT 'multiple_choice',
  stem          TEXT NOT NULL,
  explanation   TEXT,
  difficulty    INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  points        NUMERIC(5,2) DEFAULT 1.00,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id);

-- Question options (for multiple_choice and true_false)
CREATE TABLE IF NOT EXISTS question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false,
  order_num   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id     UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  passing_score NUMERIC(5,2) DEFAULT 60,
  time_limit    INTEGER,
  shuffle       BOOLEAN DEFAULT false,
  max_attempts  INTEGER DEFAULT 1,
  weight        NUMERIC(3,2) DEFAULT 0,
  is_published  BOOLEAN DEFAULT false,
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_module ON exams(module_id);

-- Exam-Questions junction
CREATE TABLE IF NOT EXISTS exam_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_num   INTEGER NOT NULL DEFAULT 0,
  points      NUMERIC(5,2) DEFAULT 1.00,
  UNIQUE(exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);

-- Exam attempts by students
CREATE TABLE IF NOT EXISTS exam_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  attempt_num   INTEGER NOT NULL DEFAULT 1,
  score         NUMERIC(5,2),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  submitted_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'submitted', 'graded')),
  UNIQUE(exam_id, enrollment_id, attempt_num)
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_enrollment ON exam_attempts(enrollment_id);

-- Student answers per attempt
CREATE TABLE IF NOT EXISTS student_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option UUID REFERENCES question_options(id),
  text_answer     TEXT,
  is_correct      BOOLEAN,
  score           NUMERIC(5,2),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON student_answers(attempt_id);

-- ============================================
-- RLS for exam tables
-- ============================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Questions: coaches manage, all can view
CREATE POLICY "coaches_manage_questions" ON questions FOR ALL USING (public.is_coach());
CREATE POLICY "view_questions" ON questions FOR SELECT USING (true);

-- Question options: coaches manage, all can view
CREATE POLICY "coaches_manage_question_options" ON question_options FOR ALL USING (public.is_coach());
CREATE POLICY "view_question_options" ON question_options FOR SELECT USING (true);

-- Exams: coaches manage, students/players can view published
CREATE POLICY "coaches_manage_exams" ON exams FOR ALL USING (public.is_coach());
CREATE POLICY "view_published_exams" ON exams FOR SELECT USING (is_published = true OR public.is_coach());

-- Exam questions junction: coaches manage, others can view
CREATE POLICY "coaches_manage_exam_questions" ON exam_questions FOR ALL USING (public.is_coach());
CREATE POLICY "view_exam_questions" ON exam_questions FOR SELECT USING (true);

-- Exam attempts: own attempts visible to student, all attempts visible to coach
CREATE POLICY "coaches_manage_attempts" ON exam_attempts FOR ALL USING (public.is_coach());
CREATE POLICY "view_own_attempts" ON exam_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE enrollments.id = enrollment_id AND enrollments.profile_id = auth.uid())
);

-- Student answers: own answers visible, coaches see all
CREATE POLICY "coaches_manage_answers" ON student_answers FOR ALL USING (public.is_coach());
CREATE POLICY "view_own_answers" ON student_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM exam_attempts ea JOIN enrollments e ON e.id = ea.enrollment_id
          WHERE ea.id = attempt_id AND e.profile_id = auth.uid())
);

-- ============================================
-- Triggers for updated_at on new tables
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_questions_updated_at') THEN
    CREATE TRIGGER set_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exams_updated_at') THEN
    CREATE TRIGGER set_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;

-- Fix banners bucket to accept GIF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'banners';

-- Student self-enrollment policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_self_enroll' AND tablename = 'enrollments') THEN
    CREATE POLICY "students_self_enroll" ON enrollments
      FOR INSERT WITH CHECK (auth.uid() = profile_id AND user_role() IN ('student', 'player'));
  END IF;
END $$;

-- Student exam attempts INSERT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_insert_attempts' AND tablename = 'exam_attempts') THEN
    CREATE POLICY "own_insert_attempts" ON exam_attempts
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id AND profile_id = auth.uid()));
  END IF;
END $$;

-- Student exam attempts UPDATE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_update_attempts' AND tablename = 'exam_attempts') THEN
    CREATE POLICY "own_update_attempts" ON exam_attempts
      FOR UPDATE USING (EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id AND profile_id = auth.uid()));
  END IF;
END $$;

-- Student answers INSERT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_insert_answers' AND tablename = 'student_answers') THEN
    CREATE POLICY "own_insert_answers" ON student_answers
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM exam_attempts ea JOIN enrollments e ON e.id = ea.enrollment_id WHERE ea.id = attempt_id AND e.profile_id = auth.uid()));
  END IF;
END $$;

-- Student payments UPDATE (receipt_url)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_update_payments' AND tablename = 'payments') THEN
    CREATE POLICY "own_update_payments" ON payments
      FOR UPDATE USING (profile_id = auth.uid());
  END IF;
END $$;

-- DELETE own message_recipients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_delete_recipients' AND tablename = 'message_recipients') THEN
    CREATE POLICY "own_delete_recipients" ON message_recipients
      FOR DELETE USING (recipient_id = auth.uid());
  END IF;
END $$;

-- Restrict notifications to own profile or coach
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_notifications' AND tablename = 'notifications') THEN
    DROP POLICY "insert_notifications" ON notifications;
  END IF;
  CREATE POLICY "insert_notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = profile_id OR is_coach());
END $$;

-- Replace permissive storage policies with owner-isolated ones
DROP POLICY IF EXISTS "Auth Upload Storage" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Storage" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Storage" ON storage.objects;
DROP POLICY IF EXISTS "Avatar all" ON storage.objects;
DROP POLICY IF EXISTS "Avatar select" ON storage.objects;

-- Owner-only INSERT/UPDATE/DELETE for avatars and banners
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_avatars_banners_manage' AND tablename = 'objects') THEN
    CREATE POLICY "own_avatars_banners_manage" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatars_banners_manage_update" ON storage.objects
      FOR UPDATE USING (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_avatars_banners_manage_delete" ON storage.objects
      FOR DELETE USING (bucket_id IN ('avatars','banners') AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Owner-only INSERT/UPDATE/DELETE for receipts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'own_receipts_manage' AND tablename = 'objects') THEN
    CREATE POLICY "own_receipts_manage" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_receipts_manage_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
    CREATE POLICY "own_receipts_manage_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Coaches can manage uploads and attachments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_uploads_manage' AND tablename = 'objects') THEN
    CREATE POLICY "coaches_uploads_manage" ON storage.objects
      FOR ALL USING (bucket_id IN ('uploads','attachments') AND is_coach());
  END IF;
END $$;
