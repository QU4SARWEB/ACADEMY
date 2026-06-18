-- Backfill payments for active enrollments that don't have one
INSERT INTO payments (profile_id, enrollment_id, season_id, type, amount, status)
SELECT
  e.profile_id,
  e.id,
  e.season_id,
  COALESCE(e.type, 'student'),
  1.00,
  COALESCE(p2.scholarship_status, 'pending')
FROM enrollments e
LEFT JOIN payments p ON p.enrollment_id = e.id
LEFT JOIN LATERAL (
  SELECT CASE WHEN pr.scholarship THEN 'scholarship' ELSE 'pending' END AS scholarship_status
  FROM profiles pr WHERE pr.id = e.profile_id
) p2 ON true
WHERE p.id IS NULL AND e.status = 'active';
