-- Backfill payments for ALL enrollments (any status) that don't have one
INSERT INTO payments (profile_id, enrollment_id, type, amount, status)
SELECT
  e.profile_id,
  e.id,
  COALESCE(e.type, 'student'),
  COALESCE(c.price, 1.54),
  CASE
    WHEN c.price IS NULL OR c.price <= 0 THEN 'paid'
    WHEN pr.scholarship THEN 'scholarship'
    ELSE 'pending'
  END
FROM enrollments e
JOIN courses c ON c.id = e.course_id
LEFT JOIN profiles pr ON pr.id = e.profile_id
LEFT JOIN payments p ON p.enrollment_id = e.id
WHERE p.id IS NULL;

-- Also add unique constraint (if not already present) to prevent future duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_enrollment'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT uq_payments_enrollment UNIQUE (enrollment_id);
  END IF;
END $$;
