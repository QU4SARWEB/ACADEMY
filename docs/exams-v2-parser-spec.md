# Exams V2 — Parser Spec

## 1. Arquitectura del parser

```
Input: string (texto plano pegado por el coach)
    │
    ▼
detectFormat(text) → 'numeric' | 'list' | 'truefalse' | 'open' | 'unknown'
    │
    ▼
routeToFormat(format, text) → ParsedQuestion[]
    │
    ▼
validate(questions) → ParseResult
    │
    ▼
Sandbox (vista previa, NO guarda)
    │
    ▼
Usuario confirma → questionStore.bulkCreate()
```

### Interfaz

```ts
interface ParseResult {
  success: boolean
  questions: ParsedQuestion[]
  errors: ParseError[]
  warnings: ParseWarning[]
}

interface ParsedQuestion {
  tempId: string                        // UUID único para identificar en sandbox (editar/eliminar/reordenar)
  stem: string
  type: 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'open_ended' | 'tactical_scenario'
  options: { text: string; correct: boolean }[]  // vacío para open_ended y tactical_scenario
  points: number
  sourceLine: number                    // línea original en el texto
  detectedPoints: boolean               // true si se detectaron puntos desde el texto
  status: 'valid' | 'warning' | 'error' // estado de parseo para el sandbox
  suggestions?: {
    categories: string[]                // categorías sugeridas automáticamente
  }
}

interface ParseError {
  line: number
  message: string
  severity: 'error' | 'warning'
}

type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'open_ended' | 'tactical_scenario'
```

---

## 2. Detección de puntuación desde el texto

El parser soporta 3 formas de detectar puntos por pregunta:

### Formato inline: `[Puntos: N]`

```
[Puntos: 10]
1. ¿Qué hace un Duelista?
A. Curar
B. Crear espacio
Respuesta: B

[Puntos: 5]
2. ¿Qué significa trade?
A. Cambiar arma
B. Intercambiar kills
Respuesta: B
```

### Formato parentético: `(N pts)`

```
(10 pts)
1. ¿Qué hace un Duelista?
A. Curar
B. Crear espacio
Respuesta: B

(5 pts)
Verdadero o Falso
El Duelista crea espacio.
Respuesta: Verdadero
```

### Formato cabecera: `Puntos: N`

```
Puntos: 10
Pregunta:
¿Qué hace un Duelista?
Opciones:
- Curar
- Crear espacio
Correcta:
Crear espacio
```

### Reglas

| Situación | Comportamiento |
|-----------|---------------|
| `[Puntos: 10]` al inicio | Se asigna a la pregunta siguiente, `detectedPoints = true` |
| `(10 pts)` al inicio | Ídem |
| `Puntos: 10` en línea propia | Ídem |
| Sin indicador de puntos | `points = 5` (default), `detectedPoints = false` |
| Valor no numérico | Warning: "puntos no reconocidos, se usará 5 por defecto" |

---

## 3. Auto-categorización

Cuando el coach pega preguntas, el parser analiza el contenido del `stem` y las `options` para sugerir categorías automáticamente.

### Reglas de sugerencia

| Palabras clave en el texto | Categoría sugerida |
|---------------------------|-------------------|
| duelista, jett, reyna, phoenix, raze | `Roles` |
| iniciador, sova, breach, skye, kay/o | `Roles` |
| controlador, brimstone, viper, omen, astra | `Roles` |
| centinela, sage, cypher, killjoy, chamber | `Roles` |
| ascent, bind, haven, split, breeze, icebox, fracture | `Mapas` |
| trade, rotación, eco, force, half, retake | `Mentalidad` |
| comunicacion, pings, call, informacion, posición | `Comunicación` |
| scrim, torneo, pick, ban, mapa, veto | `Scrims` |

### Algoritmo

```ts
function suggestCategories(question: ParsedQuestion): string[] {
  const text = (question.stem + ' ' + question.options.map(o => o.text).join(' ')).toLowerCase()
  const categories: string[] = []
  
  if (/duelista|jett|reyna/i.test(text)) categories.push('Roles')
  if (/ascent|bind|haven/i.test(text)) categories.push('Mapas')
  if (/trade|rotación|eco/i.test(text)) categories.push('Mentalidad')
  // ... más reglas
  
  return categories
}
```

