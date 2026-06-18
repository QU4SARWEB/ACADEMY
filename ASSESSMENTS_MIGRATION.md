# Fase 3.0 — Diseño de Assessments Unificados

> Documento de migración: unificar Evaluations → Exams
> Estado: Diseño — sin ejecutar

---

## 1. Inventario de tablas actuales

### exams (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `course_id` | UUID FK → courses | |
| `module_id` | UUID FK → course_modules | nullable |
| `title` | TEXT | |
| `description` | TEXT | nullable |
| `passing_score` | NUMERIC | default 60 |
| `time_limit` | INT (minutos) | nullable, 0 = sin límite |
| `max_attempts` | INT | default 1 |
| `weight` | NUMERIC | porcentaje |
| `due_date` | TIMESTAMPTZ | nullable |
| `is_published` | BOOLEAN | default false |
| `shuffle` | BOOLEAN | default false |
| `created_at` | TIMESTAMPTZ | |

### exam_questions (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `exam_id` | UUID FK → exams | |
| `question_id` | UUID FK → questions | |
| `order_num` | INT | |
| `points` | NUMERIC | |

### exam_attempts (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `exam_id` | UUID FK → exams | |
| `enrollment_id` | UUID FK → enrollments | |
| `attempt_num` | INT | |
| `status` | TEXT | 'in_progress' / 'submitted' / 'graded' |
| `started_at` | TIMESTAMPTZ | |
| `submitted_at` | TIMESTAMPTZ | nullable |
| `score` | NUMERIC | nullable |
| `created_at` | TIMESTAMPTZ | |

### student_answers (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `attempt_id` | UUID FK → exam_attempts | |
| `question_id` | UUID FK → questions | |
| `selected_option` | UUID FK → question_options | nullable |
| `text_answer` | TEXT | nullable |
| `is_correct` | BOOLEAN | nullable |
| `score` | NUMERIC | nullable |

### evaluations (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `module_id` | UUID FK → course_modules | |
| `title` | TEXT | |
| `description` | TEXT | nullable |
| `max_score` | NUMERIC | default 100 |
| `weight` | NUMERIC | default 100 |
| `due_date` | DATE | nullable |
| `eval_type` | TEXT | 'exam' / 'quiz' / 'practical' |
| `month` | INT | nullable |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMPTZ | |

### evaluation_questions (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `evaluation_id` | UUID FK → evaluations | |
| `question_id` | UUID FK → questions | |
| `order_num` | INT | nullable |
| `created_at` | TIMESTAMPTZ | |

### evaluation_results (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `evaluation_id` | UUID FK → evaluations | |
| `enrollment_id` | UUID FK → enrollments | |
| `score` | NUMERIC | nullable |
| `created_at` | TIMESTAMPTZ | |

### evaluation_answers (0 rows)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `evaluation_question_id` | UUID FK → evaluation_questions | |
| `enrollment_id` | UUID FK → enrollments | |
| `selected_option` | UUID FK → question_options | nullable |
| `text_answer` | TEXT | nullable |
| `score` | NUMERIC | nullable |
| `created_at` | TIMESTAMPTZ | |

### questions (0 rows) — compartida
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `course_id` | UUID FK → courses | nullable |
| `type` | TEXT | 'multiple_choice' / 'true_false' / 'open_ended' / 'short_answer' |
| `stem` | TEXT | enunciado |
| `text` | TEXT | legacy — misma función que `stem` |
| `points` | NUMERIC | default 1 |
| `difficulty` | TEXT | 'easy' / 'medium' / 'hard' |
| `explanation` | TEXT | nullable |
| `duration_minutes` | INT | nullable |
| `category` | TEXT | nullable |
| `is_active` | BOOLEAN | default true |
| `created_at` | TIMESTAMPTZ | |

### question_options (0 rows) — compartida
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `question_id` | UUID FK → questions | |
| `text` | TEXT | |
| `is_correct` | BOOLEAN | |
| `order_num` | INT | |

---

## 2. Features por entidad

