# Exams V2 — Arquitectura

## Estado actual (V1)

Tras la auditoría, el sistema actual está funcional pero con limitaciones:

| Aspecto | V1 | V2 |
|---------|-----|-----|
| Código | Mezclado con el monolito | Módulo independiente |
| Parser | Solo 1 formato (numérico) | 4+ formatos |
| Banco preguntas | No existe | Sí, con categorías |
| Reviewer | Integrado en coach page | Dedicado con cola |
| Player | Integrado en SPA | Standalone con recovery |
| Analytics | No existe | Dashboard completo |

---

## 1. Estructura de archivos

```
src/
├── exams-v2/
│   ├── index.ts                  # Router exports
│   ├── shared/
│   │   ├── types.ts              # All TypeScript interfaces
│   │   ├── constants.ts          # Scales, labels, categories
│   │   ├── db.ts                 # Supabase queries shared
│   │   └── utils.ts              # Formatting, validation
│   │
│   ├── parser/
│   │   ├── index.ts              # Main export: parse(text) → Question[]
│   │   ├── format-numeric.ts     # "1. Pregunta\nA) Opción\nRespuesta: A"
│   │   ├── format-list.ts        # "Pregunta:\n...\nOpciones:\n- ...\nCorrecta: ..."
│   │   ├── format-truefalse.ts   # "Verdadero o Falso\n...\nRespuesta: Verdadero"
│   │   ├── format-open.ts        # "Pregunta abierta\n..."
│   │   └── types.ts              # ParsedQuestion, ParseResult
│   │
│   ├── bank/
│   │   ├── index.ts              # Main exports
│   │   ├── render.ts             # Question bank UI
│   │   ├── filters.ts            # Search, filter by category/tags
│   │   └── manager.ts            # CRUD operations
│   │
│   ├── creator/
│   │   ├── index.ts              # Main exports (render + init)
│   │   ├── render.ts             # Exam creation wizard
│   │   ├── question-form.ts      # Add/edit individual question
│   │   ├── paste-area.ts         # Parser integration + preview
│   │   └── publish.ts            # Review + publish flow
│   │
│   ├── player/
│   │   ├── index.ts
│   │   ├── render.ts             # Clean exam view
│   │   ├── timer.ts              # Countdown + auto-submit
│   │   ├── recovery.ts           # localStorage auto-save + restore
│   │   ├── submit.ts             # Answer submission flow
│   │   └── results.ts            # Post-exam results view
│   │
│   ├── reviewer/
│   │   ├── index.ts
│   │   ├── render.ts             # Queue + grading interface
│   │   ├── quick-grade.ts        # One-click scores [0,25,50,75,100]
│   │   └── manual-grade.ts       # Full grade + comment
│   │
│   └── analytics/
│       ├── index.ts
│       ├── course-stats.ts       # Averages per course/exam
│       ├── question-analysis.ts   # Most failed/succeeded questions
│       ├── student-ranking.ts     # Rankings by score
│       └── student-evolution.ts   # Progress over time
```

---

## 2. Modelo de datos

### Tablas (sobre la DB actual)

