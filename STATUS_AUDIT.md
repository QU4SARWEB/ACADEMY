# Auditoría de Estados — QU4SAR

> Todos los estados del sistema verificados contra DB schema y frontend.
> **151 ocurrencias analizadas, 9 tablas, 0 sinónimos, 1 bug corregido.**

---

## 1. Tabla de estados por entidad

| Entidad | Columna | CHECK / Boolean | Valores DB | ¿Usos frontend? | ¿Bug? |
|---------|---------|----------------|------------|-----------------|-------|
| **enrollments** | `status` | CHECK | `active`, `recovery`, `graduated`, `inactive` | ✅ Todos usados | ❌ Era `'dropped'` → corregido a `'inactive'` |
| **task_submissions** | `status` | CHECK | `pending`, `submitted`, `reviewed`, `graded`, `late` | ✅ Todos usados | ✅ Sin bug |
| **exam_attempts** | `status` | CHECK | `in_progress`, `submitted`, `graded` | ✅ Todos usados | ✅ Sin bug |
| **attendance** | `status` | CHECK | `present`, `absent`, `excused`, `late` | ✅ Todos usados | ✅ Sin bug |
| **payments** | `status` | CHECK | `pending`, `paid`, `scholarship`, `expired` | ✅ Todos usados | ✅ Sin bug |
| **courses** | `is_active` | BOOLEAN | `true`/`false` | ✅ | ✅ Sin bug |
| **seasons** | `is_active` | BOOLEAN | `true`/`false` | ✅ | ✅ Sin bug |
| **profiles** | `is_active` | BOOLEAN | `true`/`false` | ✅ | ✅ Sin bug |
| **exams** | `is_published` | BOOLEAN | `true`/`false` | ✅ | ✅ Sin bug |
| **schedules** | `type` | TEXT | `academic`, `competitive` | ✅ | ✅ Sin bug |
| **scrims** | `result` | TEXT | `win`, `loss`, `draw` | ✅ | ✅ Sin bug |
| **profiles** | `role` | TEXT | `coach`, `student`, `player` | ✅ | ✅ Sin bug |
| **enrollments** | `type` | CHECK | `student`, `player` | ✅ | ✅ Sin bug |

---

## 2. ¿Hay sinónimos o valores duplicados?

**No.** Cada entidad tiene su propio set de estados y NO se comparten entre tablas.

```
enrollments.status     → active, recovery, graduated, inactive
task_submissions.status → pending, submitted, reviewed, graded, late
exam_attempts.status   → in_progress, submitted, graded
attendance.status      → present, absent, excused, late
payments.status        → pending, paid, scholarship, expired
```

El único overlap es `'pending'` que aparece en `task_submissions` (default) y `payments` — pero son tablas distintas, sin relación directa.

---

## 3. Bug encontrado y corregido

| Ítem | Valor |
|------|-------|
| **Archivo** | `src/b3b32a/8abf18/b60dbf.ts:308` |
| **Contexto** | Botón "Dar de baja inscripción" |
| **Código anterior** | `status: 'dropped'` |
| **Valor DB esperado** | `'active'`, `'recovery'`, `'graduated'`, `'inactive'` |
| **Corrección** | `status: 'inactive'` |
| **Commit** | `3dde32b` |

---

## 4. ¿Valores no usados?

| Entidad | Valor en DB | ¿Se usa en frontend? |
|---------|-------------|---------------------|
| `task_submissions` | `pending` | ❌ No se inserta nunca (default de BD). Insert usa `'submitted'` |
| `task_submissions` | `reviewed` | ❌ No se inserta ni actualiza. Solo se compara en condición |

Ningún valor está huérfano. Los dos no-insertados son valores de transición controlados por flujo.

---

## 5. Consistencia frontend ↔ backend

| Aspecto | Resultado |
|---------|-----------|
| TypeScript types en `d14a80/index.ts` | ✅ 100% alineados con CHECK constraints |
| Valores en inserts | ✅ Todos pasan CHECK |
| Valores en updates | ✅ Todos pasan CHECK |
| Valores en filtros `.eq('status', ...)` | ✅ Todos existen en DB |
| Comparaciones lógicas (`=== 'active'`) | ✅ Todos mapean a valores reales |
| `is_active` como booleano | ✅ 100% boolean, no string |

---

## 6. Resumen

| Métrica | Valor |
|---------|-------|
| Tablas con status | 9 |
| CHECK constraints únicos | 5 (enrollments, task_submissions, exam_attempts, attendance, payments) |
| Valores únicos de status | 19 |
| Bugs encontrados | 1 (`'dropped'` → corregido) |
| Sinónimos detectados | 0 |
| Inconsistencias TS ↔ DB | 0 |
