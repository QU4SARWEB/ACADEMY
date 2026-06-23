CREATE TABLE IF NOT EXISTS monthly_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  score NUMERIC(4,1) NOT NULL CHECK (score >= 0 AND score <= 20),
  letter TEXT NOT NULL CHECK (letter IN ('D', 'C', 'B', 'A', 'AD')),
  coach_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (enrollment_id, month)
);
