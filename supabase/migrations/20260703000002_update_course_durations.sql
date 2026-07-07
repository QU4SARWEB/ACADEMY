ALTER TABLE courses ALTER COLUMN duration_months TYPE NUMERIC(4,1) USING duration_months::NUMERIC(4,1);

UPDATE courses SET duration_months = 0.5 WHERE slug IN ('rookie', 'trainee', 'amateur', 'competitor', 'elite');
UPDATE courses SET duration_months = 2 WHERE slug IN ('semi-pro', 'pro');
