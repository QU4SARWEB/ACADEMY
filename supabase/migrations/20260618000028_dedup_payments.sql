-- Remove duplicate payments keeping the oldest one
DELETE FROM payments p1 USING payments p2
WHERE p1.id > p2.id AND p1.enrollment_id IS NOT NULL AND p1.enrollment_id = p2.enrollment_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE payments ADD CONSTRAINT uq_payments_enrollment UNIQUE (enrollment_id);
