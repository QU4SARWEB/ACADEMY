# PLAN: Nuevo sistema de notas sobre 20

## Resumen
Eliminar asistencias, reemplazar sistema de notas por notas mensuales (sobre 20). Exámenes y tareas se quedan pero con ponderación baja. Todo normalizado a escala 0-20 con letras AD/A/B/C/D.

---

## 1. Eliminar

### Archivos de asistencia
| Archivo | Motivo |
|---------|--------|
| `src/b3b32a/8abf18/64c62c.ts` | Página de asistencia por curso |
| `src/b3b32a/8abf18/g7h8i9.ts` | Vista general de asistencias |
| `src/b3b32a/8abf18/attendance_utils.ts` | Utilidades de asistencia |

### Código muerto
| Archivo | Motivo |
|---------|--------|
| `src/b3b32a/9e81e7/2165e4.ts` | Visor de audit logs (sin ruta, sin imports) |
| `src/b3b32a/8abf18/ea6aeb.ts` | Historial de promociones (sin ruta, sin imports) |

### Rutas (fad58d.ts)
- Eliminar imports de `64c62c.ts`, `g7h8i9.ts`, `attendance_utils.ts`
- Eliminar routes:
  - `/coaches/courses/:id/attendance`
  - `/coaches/attendance`

### Sidebar (dc7161.ts)
- Quitar `item('/coaches/attendance', ...)` del menú coach

### Course detail
- `src/b3b32a/8abf18/ec35bd.ts` — quitar link a `/attendance`
- `src/b3b32a/75d37c/ec35bd.ts` — quitar link a `attendance` (si existe)

---

## 2. DB: Nueva tabla

```sql
CREATE TABLE monthly_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- 'YYYY-MM'
  score NUMERIC(4,1) NOT NULL CHECK (score >= 0 AND score <= 20),
  letter TEXT NOT NULL, -- 'D','C','B','A','AD'
  coach_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (enrollment_id, month)
);
```

### Migration: Cleanup attendance
```sql
DROP TABLE IF EXISTS attendance CASCADE;
```

---

## 3. Escala de notas

| Rango | Letra | Significado |
|-------|-------|-------------|
| 18.0 – 20.0 | AD | Excelente |
| 14.0 – 17.9 | A | Bueno |
| 11.0 – 13.9 | B | Satisfactorio |
| 5.0 – 10.9 | C | Suficiente |
| 0 – 4.9 | D | Deficiente |

---

## 4. Cálculo de nota final (todo sobre 20)

### Componentes y pesos
| Componente | Peso | Normalización |
|------------|------|---------------|
| Monthly grades (promedio) | **60%** | Directo 0-20 |
| Exámenes (promedio) | **20%** | `score / 5` (de 0-100 a 0-20) |
| Tareas (promedio) | **20%** | `(submission.score / task.max_score) × 20` |

### Fórmula
```
nota_en_20 = (monthly_avg × 0.6) + (exam_avg × 0.2) + (task_avg × 0.2)
final_grade = nota_en_20 × 5   (para mantener 0-100 en la DB)
```

### Ejemplo
- Monthly: 15 → 15 × 0.6 = 9.0
- Exámenes: 70% → 70/5 = 14 → 14 × 0.2 = 2.8
- Tareas (score/max × 20): 16 → 16 × 0.2 = 3.2
- Total: 9.0 + 2.8 + 3.2 = **15.0 / 20** → letra **B**
- `final_grade` = 15 × 5 = **75%**

### Cuándo se recalcula
- Cuando el coach guarda notas mensuales
- Cuando se califica una tarea
- Cuando se completa un examen
- Llamando `recalcFinalGrade(enrollmentId)`

---

## 5. Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `src/b3b32a/8abf18/grade_utils.ts` | Reemplazar `recalcFinalGrade`: monthly (60%) + exams (20%) + tasks (20%), normalizado a 0-20 |
| `src/b3b32a/8abf18/c5e3f2.ts` | **Reescribir**: tabla coach por curso con monthly_grades (columnas por mes), inputs 0-20, cálculo automático de letra, botón Guardar batch. Muestra ponderación de exámenes y tareas. |
| `src/b3b32a/75d37c/fce448.ts` | **Reescribir**: vista student "Mis Notas" con monthly_grades + exams + tasks, todo sobre 20 con letra |
| `src/b3b32a/8abf18/f1a2b3.ts` | **Reescribir**: vista coach x student con monthly_grades, igual lógica |
| `src/fad58d.ts` | Quitar imports/routes de attendance, auditoría, promociones |
| `src/34d59f/dc7161.ts` | Quitar "Asistencias" del sidebar |
| `src/b3b32a/8abf18/ec35bd.ts` | Quitar link a attendance |
| `src/b3b32a/75d37c/ec35bd.ts` | Quitar link a attendance (si existe) |

---

## 6. Archivos a eliminar

- `src/b3b32a/8abf18/64c62c.ts`
- `src/b3b32a/8abf18/g7h8i9.ts`
- `src/b3b32a/8abf18/attendance_utils.ts`
- `src/b3b32a/9e81e7/2165e4.ts`
- `src/b3b32a/8abf18/ea6aeb.ts`
- `supabase/migrations/20260622000014_cleanup_attendance.sql` (nuevo)

---

## 7. Migrations (nuevos)

| Archivo | Contenido |
|---------|-----------|
| `20260622000013_create_monthly_grades.sql` | CREATE TABLE monthly_grades |
| `20260622000014_cleanup_attendance.sql` | DROP TABLE attendance |

---

## 8. Lo que NO cambia

- **Exámenes**: se toman, se califican, siguen existiendo en la web
- **Tareas**: se suben, se califican, siguen existiendo
- **Scrims, Teams, Practicals, Players**: activos
- **Pagos**: activos
- **Promociones**: activas (auto/manual)
- **Sidebar**: igual excepto Asistencias
- **Rutas**: igual excepto las de attendance
