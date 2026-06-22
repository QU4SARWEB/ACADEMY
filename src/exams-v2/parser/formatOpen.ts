import type { ParsedQuestion, ParseError, ParseWarning } from '../shared/types'

let tempCounter = 0
function tempId(): string { return `tmp_open_${++tempCounter}_${Date.now()}` }

export function parseOpen(text: string, defaultPoints = 10): { questions: ParsedQuestion[]; errors: ParseError[]; warnings: ParseWarning[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []
  const warnings: ParseWarning[] = []

  let current: { stem: string; points: number; line: number } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip header
    if (/^(pregunta\s+abierta|respuesta\s+larga|open\s*ended|desarrollo)/i.test(line)) {
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

    // Numbered question within open block
    const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/)
    if (qMatch && current) {
      questions.push(makeQuestion(current))
      current = { stem: qMatch[2].trim(), points: defaultPoints, line: i + 1 }
      continue
    }

    if (current) {
      current.stem += ' ' + line
    } else {
      current = { stem: line, points: defaultPoints, line: i + 1 }
    }
  }

  if (current) questions.push(makeQuestion(current))

  return { questions, errors, warnings }
}

function makeQuestion(c: { stem: string; points: number; line: number }): ParsedQuestion {
  return {
    tempId: `tmp_open_${++tempCounter}_${Date.now()}`,
    stem: c.stem.trim(),
    type: 'open_ended',
    options: [],
    points: c.points,
    sourceLine: c.line,
    detectedPoints: false,
    status: 'valid',
    categories: [],
  }
}