Las categorías sugeridas aparecen en el sandbox como pre-seleccionadas. El coach puede aceptarlas, modificarlas o ignorarlas.

---

## 4. Deduplicación inteligente

### Algoritmo de normalización

```ts
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/[¿?¡!.,;:()\-"]/g, '')                    // quitar puntuación
    .replace(/\s+/g, ' ')                                // normalizar espacios
    .trim()
}
```

### Umbrales de detección

| Similitud | Comportamiento |
|-----------|---------------|
| 100% (normalizados) | Error: "pregunta duplicada exacta: '¿Qué hace un Duelista?'" |
| > 80% (Jaro-Winkler) | Warning: "pregunta muy similar a la #3: '¿Qué hace un Duelista?'" |
| < 80% | Se considera pregunta diferente |

### Comportamiento en el sandbox

```
⚠️ Pregunta 3: ¿Qué hace un Duelista?
   ↳ Muy similar a Pregunta 1
   [Mantener] [Eliminar] [Fusionar]
```

---

## 5. Formato `multiple_select` (múltiples respuestas correctas)

### Gramática

```
<question> ::= <number> <stem> "\n" <option>+ 
               ["Respuesta:" <letters> | "Respuestas:" <letters>]
<letters>  ::= /[A-Za-z](,[A-Za-z])*/   // ej: "A,C" o "A, C, D"
```

### Ejemplo válido

```
1. ¿Cuáles son funciones de un Iniciador?
A. Obtener información
B. Curar aliados
C. Facilitar entradas
D. Crear espacio directamente
Respuesta: A,C
```

### Detección

El parser detecta `multiple_select` si:
- Hay más de una letra en "Respuesta:" separada por comas
- O el texto dice "Respuestas:" (plural)

### Comportamiento

| Situación | Comportamiento |
|-----------|---------------|
| `Respuesta: A,C` | Opciones A y C marcadas como correctas |
| `Respuesta: A, C, D` | Opciones A, C y D marcadas como correctas |
| `Respuestas: A y C` | Aceptado, opciones A y C correctas |
| Letra repetida en opciones | Error: "opción duplicada" |
| Una sola letra | Se trata como `multiple_choice` normal |

### En el player

```html
<!-- multiple_choice: radio buttons -->
<input type="radio" name="q1" value="A">

<!-- multiple_select: checkboxes -->
<input type="checkbox" name="q1" value="A">
<input type="checkbox" name="q1" value="C">
```

---

## 6. Formato `tactical_scenario` (escenario táctico)

### Gramática

```
<scenario> ::= ["Escenario" | "Táctico" | "Scenario"] "\n"
               <context> "\n"
               ["Tienes:" "\n" <agents>] "\n"
               <task>
<context>  ::= /.+/
<agents>   ::= /-\s*.+/+
<task>     ::= /.+/
```

### Ejemplo válido

```
Escenario táctico

Ascent. Atacas A. El enemigo tiene un Cypher y un Killjoy.
Tienes:
- Sova
- Omen
- Jett
- Killjoy

Describe cómo ejecutarías la entrada al sitio.
```

```
Táctico

Bind. Ronda de pistola. Tienes:
- Phoenix
- Brimstone
- Reyna

¿Cómo gestionas la ronda?
```

### Detección

El parser detecta este formato si la primera línea contiene "Escenario", "Táctico" o "Scenario".

### Comportamiento

- Tipo: `tactical_scenario`
- No genera opciones
- No tiene respuesta correcta automática
- Se muestra en el player con un recuadro destacado para el escenario
- Aparece en la cola de revisión del coach
- En el reviewer, se muestra el escenario completo arriba y la respuesta del alumno abajo

### Interfaz en el player

