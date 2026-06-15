-- ============================================================
-- Migration: Add created_at to enrollments (was missing)
-- ============================================================

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
