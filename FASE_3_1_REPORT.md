# Fase 3.1 — Informe de Preparación para Migración Assessments

> Auditoría completa sin modificar datos ni código.
> Fecha: 17/06/2026

---

## 1. Conteo Exacto de Registros

| Tabla | Filas | Estado |
|-------|-------|--------|
| `exams` | **0** | ✅ Vacía |
| `exam_questions` | **0** | ✅ Vacía |
| `exam_attempts` | **0** | ✅ Vacía |
| `student_answers` | **0** | ✅ Vacía |
| `evaluations` | **0** | ✅ Vacía |
| `evaluation_questions` | **0** | ✅ Vacía |
| `evaluation_results` | **0** | ✅ Vacía |
| `evaluation_answers` | **0** | ✅ Vacía |
| `questions` | **0** | ✅ Vacía (compartida) |
| `question_options` | **0** | ✅ Vacía (compartida) |

**Conclusión: No hay datos que migrar.** El riesgo de pérdida de datos es 0%.

---

## 2. Claves Foráneas e Índices (desde schema SQL)

### exams → exam_questions → exam_attempts → student_answers

```
exams.id ──┐
           ├── exam_questions.exam_id ──┐
           │                            ├── exam_attempts.exam_id
           │                            │
           │                            └── exam_attempts.enrollment_id → enrollments.id
           │
           └── exam_questions.question_id ───┐
                                             ├── student_answers.question_id
exam_attempts.id ─── student_answers.attempt_id
```

### evaluations → evaluation_questions → evaluation_results → evaluation_answers

```
evaluations.id ──┐
                 ├── evaluation_questions.evaluation_id ──┐
                 │                                        ├── evaluation_results.evaluation_id
                 │                                        │
                 │                                        └── evaluation_results.enrollment_id → enrollments.id
                 │
                 └── evaluation_questions.question_id ───┐
                                                         ├── evaluation_answers.evaluation_question_id
                                                         │
                                                         └── evaluation_answers.enrollment_id → enrollments.id
```

**Triggers:** Ninguno en estas tablas.
**Vistas:** Ninguna.
**Funciones SQL:** Ninguna dependiente de estas tablas.

---

## 3. Frontend que usa tablas evaluations (7 archivos)

| Archivo | Tablas | Operaciones | Rol | Estado |
|---------|--------|-------------|-----|--------|
| `8abf18/a116c0.ts` | `evaluations` | SELECT, INSERT, DELETE, REALTIME | Coach | **A ELIMINAR** |
| `8abf18/7528d8.ts` | `evaluations`, `evaluation_question` | INSERT | Coach | **A ELIMINAR** |
| `8abf18/1868f3.ts` | `evaluations`, `evaluation_results` | SELECT, DELETE, UPDATE | Coach | **A ELIMINAR** |
| `8abf18/c5e3f2.ts` | `evaluations`, `evaluation_results` | SELECT | Coach | **A MIGRAR** (grades page) |
| `75d37c/a116c0.ts` | `evaluations` | SELECT | Student | **A ELIMINAR** |
| `75d37c/f9e8d7.ts` | `evaluations` | SELECT | Student | **A ELIMINAR** |
| `75d37c/1868f3.ts` | `evaluations`, `evaluation_questions`, `evaluation_answers` | SELECT, INSERT | Student | **A ELIMINAR** |

**Total: 7 archivos → 6 eliminar, 1 migrar (c5e3f2.ts)**

---

## 4. Matriz de Migración

| Origen | Destino | Transformación |
|--------|---------|----------------|
| `evaluations.eval_type` | `exams.eval_type` | Columna nueva (`TEXT DEFAULT 'exam'`) |
| `evaluations.month` | `exams.month` | Columna nueva (`INT`) |
| `evaluations.is_active` | `exams.is_active` | Columna nueva (`BOOLEAN DEFAULT true`) |
| `evaluations.max_score` | `exams.max_score` | Columna nueva (`NUMERIC`). Exams usa suma de `points` por pregunta, pero tener columna adicional no daña |
| `evaluations.description` | `exams.description` | Ya existe en `exams` |
| `evaluations.weight` | `exams.weight` | Ya existe en `exams` |
| `evaluations.due_date` | `exams.due_date` | Ya existe en `exams` |
| `evaluation_questions` | `exam_questions` | Misma estructura. INSERT cambia `evaluation_id` → `exam_id` |
| `evaluation_results` | `exam_attempts` | Estructura diferente. Results tiene `score` + `enrollment_id`. Attempts tiene `attempt_num`, `status`, `started_at`. Habría que adaptar |
| `evaluation_answers` | `student_answers` | Estructura diferente. Eval answers usa `evaluation_question_id`. Student answers usa `attempt_id` + `question_id` |

---

## 5. Plan SQL Reversible (Fase 3.2)

### Paso 1: Agregar columnas a exams (SIN eliminar evaluations)

```sql
ALTER TABLE exams ADD COLUMN IF NOT EXISTS eval_type TEXT DEFAULT 'exam';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS month INT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_score NUMERIC(5,2);
```

**Reversible:** `ALTER TABLE exams DROP COLUMN IF EXISTS eval_type, month, is_active, max_score;`

### Paso 2: Políticas RLS para exams (para student/player reads)

```sql
-- Ya existen en migrations previas. Verificar:
-- "students_view_course_exams" permite SELECT en exams WHERE course_id IN cursos del alumno
```

### Reversibilidad total

Todas las operaciones SQL son `ADD COLUMN IF NOT EXISTS` — no se elimina nada. Si hay que revertir, se dropean las columnas y todo vuelve al estado anterior.

---

## 6. Plan de Frontend (Fase 3.3 → 3.4)

### Paso 1: Actualizar `a9f8d1.ts` (exams page)
Agregar campos al form: `eval_type` (select: exam/quiz/practical), `month` (number), `is_active` (toggle)

### Paso 2: Migrar `c5e3f2.ts` (grades page)
Cambiar consultas de `evaluations` a `exams` + `eval_type`

### Paso 3: Eliminar 6 archivos + rutas
```
8abf18/a116c0.ts       (coach eval list)
8abf18/7528d8.ts       (coach eval create)
8abf18/1868f3.ts       (coach eval detail)
75d37c/a116c0.ts       (student course evals)
75d37c/f9e8d7.ts       (student eval list)
75d37c/1868f3.ts       (student eval answer)
```

---

## 7. Riesgos y Decisiones

| Decisión | Opción | Recomendación |
|----------|--------|---------------|
| ¿Migrar datos? | No hay datos | ✅ No aplica |
| ¿Eliminar tablas evaluations? | No, mantener | **Mantener hasta Fase 3.5** |
| ¿Consolidar eval_results + exam_attempts? | Sí | Futuro. No urgente (0 rows) |
| ¿Consolidar eval_answers + student_answers? | Sí | Futuro. No urgente (0 rows) |
| ¿Incluir `max_score` en exams? | Sí | Útil para UI, aunque se calcule de preguntas |

---

## Resumen para decisión

```
Registros a migrar:       0
Archivos frontend a tocar: 7 (6 eliminar, 1 migrar)
Columnas SQL a agregar:   4
Riesgo de pérdida:        0%
Revertible:               Sí (ADD COLUMN IF NOT EXISTS)
```

**Conclusión:** Se puede proceder a Fase 3.2 (SQL) y Fase 3.3 (frontend dual) de forma segura.
