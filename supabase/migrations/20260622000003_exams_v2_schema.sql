-- Exams V2: Schema additions
-- Adds categories support to questions table + reviews table

ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Reviews table for exam grading queue
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed')),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Coaches can read all reviews" ON reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can insert reviews" ON reviews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can update reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can delete reviews" ON reviews
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
