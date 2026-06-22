ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status = ANY (ARRAY['free'::text, 'pending'::text, 'paid'::text, 'scholarship'::text, 'expired'::text]));