```sql
-- Exams (tabla actual, ampliada)
exams
├── id UUID PK
├── course_id UUID FK → courses
├── title TEXT
├── description TEXT
├── passing_score NUMERIC(5,2)
├── time_limit INT (minutes)
├── max_attempts INT
├── shuffle BOOLEAN
├── is_published BOOLEAN
├── is_active BOOLEAN
├── created_at TIMESTAMPTZ
├── updated_at TIMESTAMPTZ

-- Questions (tabla actual)
questions
├── id UUID PK
├── course_id UUID FK → courses
├── type ENUM('multiple_choice','true_false','short_answer','open_ended')
├── stem TEXT
├── explanation TEXT
├── difficulty INT (1-5)
├── points NUMERIC(5,2)
├── is_active BOOLEAN  ← NUEVO
├── tags TEXT[]  ← NUEVO (ej: {'Duelista','Rol','Mecánica'})
├── image_url TEXT  ← NUEVO
├── video_url TEXT  ← NUEVO
├── created_at TIMESTAMPTZ
├── updated_at TIMESTAMPTZ

-- NUEVA: question_categories
question_categories
├── id UUID PK
├── question_id UUID FK → questions
├── category TEXT  ('Posicionamiento','Rookie','Trainee','Amateur','Competitor','Elite','Scrims','Mapas','Roles','Mentalidad','Comunicación')
└── UNIQUE(question_id, category)

-- question_options (tabla actual, sin cambios)
question_options
├── id UUID PK
├── question_id UUID FK → questions
├── text TEXT
├── is_correct BOOLEAN
└── order_num INT

-- exam_questions (tabla actual)
exam_questions
├── id UUID PK
├── exam_id UUID FK → exams
├── question_id UUID FK → questions
├── order_num INT
├── points NUMERIC(5,2)
└── UNIQUE(exam_id, question_id)

-- NUEVA: exam_sessions (reemplaza exam_attempts como intento activo)
exam_sessions
├── id UUID PK
├── exam_id UUID FK → exams
├── enrollment_id UUID FK → enrollments
├── attempt_num INT
├── status ENUM('in_progress','submitted','graded')
├── started_at TIMESTAMPTZ
├── submitted_at TIMESTAMPTZ
├── time_remaining INT (seconds saved for recovery)
└── UNIQUE(exam_id, enrollment_id, attempt_num)

-- NUEVA: session_answers (reemplaza student_answers)
session_answers
├── id UUID PK
├── session_id UUID FK → exam_sessions
├── question_id UUID FK → questions
├── selected_option_id UUID FK → question_options
├── text_answer TEXT
├── is_correct BOOLEAN
├── auto_score NUMERIC(5,2)  (de 0 a 100)
├── coach_score NUMERIC(5,2) (para preguntas manuales)
├── coach_comment TEXT
├── graded_at TIMESTAMPTZ
└── UNIQUE(session_id, question_id)

-- NUEVA: reviews (cola de revisión para coaches)
reviews
├── id UUID PK
├── session_id UUID FK → exam_sessions
├── coach_id UUID FK → profiles
├── status ENUM('pending','in_review','completed')
├── assigned_at TIMESTAMPTZ
├── completed_at TIMESTAMPTZ
└── UNIQUE(session_id)

-- NUEVA: rubrics (para preguntas abiertas)
rubrics
├── id UUID PK
├── question_id UUID FK → questions
├── score INT (0-100)
├── description TEXT
└── order_num INT
```

### Relaciones

```
courses 1──N exams
courses 1──N questions
questions 1──N question_options
questions 1──N question_categories
questions 1──N rubrics
exams N──M questions ← exam_questions (con order_num y points)
exams 1──N exam_sessions
enrollments 1──N exam_sessions
exam_sessions 1──N session_answers
exam_sessions 1──1 reviews (opcional)
```

---

## 3. Parser (componente más importante)

### Entrada/Salida

```ts
interface ParseResult {
  success: boolean
  questions: ParsedQuestion[]
  errors: ParseError[]
}

interface ParsedQuestion {
  stem: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended'
  options?: { text: string; correct: boolean }[]
  points: number
}
```

### Formatos soportados

#### Formato 1: Numerado (actual)
```
1. ¿Qué hace un Duelista?
A. Curar
B. Crear espacio
C. Defender
D. Informar
Respuesta: B
```

Parser: `format-numeric.ts`
- Regex: `/^(\d+)[\.\)]\s*(.+)/` → pregunta
- Regex: `/^([A-Da-d])[\.\)]\s*(.+)/` → opción
- Regex: `/^Respuesta:\s*([A-Da-d])/i` → correcta

#### Formato 2: Lista explícita
```
Pregunta:
¿Qué hace un Duelista?

Opciones:
- Curar
- Crear espacio
- Defender

Correcta:
Crear espacio
```

Parser: `format-list.ts`
- Busca "Pregunta:" como separador
- Busca "Opciones:" para iniciar lista
- Busca "Correcta:" para marcar la correcta

#### Formato 3: Verdadero/Falso
```
Verdadero o Falso

El Duelista tiene como función principal crear espacio.

Respuesta: Verdadero
```

Parser: `format-truefalse.ts`
- Detecta "Verdadero o Falso" en el texto
- Genera 2 opciones automáticas: Verdadero/Falso
- Lee "Respuesta:" para determinar cuál es correcta

#### Formato 4: Pregunta abierta
```
Pregunta abierta
Explica la función de un Iniciador.
```

