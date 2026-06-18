-- Add eval_type and month columns to evaluations
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS eval_type TEXT;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS month INTEGER;

-- Add is_active column if not exists
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
