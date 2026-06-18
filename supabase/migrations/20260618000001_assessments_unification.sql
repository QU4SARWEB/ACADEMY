-- Fase 3.2: Unificar Assessments (evaluations → exams)
-- Agrega columnas a exams para soportar funcionalidad de evaluations legacy
-- Reversible: todas usan IF NOT EXISTS

ALTER TABLE exams ADD COLUMN IF NOT EXISTS eval_type TEXT DEFAULT 'exam';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_score NUMERIC(5,2);

-- Verificar esquema
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'exams'
-- ORDER BY ordinal_position;