Parser: `format-open.ts`
- Detecta "Pregunta abierta" o "Respuesta larga"
- No genera opciones
- Tipo: `open_ended`

### Pipeline del parser

```
Texto crudo
    │
    ▼
Detectar formato (intentar 1→2→3→4)
    │
    ▼
Parsear preguntas
    │
    ▼
Validar (stem requerido, opciones pares, etc.)
    │
    ▼
ParseResult { questions[], errors[] }
    │
    ▼
Vista previa en Creator
    │
    ▼
Usuario confirma → guarda en DB
```

---

## 4. Banco de preguntas

### Categorías predefinidas

```ts
const QUESTION_CATEGORIES = [
  { id: 'placement', label: 'Posicionamiento', color: '#10B981' },
  { id: 'rookie', label: 'Rookie', color: '#8B5CF6' },
  { id: 'trainee', label: 'Trainee', color: '#6D28D9' },
  { id: 'amateur', label: 'Amateur', color: '#EC4899' },
  { id: 'competitor', label: 'Competitor', color: '#F59E0B' },
  { id: 'elite', label: 'Elite', color: '#EF4444' },
  { id: 'scrims', label: 'Scrims', color: '#3B82F6' },
  { id: 'maps', label: 'Mapas', color: '#06B6D4' },
  { id: 'roles', label: 'Roles', color: '#14B8A6' },
  { id: 'mentality', label: 'Mentalidad', color: '#F97316' },
  { id: 'communication', label: 'Comunicación', color: '#8B5CF6' },
]
```

### Funcionalidades del banco

```
Bank Manager
├── Listar preguntas (paginado, filtros)
├── Buscar por texto (stem)
├── Filtrar por categoría (tags)
├── Filtrar por tipo (multiple_choice, open_ended, etc.)
├── Filtrar por curso
├── Filtrar por dificultad (1-5)
├── Vista previa de cada pregunta
├── Editar pregunta
├── Duplicar pregunta
├── Mover a categoría
└── Eliminar (soft delete: is_active = false)
```

### Integración con Creator

```
Creator
├── "Agregar del banco" → abre modal con Bank Manager
├── Seleccionar preguntas (checkbox)
├── Confirmar → se agregan al examen con `exam_questions.insert`
└── También permite crear nuevas desde el Creator
```

---

## 5. Reviewer

### Cola de revisión

```
          ┌─────────────┐
          │ Pendientes   │ 14
          ├─────────────┤
          │ Juan Pérez   │ ← Click → abrir intento
          │ David López  │
          │ Carlos Ruiz  │
          └─────────────┘
```

### Interfaz de corrección

```
┌──────────────────────────────────────────────┐
│  Pregunta 3 de 10                            │
│  Explica la función de un Iniciador.         │
│                                              │
│  Respuesta del alumno:                       │
│  "El iniciador debe entrar primero..."       │
│                                              │
│  Rúbrica:                                    │
│  [0]  Incorrecto                             │
│  [25] Muy deficiente                         │
│  [50] Regular                                │
│  [75] Bueno                                  │
│  [100] Excelente                             │
│                                              │
│  Puntaje: [ 75 ]  /100                       │
│                                              │
│  Comentario:                                 │
│  [_________________________________]         │
│                                              │
│  [◀ Anterior]          [Siguiente ▶]         │
│                                              │
│  [× Cerrar revisión]                         │
└──────────────────────────────────────────────┘
```

### Escala de calificación

```ts
const GRADE_SCALE = [
  { value: 0,   label: 'Incorrecto',      color: 'text-red-400' },
  { value: 25,  label: 'Muy deficiente',   color: 'text-red-300' },
  { value: 50,  label: 'Regular',          color: 'text-yellow-400' },
  { value: 75,  label: 'Bueno',            color: 'text-green-400' },
  { value: 100, label: 'Excelente',        color: 'text-green-300' },
]
```

### Flujo de preguntas mixtas

```
Auto-gradadas (multiple_choice, true_false)
├── Se calculan al enviar el examen
├── coach_score = auto_score
└── No aparecen en la cola de revisión

Manuales (short_answer, open_ended)
├── Quedan con coach_score = NULL
├── Aparecen en la cola de revisión del coach
└── Coach asigna puntaje manualmente
```

---

## 6. Analytics

### Dashboard de analytics

