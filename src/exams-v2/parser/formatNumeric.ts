import type { ParsedQuestion, ParseError, ParseWarning } from '../shared/types'

let tempCounter = 0
function tempId(): string { return `tmp_${++tempCounter}_${Date.now()}` }

export function parseNumeric(text: string, defaultPoints = 5): { questions: ParsedQuestion[]; errors: ParseError[]; warnings: ParseWarning[] } {
  const lines = text.split('\n')
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []
  const warnings: ParseWarning[] = []

  let current: Partial<ParsedQuestion> | null = null
  let optionLetters: string[] = []

  function flushCurrent(): void {
    if (!current || !current.stem) return
    if (!current.type) current.type = 'open_ended'
    if ((current.type === 'multiple_choice' || current.type === 'true_false') && (!current.options || current.options.length === 0)) {
      errors.push({ line: current.sourceLine || 0, message: `Pregunta "${current.stem.substring(0, 40)}..." sin opciones`, severity: 'error' })
      current = null
      return
    }
    if (current.type === 'true_false' && current.options && current.options.length === 2) {
      const hasCorrect = current.options.some(o => o.correct)
      if (!hasCorrect) {
        warnings.push({ line: current.sourceLine || 0, message: 'V/F sin respuesta correcta, se asigna Verdadero' })
        current.options[0].correct = true
      }
    }
    questions.push({
      tempId: current.tempId || tempId(),
      stem: current.stem || '',
      type: (current.type as any) || 'multiple_choice',
      options: current.options || [],
      points: current.points ?? defaultPoints,
      sourceLine: current.sourceLine || 0,
      detectedPoints: current.detectedPoints || false,
      status: 'valid',
      categories: current.categories || [],
    })
    current = null
    optionLetters = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (!line.trim()) continue

    const normalized = line.replace(/\s+/g, ' ').trim()

    // Detect points prefix: [Puntos: N] or (N pts) or Puntos: N
    const pointsMatch = normalized.match(/^\[?Puntos?\s*:\s*(\d+(?:\.\d+)?)\]?$/i) || normalized.match(/^\((\d+(?:\.\d+)?)\s*pts?\)$/i)
    if (pointsMatch) {
      if (current) flushCurrent()
      defaultPoints = parseFloat(pointsMatch[1])
      continue
    }

    // Numbered question: "1. Q" or "1) Q"
    const qMatch = normalized.match(/^(\d+)[\.\)]\s*(.+)/)
    if (qMatch) {
      if (current) flushCurrent()
      current = {
        tempId: tempId(),
        stem: qMatch[2].trim(),
        type: 'multiple_choice',
        options: [],
        points: defaultPoints,
        sourceLine: i + 1,
        detectedPoints: false,
        status: 'valid',
        categories: [],
      }
      optionLetters = []
      continue
    }

    // Option: "A) text" or "a. text" or "a) text ✅"
    const optMatch = normalized.match(/^([A-Za-z])[\.\)]\s*(.+?)(?:\s*✅)?\s*$/)
    if (optMatch && current && !/^(respuesta|correcta)/i.test(optMatch[2])) {
      const letter = optMatch[1].toUpperCase()
      const text = optMatch[2].trim()
      const correct = normalized.includes('✅')
      current.options = current.options || []
      current.options.push({ text, correct })
      optionLetters.push(letter)
      continue
    }

    // Answer line: "Respuesta: X" or "Correcta: X"
    const answerMatch = normalized.match(/^(?:Respuesta|Correcta)\s*:\s*([A-Za-z])/i)
    if (answerMatch && current && current.options) {
      const idx = answerMatch[1].toUpperCase().charCodeAt(0) - 65
      if (idx >= 0 && idx < current.options.length) {
        current.options[idx].correct = true
        continue
      }
      warnings.push({ line: i + 1, message: `Respuesta "${answerMatch[1]}" fuera de rango (${current.options.length} opciones)` })
      continue
    }

    // True/false detection within numeric block
    if (/^(verdadero|falso|true|false)$/i.test(normalized.trim())) {
      if (!current) continue
      // This might be part of a stem
      current.stem = (current.stem || '') + ' ' + normalized.trim()
      continue
    }

    // If we have a current question but no match, it's stem continuation or a new unknown block
    if (current) {
      current.stem = (current.stem || '') + ' ' + normalized.trim()
    }
  }

  flushCurrent()

  return { questions, errors, warnings }
}
