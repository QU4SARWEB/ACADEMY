ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);