```
┌─────────────────────────────────────────────┐
│  Promedio del curso: 72%                     │
│  Exámenes realizados: 48                     │
│  Tasa de aprobación: 68%                     │
├─────────────────────────────────────────────┤
│  Preguntas más falladas                      │
│  1. ¿Qué es una rotación?            32% ✅  │
│  2. Función del Centinela            41% ✅  │
│  3. ¿Qué significa "trade"?          45% ✅  │
├─────────────────────────────────────────────┤
│  Ranking de alumnos                         │
│  #1  Juan Pérez          92%  ██████████   │
│  #2  María García        88%  █████████    │
│  #3  Carlos Ruiz         85%  █████████    │
├─────────────────────────────────────────────┤
│  Evolución del alumno                       │
│  Juan Pérez                                 │
│  Examen 1: 60%  ██████░░                    │
│  Examen 2: 75%  ████████░                   │
│  Examen 3: 82%  █████████░                  │
└─────────────────────────────────────────────┘
```

### Queries de analytics

```sql
-- Promedio por curso
SELECT c.name, AVG(ea.score) as avg_score
FROM exam_attempts ea
JOIN exams e ON e.id = ea.exam_id
JOIN courses c ON c.id = e.course_id
GROUP BY c.name;

-- Preguntas más falladas
SELECT q.stem, 
  COUNT(sa.id) as total,
  SUM(CASE WHEN sa.is_correct THEN 0 ELSE 1 END) as incorrect,
  ROUND(SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(sa.id) * 100) as success_rate
FROM session_answers sa
JOIN questions q ON q.id = sa.question_id
WHERE sa.is_correct IS NOT NULL
GROUP BY q.id, q.stem
ORDER BY success_rate ASC
LIMIT 10;

-- Ranking de alumnos
SELECT p.full_name, AVG(ea.score) as avg_score
FROM exam_attempts ea
JOIN enrollments en ON en.id = ea.enrollment_id
JOIN profiles p ON p.id = en.profile_id
GROUP BY p.id, p.full_name
ORDER BY avg_score DESC;

-- Evolución del alumno
SELECT e.title, ea.score, ea.submitted_at
FROM exam_attempts ea
JOIN exams e ON e.id = ea.exam_id
WHERE ea.enrollment_id = ?
ORDER BY ea.submitted_at ASC;
```

---

## 7. Plan de migración

### Fase 1 — Base (1-2 semanas)

| Tarea | Archivos |
|-------|----------|
| Crear estructura `src/exams-v2/` | — |
| Implementar parser (4 formatos) | `parser/*.ts` |
| Implementar Question Bank Manager | `bank/*.ts` |
| Migraciones SQL (question_categories, exam_sessions, etc.) | `supabase/migrations/` |

### Fase 2 — Creator (1 semana)

| Tarea | Archivos |
|-------|----------|
| Nueva UI de creación de exámenes | `creator/*.ts` |
| Integración con parser (paste + preview) | `creator/paste-area.ts` |
| Integración con banco de preguntas | `creator/question-form.ts` |

### Fase 3 — Player (1 semana)

| Tarea | Archivos |
|-------|----------|
| Nueva UI de examen (limpia, standalone) | `player/*.ts` |
| Auto-guardado + recovery | `player/recovery.ts` |
| Timer + auto-submit | `player/timer.ts` |

### Fase 4 — Reviewer + Analytics (1 semana)

| Tarea | Archivos |
|-------|----------|
| Cola de revisión | `reviewer/*.ts` |
| Corrección rápida + manual | `reviewer/quick-grade.ts` |
| Dashboard analítico | `analytics/*.ts` |

### Fase 5 — Retiro de V1

| Tarea |
|-------|
| Redirigir rutas V1 a V2 |
| Eliminar componentes V1 del código |
| Verificar que no haya dependencias residuales |

---

## Resumen

| Componente | Prioridad | Depende de | Esfuerzo |
|------------|-----------|------------|----------|
| Parser | 1 | — | 2-3 días |
| Bank Manager | 2 | — | 2 días |
| Creator | 3 | Parser + Bank | 3-4 días |
| Player | 4 | — | 3-4 días |
| Reviewer | 5 | Player | 2-3 días |
| Analytics | 6 | Player | 2 días |
| **Total** | | | **~3 semanas** |
