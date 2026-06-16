-- ============================================
-- FIX weight column overflow + Evaluation questions
-- ============================================

-- Fix weight columns: NUMERIC(3,2) -> NUMERIC(5,2) to support > 9.99
ALTER TABLE evaluations ALTER COLUMN weight TYPE NUMERIC(5,2);
ALTER TABLE exams ALTER COLUMN weight TYPE NUMERIC(5,2);

-- Drop tables from previous attempt (evaluation_tasks)
DROP TABLE IF EXISTS evaluation_task_results;
DROP TABLE IF EXISTS evaluation_tasks;
DROP TRIGGER IF EXISTS trg_sync_evaluation_result ON evaluation_task_results;
DROP FUNCTION IF EXISTS sync_evaluation_result();

-- ============================================
-- Evaluation questions junction (links evaluations to existing questions table)
-- ============================================
CREATE TABLE IF NOT EXISTS evaluation_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_num     INTEGER NOT NULL DEFAULT 0,
  points        NUMERIC(5,2) DEFAULT 1.00,
  UNIQUE(evaluation_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_questions_eval ON evaluation_questions(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_questions_question ON evaluation_questions(question_id);

ALTER TABLE evaluation_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_manage_eval_questions" ON evaluation_questions FOR ALL USING (public.is_coach());
CREATE POLICY "view_eval_questions" ON evaluation_questions FOR SELECT USING (
  public.is_coach() OR EXISTS (
    SELECT 1 FROM evaluations ev
    JOIN course_modules cm ON cm.id = ev.module_id
    JOIN courses c ON c.id = cm.course_id
    JOIN enrollments e ON e.course_id = c.id
    WHERE ev.id = evaluation_questions.evaluation_id AND e.profile_id = auth.uid()
  )
);

-- ============================================
-- Evaluation answers (student responses per question)
-- ============================================
CREATE TABLE IF NOT EXISTS evaluation_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_question_id UUID NOT NULL REFERENCES evaluation_questions(id) ON DELETE CASCADE,
  enrollment_id         UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  selected_option       UUID REFERENCES question_options(id),
  text_answer           TEXT,
  is_correct            BOOLEAN,
  score                 NUMERIC(5,2),
  graded_by             UUID REFERENCES profiles(id),
  graded_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evaluation_question_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_answers_question ON evaluation_answers(evaluation_question_id);
CREATE INDEX IF NOT EXISTS idx_eval_answers_enrollment ON evaluation_answers(enrollment_id);

ALTER TABLE evaluation_answers ENABLE ROW LEVEL SECURITY;

-- Coaches can manage all answers
CREATE POLICY "coaches_manage_eval_answers" ON evaluation_answers FOR ALL USING (public.is_coach());

-- Students can view their own answers
CREATE POLICY "view_own_eval_answers" ON evaluation_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id AND profile_id = auth.uid())
);

-- Students can insert their own answers
CREATE POLICY "own_insert_eval_answers" ON evaluation_answers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id AND profile_id = auth.uid())
  );

-- Students can update their own answers (before graded)
CREATE POLICY "own_update_eval_answers" ON evaluation_answers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM enrollments WHERE id = enrollment_id AND profile_id = auth.uid())
  ) WITH CHECK (
    score IS NULL AND graded_by IS NULL AND graded_at IS NULL
  );

-- ============================================
-- Function: sum question scores into evaluation_results
-- ============================================
CREATE OR REPLACE FUNCTION sync_eval_score()
RETURNS TRIGGER AS $$
DECLARE
  v_evaluation_id UUID;
  v_enrollment_id UUID;
  v_total_score NUMERIC(5,2);
BEGIN
  -- Get evaluation_id and enrollment_id
  SELECT eq.evaluation_id, COALESCE(NEW.enrollment_id, OLD.enrollment_id)
  INTO v_evaluation_id, v_enrollment_id
  FROM evaluation_questions eq
  WHERE eq.id = COALESCE(NEW.evaluation_question_id, OLD.evaluation_question_id);

  -- Calculate total score for this enrollment across all questions in this evaluation
  SELECT COALESCE(SUM(ea.score), 0)
  INTO v_total_score
  FROM evaluation_questions eq
  LEFT JOIN evaluation_answers ea ON ea.evaluation_question_id = eq.id AND ea.enrollment_id = v_enrollment_id
  WHERE eq.evaluation_id = v_evaluation_id;

  -- Upsert into evaluation_results (always update even if 0)
  INSERT INTO evaluation_results (evaluation_id, enrollment_id, score)
  VALUES (v_evaluation_id, v_enrollment_id, v_total_score)
  ON CONFLICT (evaluation_id, enrollment_id)
  DO UPDATE SET score = v_total_score, graded_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_eval_score
  AFTER INSERT OR UPDATE OR DELETE ON evaluation_answers
  FOR EACH ROW EXECUTE FUNCTION sync_eval_score();
