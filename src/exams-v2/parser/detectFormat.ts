export type DetectedFormat = 'numeric' | 'list' | 'truefalse' | 'open' | 'unknown'

export function detectFormat(text: string): DetectedFormat {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return 'unknown'

  const joined = lines.join(' ')

  if (/^(verdadero\s*o\s*falso|true\s*or\s*false)/i.test(joined)) return 'truefalse'

  const openKeywords = /^(pregunta\s+abierta|respuesta\s+larga|open\s*ended|desarrollo)/i
  if (openKeywords.test(joined)) return 'open'

  const hasPreguntaLabel = lines.some(l => /^pregunta:?\s*$/i.test(l.trim()))
  const hasOpcionesLabel = lines.some(l => /^opciones:?\s*$/i.test(l.trim()))
  const hasCorrectaLabel = lines.some(l => /^(respuesta|correcta)\s*:?\s*$/i.test(l.trim()))
  if (hasPreguntaLabel && (hasOpcionesLabel || hasCorrectaLabel)) return 'list'

  const numberedQuestions = lines.filter(l => /^\d+[\.\)]\s/.test(l)).length
  if (numberedQuestions >= 1) return 'numeric'

  return 'unknown'
}
