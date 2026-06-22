import type { ParsedQuestion, ParseError, ParseWarning } from '../shared/types'

let tempCounter = 0
function tempId(): string { return `tmp_tf_${++tempCounter}_${Date.now()}` }

export function parseTrueFalse(text: string, defaultPoints = 5): { questions: ParsedQuestion[]; errors: ParseError[]; warnings: ParseWarning[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []
  const warnings: ParseWarning[] = []

  let current: { stem: string; answer: string | null; points: number; line: number } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect "Verdadero o Falso" or "True or False" header (skip it)
    if (/^(verdadero\s*o\s*falso|true\s*or\s*false)/i.test(line)) {
      if (current) {
        questions.push(makeQuestion(current))
      }
      current = null
      continue
    }

    // Points
    const pointsMatch = line.match(/^\[?puntos?\s*:\s*(\d+(?:\.\d+)?)\]?$/i) || line.match(/^\((\d+(?:\.\d+)?)\s*pts?\)$/i)
    if (pointsMatch) {
      if (current) {
        current.points = parseFloat(pointsMatch[1])
      } else {
        defaultPoints = parseFloat(pointsMatch[1])
      }
      continue
    }

    // Answer line
    const answerMatch = line.match(/^(?:respuesta|correcta)\s*:\s*(.+)/i)
    if (answerMatch) {
      const ans = answerMatch[1].trim().toLowerCase()
      if (current) {
        if (ans.startsWith('v') || ans.startsWith('t')) current.answer = 'Verdadero'
        else if (ans.startsWith('f')) current.answer = 'Falso'
        else warnings.push({ line: i + 1, message: `Respuesta inválida: "${ans}"` })
      }
      continue
    }

    // Question line
    if (current) {
      current.stem += ' ' + line
    } else {
      current = { stem: line, answer: null, points: defaultPoints, line: i + 1 }
    }
  }

  if (current) questions.push(makeQuestion(current))

  return { questions, errors, warnings }
}

function makeQuestion(c: { stem: string; answer: string | null; points: number; line: number }): ParsedQuestion {
  return {
    tempId: `tmp_tf_${++tempCounter}_${Date.now()}`,
    stem: c.stem.trim(),
    type: 'true_false',
    options: [
      { text: 'Verdadero', correct: c.answer === 'Verdadero' },
      { text: 'Falso', correct: c.answer === 'Falso' },
    ],
    points: c.points,
    sourceLine: c.line,
    detectedPoints: false,
    status: 'valid',
    categories: [],
  }
}