```
┌──────────────────────────────────────────┐
│  📋 Escenario táctico                     │
│                                          │
│  Ascent. Atacas A.                       │
│  Tienes: Sova, Omen, Jett, Killjoy       │
│                                          │
│  Describe cómo ejecutarías la entrada:   │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │  (textarea)                      │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## 7. Formato 1: Numerado (el más común)

### Gramática

```
<exam>       ::= <question>+
<question>   ::= <number> <stem> "\n" <option>+ ["Respuesta:" <letter>]
<number>     ::= /\d+[\.\)]/
<stem>       ::= /.+/
<option>     ::= /[A-Za-z][\.\)]\s*.+/
<letter>     ::= /[A-Za-z]/
```

### Ejemplo válido

```
1. ¿Cuál es el rol principal de un Duelista?
A. Liderar la entrada al sitio
B. Curar a los compañeros
C. Controlar el mapa con humos
D. Vigilar el flanco
Respuesta: A

2. ¿Qué significa "trade"?
A. Cambiar de arma
B. Intercambiar kills
C. Vender objetos
D. Intercambiar información
Respuesta: B
```

### Detección

El parser detecta este formato si la primera línea no vacía coincide con `/^\d+[\.\)]\s*.+/`.

### Casos ambiguos

| Situación | Comportamiento |
|-----------|---------------|
| Números mezclados: `1.` y `1)` | Se aceptan ambos, se normaliza a `1.` |
| Letras mezcladas: `A.` y `a)` | Se aceptan ambos |
| Opciones sin letra: solo guiones | Falla, error: "formato no reconocido en opción" |
| Sin "Respuesta:" al final | Warning: "pregunta sin respuesta correcta marcada" |
| "Respuesta:" con letra que no existe | Error: "respuesta 'E' no corresponde a ninguna opción" |
| Opciones con ✅ ya marcada | Se usa como correcta, ignora "Respuesta:" |

### Formato inválido

```
1. ¿Qué hace un Duelista?
- Curar
- Crear espacio
- Defender
```

Error: "Las opciones deben comenzar con A., B., C., etc. (no guiones)"

---

## 9. Formato 2: Lista explícita

### Gramática

```
<exam>     ::= <question>+
<question> ::= "Pregunta:" "\n" <stem> "\n" 
               ["Opciones:" "\n" <item>+] 
               ["Correcta:" "\n" <answer>]
<item>     ::= /[-*]\s*.+/
<answer>   ::= /.+/  (debe coincidir textualmente con un item)
```

### Ejemplo válido

```
Pregunta:
¿Qué hace un Duelista?

Opciones:
- Curar
- Crear espacio
- Defender

Correcta:
Crear espacio

Pregunta:
¿Qué significa trade?

Opciones:
- Cambiar de arma
- Intercambiar kills

Correcta:
Intercambiar kills
```

### Detección

El parser detecta este formato si la primera línea es "Pregunta:" o "Pregunta".

### Casos ambiguos

| Situación | Comportamiento |
|-----------|---------------|
| Opciones con números en vez de guiones | Se aceptan, se normalizan |
| Sin "Correcta:" | Warning: "sin respuesta correcta" |
| "Correcta:" con texto que no coincide exacto | Error: "la respuesta no coincide con ninguna opción" (case insensitive) |
| Sin "Opciones:" | Se asume pregunta abierta |

### Formato inválido

```
Pregunta:
¿Qué hace un Duelista?

Opciones:
Curar, Crear espacio, Defender

Correcta:
Crear espacio
```

Error: "Las opciones deben estar en líneas separadas comenzando con - o *"

---

## 10. Formato 3: Verdadero/Falso

### Gramática

```
<exam>     ::= <question>+
<question> ::= ["Verdadero o Falso" | "V o F" | "True/False"] "\n"
               <stem> "\n"
               ["Respuesta:" <answer>]
<answer>   ::= "Verdadero" | "Falso" | "V" | "F"
```

### Ejemplo válido

```
Verdadero o Falso

El Duelista tiene como función principal crear espacio.

Respuesta: Verdadero
```

```
V o F

En una situación 4v2, lo recomendable es dividirse.

