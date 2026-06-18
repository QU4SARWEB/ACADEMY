-- Fase 3.5: Eliminar tablas legacy de evaluations
-- Verificado: 0 referencias frontend, 0 registros
-- Dependencias internas eliminadas via CASCADE

DROP TABLE IF EXISTS evaluation_answers CASCADE;
DROP TABLE IF EXISTS evaluation_results CASCADE;
DROP TABLE IF EXISTS evaluation_questions CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