| Feature | Exams | Evaluations | Unificado |
|---------|-------|-------------|-----------|
| Título + descripción | ✅ | ✅ | ✅ |
| Asociado a módulo | ✅ (module_id) | ✅ (module_id) | ✅ |
| Asociado a curso | ✅ (course_id) | ❌ (solo módulo) | ✅ (course_id) |
| Puntaje máximo | ❌ (usa points de preguntas) | ✅ (max_score) | ✅ (calculado de preguntas) |
| Nota mínima/passing | ✅ (passing_score) | ❌ | ✅ |
| Tiempo límite | ✅ | ❌ | ✅ |
| Intentos máximos | ✅ | ❌ | ✅ |
| Shuffle | ✅ | ❌ | ✅ |
| Published/draft | ✅ | ❌ | ✅ |
| Auto-grading MC/TF | ✅ | ❌ | ✅ |
| Manual grading open | ❌ (no implementado) | ✅ (coach asigna score) | ✅ |
| eval_type | ❌ | ✅ (exam/quiz/practical) | ✅ |
| Month tracking | ❌ | ✅ | ✅ |
| is_active | ❌ | ✅ | ✅ |
| Preguntas con opciones | ✅ | ✅ | ✅ |
| Banco de preguntas | ✅ | ✅ | ✅ |
| Orden de preguntas | ✅ (order_num) | ✅ (order_num) | ✅ |
| Attempt tracking | ✅ | ❌ | ✅ |
| Vista resultados alumno | ✅ | ✅ | ✅ |
| Vista grading coach | ❌ | ✅ | ✅ |

---

## 3. Estrategia de migración

### Paso 1: No eliminar tablas legacy

Las tablas actuales (`exams`, `evaluations`, etc.) **se mantienen intactas**. No se elimina nada.

### Paso 2: Actualizar tabla `exams` con campos faltantes

```sql
ALTER TABLE exams ADD COLUMN IF NOT EXISTS eval_type TEXT DEFAULT 'exam';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS month INT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### Paso 3: No hay datos que migrar

Actualmente **0 registros** en todas las tablas. No hay data que perder.

### Paso 4: Unificar frontend

1. Modificar `a9f8d1.ts` (coach exams):
   - Agregar campo `eval_type` (exam/quiz/practical)
   - Agregar campo `month` (mes de evaluación)
   - Agregar toggle `is_active`
   - Soporte para manual grading en open-ended questions

2. Modificar `e1760f.ts` (student exam list):
   - Mostrar todos los assessments (incluyendo los que antes eran evaluations)
   - Filtro por tipo (exam/quiz/practical)

3. Modificar `916e16.ts` (student exam take):
   - Soporte para preguntas open-ended con manual grading
   - Mostrar feedback del coach después de graded

4. Eliminar archivos legacy de evaluations (6 archivos)

### Paso 5: Student views consolidadas

| Ruta actual | Reemplazo |
|-------------|-----------|
| `/students/evaluations` | `students/exams/global` (filtro por type) |
| `/students/evaluations/:id` | Eliminar, redirect a exam detail |
| `/students/courses/:id/evaluations` | Eliminar, redirect a exam list del curso |

---

## 4. Orden de ejecución (Fase 3.x)

```
Fase 3.0  ✅ Diseño (este documento)
Fase 3.1  SQL: agregar columnas a exams (eval_type, month, is_active)
Fase 3.2  Frontend: actualizar a9f8d1.ts con nuevos campos + manual grading
Fase 3.3  Frontend: actualizar e1760f.ts, 916e16.ts para unified assessments
Fase 3.4  Eliminar archivos evaluations legacy (6 archivos + rutas)
Fase 3.5  Pruebas: crear exam tipo quiz/practical, tomar, calificar
```

---

## 5. Archivos legacy a eliminar (después de migración)

| Archivo | Dependencia |
|---------|-------------|
| `8abf18/a116c0.ts` | Coach eval list → solo `fad58d.ts:23` |
| `8abf18/7528d8.ts` | Coach eval create → solo `fad58d.ts:42` |
| `8abf18/1868f3.ts` | Coach eval detail → solo `fad58d.ts:43` |
| `75d37c/1868f3.ts` | Student eval answer → solo `fad58d.ts:57` |
| `75d37c/f9e8d7.ts` | Student eval list → solo `fad58d.ts:56` |
| `75d37c/a116c0.ts` | Student course evals → solo `fad58d.ts:54` |

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos | 0 registros actualmente. No hay datos que perder |
| Tabla `evaluation_question` no existe | El código student usa `evaluation_questions` (plural). La tabla correcta es la plural |
| Preguntas sin `course_id` | Las evaluations legacy no guardan course_id. Se puede derivar del module → course |
| `questions.text` vs `questions.stem` | Migrar datos de `text` a `stem` si existen. Unificar frontend a solo `stem` |
| Permisos RLS | Verificar RLS en `exams` para student/player reads |