Respuesta: Falso
```

### Detección

El parser detecta este formato si el texto contiene "Verdadero o Falso", "V o F" o "True/False" al inicio de una pregunta.

### Comportamiento

Siempre genera 2 opciones automáticas en este orden:

```
V. Verdadero  (correcta si respuesta = Verdadero/V)
F. Falso      (correcta si respuesta = Falso/F)
```

### Casos ambiguos

| Situación | Comportamiento |
|-----------|---------------|
| Sin "Respuesta:" | Warning, no se marca ninguna como correcta |
| "Respuesta: V" o "Respuesta: Verdadero" | Se marca Verdadero como correcta |
| "Respuesta: F" o "Respuesta: Falso" | Se marca Falso como correcta |
| Texto sin cabecera pero solo 2 opciones V/F | Se intenta detectar por contexto |

### Formato inválido

```
Verdadero o Falso
El Duelista crea espacio.
```

Warning: "pregunta verdadero/falso sin respuesta marcada"

---

## 11. Formato 4: Pregunta abierta / respuesta corta

### Gramática

```
<exam>     ::= <question>+
<question> ::= ["Pregunta abierta" | "Respuesta larga" | "Respuesta corta" | "Desarrollo"] "\n"
               <stem>
```

### Ejemplo válido

```
Pregunta abierta
Explica la función de un Iniciador en Valorant.
```

```
Respuesta corta
¿Qué es una rotación?
```

### Detección

El parser detecta este formato si la línea comienza con "Pregunta abierta", "Respuesta larga", "Respuesta corta" o contiene "Desarrollo".

### Comportamiento

- No genera opciones
- No tiene respuesta correcta automática
- Se marca como `open_ended` o `short_answer`
- Aparecerá en la cola de revisión del coach

---

## 12. Formato mixto (varios formatos en un mismo texto)

### Regla

Cada pregunta se procesa INDEPENDIENTEMENTE.

El parser divide el texto por líneas en blanco dobles (`\n\n`) y aplica detección individual a cada bloque.

Esto permite:

```
1. ¿Qué hace un Duelista?
A. Curar
B. Crear espacio
Respuesta: B

Verdadero o Falso
El Duelista es un Iniciador.
Respuesta: Falso

Pregunta abierta
Explica la función del Centinela.
```

### Comportamiento

| Bloque | Formato detectado | Tipo resultante |
|--------|------------------|-----------------|
| `1. ¿Qué...` | Numerado | multiple_choice |
| `Verdadero o...` | V/F | true_false |
| `Pregunta abierta...` | Abierta | open_ended |

---

## 13. Pipeline de validación

### Validaciones por pregunta

| Validación | Tipo | Mensaje |
|-----------|------|---------|
| stem no vacío | error | "La pregunta no puede estar vacía" |
| stem > 5 caracteres | error | "La pregunta es demasiado corta" |
| opciones >= 2 (si aplica) | error | "Debe tener al menos 2 opciones" |
| opciones únicas | warning | "Opción duplicada: 'X'" |
| respuesta correcta marcada | warning | "No hay respuesta correcta marcada" |
| respuesta correcta válida | error | "La respuesta 'X' no es una opción válida" |
| máximo 10 opciones | error | "Máximo 10 opciones por pregunta" |
| stem sin caracteres especiales | warning | "La pregunta contiene caracteres no estándar" |

### Validaciones del conjunto

| Validación | Mensaje |
|-----------|---------|
| Al menos 1 pregunta | "No se detectaron preguntas en el texto" |
| Máximo 100 preguntas por lote | "Máximo 100 preguntas por lote. Las restantes se ignorarán" |
| Preguntas duplicadas (stem similar) | warning: "Las preguntas 3 y 7 son muy similares" |

---

## 14. Sandbox (vista previa antes de guardar)

### Comportamiento

```
Pegar texto → Parsear → MOSTAR vista previa → NUNCA guardar automáticamente
```

### Interfaz de sandbox

```
┌──────────────────────────────────────────────────┐
│  Se detectaron 5 preguntas                        │
│                                                   │
│  [✓] Pregunta 1: ¿Qué hace un Duelista? (MC)     │
│  [✓] Pregunta 2: ¿Qué significa trade? (MC)      │
│  [⚠] Pregunta 3: ¿Qué es rotación? (V/F)         │
│       ↳ Sin respuesta correcta marcada            │
│  [✓] Pregunta 4: Menciona funciones... (Open)    │
│  [✗] Pregunta 5: (formato no reconocido)         │
│                                                   │
│  [Editar pregunta 3]  [Descartar todo]            │
│  [✓] Confirmar y guardar (4 preguntas válidas)    │
└──────────────────────────────────────────────────┘
```

### Acciones del sandbox

| Acción | Efecto |
|--------|--------|
| Editar pregunta | Abre question-form con datos pre-cargados |
| Descartar pregunta | Elimina esa pregunta del lote |
| Descartar todo | Limpia el textarea, vuelve al inicio |
| Confirmar | Llama a `questionStore.bulkCreate()` con preguntas válidas |
| Solo guardar válidas | Las preguntas con error se quedan en el textarea para corregir |

---

## 15. Ejemplos reales de QU4SAR

### Examen de Posicionamiento (completo)

```
1. ¿Cuál es el objetivo principal de un Duelista?
A. Liderar la entrada al sitio y conseguir eliminaciones
B. Curar a los compañeros de equipo
C. Controlar el mapa con humos
D. Vigilar el flanco del equipo
Respuesta: A

