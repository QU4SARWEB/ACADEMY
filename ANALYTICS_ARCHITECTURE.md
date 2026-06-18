# Dashboard Analytics — QU4SAR

> Fase 8: Convertir datos en información útil para coaches, estudiantes y jugadores.

---

## 1. Métricas

### Core KPIs

| Métrica | Fórmula | Fuente |
|---------|---------|--------|
| Total alumnos | COUNT(profiles WHERE role='student' AND is_active=true) | profiles |
| Total jugadores | COUNT(profiles WHERE role='player' AND is_active=true) | profiles |
| Cursos activos | COUNT(courses WHERE is_active=true) | courses |
| Exámenes activos | COUNT(exams WHERE is_published=true) | exams |
| Tareas pendientes | COUNT(task_submissions WHERE status='submitted' OR status='reviewed') | task_submissions |
| Tickets abiertos | COUNT(support_tickets WHERE status='open' OR status='in_progress') | support_tickets |

### Rendimiento académico

| Métrica | Fórmula | Fuente |
|---------|---------|--------|
| Promedio general | AVG(enrollments.final_grade) WHERE status='active' | enrollments |
| Tasa aprobación | COUNT(enrollments WHERE final_grade >= 11) / COUNT(enrollments WHERE final_grade IS NOT NULL) | enrollments |
| Tasa reprobación | COUNT(enrollments WHERE final_grade < 11) / COUNT(enrollments WHERE final_grade IS NOT NULL) | enrollments |
| Exámenes completados | COUNT(exam_attempts WHERE status='submitted' OR status='graded') | exam_attempts |
| Tasa entrega tareas | COUNT(task_submissions WHERE status='submitted' OR status='graded') / COUNT(tasks) | task_submissions, tasks |

### Riesgo académico

| Alerta | Condición | Acción |
|--------|-----------|--------|
| Promedio bajo | final_grade < 11 | Mostrar en rojo |
| Tareas atrasadas | 2+ tasks sin submission | Mostrar ⚠️ |
| Exámenes reprobados | 2+ exam_attempts con score < passing_score | Mostrar ⚠️ |
| Inactividad | Sin activity en > 14 días | Mostrar 🟡 |

### Player

| Métrica | Fórmula | Fuente |
|---------|---------|--------|
| Scrims jugados | COUNT(scrims) WHERE team_id IN player's teams | scrims |
| Win rate | COUNT(scrims WHERE result='win') / COUNT(scrims) | scrims |
| Asistencia entrenamientos | COUNT(attendance WHERE status='present') / COUNT(attendance) | attendance |

---

## 2. Dashboard Layout

### Coach

```
┌──────────────────────────────────────────────────────┐
│  KPIs Bar:                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 120  │ │ 45   │ │ 8    │ │ 230  │ │ 12   │       │
│  │Alumn.│ │Jugad.│ │Cursos│ │Tareas│ │Ticks │       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
├──────────────────────────────────────────────────────┤
│  Rendimiento            │  Riesgo                    │
│  ┌──────────────┐       │  ┌──────────────┐          │
│  │ Promedio: 14 │       │  │ ⚠️ 8 en riesgo│          │
│  │ Aprobados: 75%│      │  │ 🟡 5 inactivos│         │
│  │ Reproba: 25% │       │  └──────────────┘          │
│  │ Tareas: 68%  │       │                            │
│  └──────────────┘       │                            │
├──────────────────────────────────────────────────────┤
│  Gráfica: Notas por curso                            │
│  ████████████                                        │
│  ██████████  ██████                                  │
│  Curso A     Curso B                                 │
└──────────────────────────────────────────────────────┘
```

### Student

```
┌──────────────────────────────────────────────────────┐
│  Mi progreso:                                        │
│  Curso Valorant ███████░░░ 72%                       │
│  Curso Tácticas ██████░░░░ 60%                       │
├──────────────────────────────────────────────────────┤
│  Tareas: 8/12 completadas  ✅✅✅✅✅✅✅✅░░░░         │
│  Exámenes: Promedio 15/20                            │
│  Asistencia: 85%                                     │
└──────────────────────────────────────────────────────┘
```

---

## 3. Implementación

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/2b3583/bd2119.ts` | Agregar íconos de chart/bar/trending si no existen |
| `src/b3b32a/8abf18/4866e3.ts` | Coach dashboard: agregar KPIs + gráficas |
| `src/b3b32a/75d37c/4866e3.ts` | Student dashboard: agregar barras de progreso |
| `src/b3b32a/a2bbab/4866e3.ts` | Player dashboard: agregar win rate + stats |

### Sin librerías externas

Gráficas vía SVG inline (sin Chart.js ni D3):

```typescript
function renderBarChart(data: { label: string; value: number; color: string }[]): string {
  const max = Math.max(...data.map(d => d.value), 1)
  return `<div class="space-y-2">
    ${data.map(d => `
      <div class="flex items-center gap-3">
        <span class="w-24 text-xs text-zinc-400 text-right">${escapeHtml(d.label)}</span>
        <div class="flex-1 h-5 rounded bg-zinc-800 overflow-hidden">
          <div class="h-full rounded transition-all duration-500" style="width:${(d.value / max) * 100}%;background:${d.color}"></div>
        </div>
        <span class="w-10 text-xs text-zinc-300 text-right">${d.value}</span>
      </div>
    `).join('')}
  </div>`
}
```

---

## 4. Orden de fases

```
Fase 8.0  ✅ ANALYTICS_ARCHITECTURE.md
Fase 8.1  Coach KPIs + tarjetas + gráficas básicas
Fase 8.2  Student dashboard de progreso
Fase 8.3  Player dashboard con stats competitivas
Fase 8.4  Alertas de riesgo académico
```
