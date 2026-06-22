import type { ParsedQuestion, ParseError, ParseWarning } from '../shared/types'

let tempCounter = 0
function tempId(): string { return `tmp_list_${++tempCounter}_${Date.now()}` }

export function parseList(text: string, defaultPoints = 5): { questions: ParsedQuestion[]; errors: ParseError[]; warnings: ParseWarning[] } {
  const blocks = text.split(/(?=Pregunta:?\s*)/i).filter(b => b.trim())
  const questions: ParsedQuestion[] = []
  const errors: ParseError[] = []
  const warnings: ParseWarning[] = []

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi].trim()
    if (!block) continue

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    let stem = ''
    let options: { text: string; correct: boolean }[] = []
    let type: string = 'multiple_choice'
    let points = defaultPoints
    let inOptions = false
    let inCorrect = false
    let correctText = ''
    let lineNum = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (/^pregunta:?\s*$/i.test(line)) { inOptions = false; inCorrect = false; continue }
      if (/^opciones:?\s*$/i.test(line)) { inOptions = true; inCorrect = false; continue }
      if (/^(respuesta|correcta)\s*:?\s*$/i.test(line)) { inOptions = false; inCorrect = true; continue }

      if (/^\[?puntos?\s*:?\s*(\d+(?:\.\d+)?)\]?$/i.test(line) || /^\((\d+(?:\.\d+)?)\s*pts?\)$/i.test(line)) {
        const m = line.match(/(\d+(?:\.\d+)?)/)
        if (m) points = parseFloat(m[1])
        continue
      }

      if (inOptions) {
        const optText = line.replace(/^[-*•]\s*/, '').trim()
        options.push({ text: optText, correct: false })
      } else if (inCorrect) {
        correctText = line.trim()
      } else {
        if (stem) stem += ' '
        stem += line
      }
    }

    if (!stem) {
      errors.push({ line: lineNum, message: 'Bloque sin pregunta', severity: 'error' })
      continue
    }

    // Match correct text to options
    if (correctText) {
      const idx = options.findIndex(o =>
        o.text.toLowerCase().trim() === correctText.toLowerCase().trim()
      )
      if (idx >= 0) {
        options[idx].correct = true
      } else {
        // Try matching by option letter
        const letterMatch = correctText.match(/^([A-Za-z])[\.\)]/)
        if (letterMatch) {
          const letterIdx = letterMatch[1].toUpperCase().charCodeAt(0) - 65
          if (letterIdx >= 0 && letterIdx < options.length) {
            options[letterIdx].correct = true
          }
        } else {
          warnings.push({ line: lineNum, message: `Correcta "${correctText}" no coincide con ninguna opción` })
          if (options.length > 0) options[0].correct = true
        }
      }
    } else {
      warnings.push({ line: lineNum, message: 'Sin respuesta correcta detectada' })
    }

    if (options.length === 0) {
      type = 'open_ended'
    }

    // Detect true/false
    if (stem.toLowerCase().includes('verdadero') && stem.toLowerCase().includes('falso') && options.length === 0) {
      type = 'true_false'
      options = [
        { text: 'Verdadero', correct: correctText.toLowerCase() === 'verdadero' },
        { text: 'Falso', correct: correctText.toLowerCase() === 'falso' },
      ]
    }

    questions.push({
      tempId: tempId(),
      stem: stem.trim(),
      type: type as any,
      options,
      points,
      sourceLine: lineNum,
      detectedPoints: points !== defaultPoints,
      status: errors.length > 0 ? 'error' : 'valid',
      categories: [],
    })
  }

  return { questions, errors, warnings }
}