2. ¿Qué se debe comunicar primero durante una ronda?
A. La skin que está usando el enemigo
B. La posición y cantidad de enemigos avistados
C. El score actual del jugador
D. Los planes para la próxima ronda
Respuesta: B

3. Verdadero o Falso
En una situación 4v2, lo recomendable es dividirse para cubrir más ángulos.
Respuesta: Falso

4. ¿Qué significa "trade" en un contexto competitivo?
A. Intercambiar una kill propia por una kill enemiga
B. Cambiar de arma con un compañero
C. Intercambiar información entre rondas
D. Vender objetos en la tienda
Respuesta: A

5. Pregunta abierta
Explica por qué es importante el control de economía en Valorant.
```

### Examen de roles (formato lista)

```
Pregunta:
¿Cuál es la función principal de un Iniciador?

Opciones:
- Obtener información y habilitar entradas
- Curar al equipo
- Defender el sitio a distancia
- Flanquear al enemigo

Correcta:
Obtener información y habilitar entradas

Pregunta:
¿Qué agente pertenece a la clase Controlador?

Opciones:
- Jett
- Brimstone
- Skye
- Killjoy

Correcta:
Brimstone
```

### Formato inválido (lo que NO debe aceptar)

**Caso 1: Opciones pegadas**
```
1.¿Qué hace un Duelista?A.Curar B.Crear espacio C.Defender
```
Error: "No se encontraron saltos de línea entre pregunta y opciones.
Las opciones deben estar en líneas separadas."

**Caso 2: Sin separación entre preguntas**
```
1. ¿Qué hace un Duelista? A. Curar B. Crear espacio Respuesta: A 2. ¿Qué significa trade? A. Cambiar B. Intercambiar
```
Error: "Las preguntas deben estar separadas por un salto de línea.
Se encontraron múltiples preguntas en la misma línea."

---

## 16. Resumen de implementación

| Archivo | Función | Lo que hace |
|---------|---------|-------------|
| `parser/types.ts` | Tipos | ParseResult, ParsedQuestion, ParseError |
| `parser/format-numeric.ts` | `parseNumeric(text)` | Parsea formato 1 (numerado) |
| `parser/format-list.ts` | `parseList(text)` | Parsea formato 2 (lista explícita) |
| `parser/format-truefalse.ts` | `parseTrueFalse(text)` | Parsea formato 3 (V/F) |
| `parser/format-open.ts` | `parseOpen(text)` | Parsea formato 4 (abierta) |
| `parser/index.ts` | `parse(text)` | Detecta formato y redirige |
| `parser/sandbox.ts` | `renderSandbox(result)` | UI de vista previa |

**Total estimado: ~400-500 líneas de TypeScript**

El parser no tiene dependencias externas (ni de UI, ni de DB). Es pura lógica de texto.
Se puede construir y probar independientemente del resto de Exams V2.
