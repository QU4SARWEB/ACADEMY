import type { ParseResult, ParsedQuestion } from '../shared/types'
import { detectFormat } from './detectFormat'
import { parseNumeric } from './formatNumeric'
import { parseList } from './formatList'
import { parseTrueFalse } from './formatTrueFalse'
import { parseOpen } from './formatOpen'

export { detectFormat } from './detectFormat'
export type { DetectedFormat } from './detectFormat'

export function parseExamText(text: string): ParseResult {
  const errors: ParseResult['errors'] = []
  const warnings: ParseResult['warnings'] = []
  let questions: ParsedQuestion[] = []

  if (!text.trim()) {
    return { success: false, questions: [], errors: [{ line: 0, message: 'Texto vacío', severity: 'error' }], warnings: [] }
  }

  const format = detectFormat(text)

  try {
    let result: { questions: ParsedQuestion[]; errors: any[]; warnings: any[] }
    switch (format) {
      case 'numeric':
        result = parseNumeric(text)
        break
      case 'list':
        result = parseList(text)
        break
      case 'truefalse':
        result = parseTrueFalse(text)
        break
      case 'open':
        result = parseOpen(text)
        break
      default:
        // Try each formatter in order, pick best result
        const attempts = [
          { name: 'numeric', fn: () => parseNumeric(text) },
          { name: 'list', fn: () => parseList(text) },
          { name: 'truefalse', fn: () => parseTrueFalse(text) },
          { name: 'open', fn: () => parseOpen(text) },
        ]
        let best = { questions: [] as ParsedQuestion[], errors: [] as any[], warnings: [] as any[] }
        for (const attempt of attempts) {
          const r = attempt.fn()
          if (r.questions.length > best.questions.length && r.errors.length === 0) {
            best = r
          }
        }
        result = best
        if (result.questions.length === 0) {
          errors.push({ line: 0, message: 'No se pudo detectar el formato del texto', severity: 'error' })
        }
        break
    }
    questions = result.questions
    result.errors.forEach(e => errors.push(e))
    result.warnings.forEach(w => warnings.push(w))
  } catch (e) {
    errors.push({ line: 0, message: `Error de parseo: ${e instanceof Error ? e.message : 'desconocido'}`, severity: 'error' })
  }

  return {
    success: errors.length === 0 && questions.length > 0,
    questions,
    errors,
    warnings,
  }
}

export function formatQuestionPreview(q: ParsedQuestion): string {
  const typeLabels: Record<string, string> = {
    multiple_choice: 'Opción múltiple',
    multiple_select: 'Selección múltiple',
    true_false: 'Verdadero/Falso',
    short_answer: 'Respuesta corta',
    open_ended: 'Desarrollo',
    tactical_scenario: 'Escenario táctico',
  }
  const correctOpts = q.options.filter(o => o.correct).map(o => o.text)
  const optsHtml = q.options.length > 0
    ? `<div class="mt-1 space-y-0.5">${q.options.map((o, i) => {
        const letter = String.fromCharCode(65 + i)
        const isCorrect = o.correct
        return `<div class="flex items-center gap-2 text-xs ${isCorrect ? 'text-green-400 font-medium' : 'text-zinc-500'}">
          <span class="w-4 text-right shrink-0">${letter}.</span>
          <span>${o.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
          ${isCorrect ? '<span class="text-green-400">&#10003;</span>' : ''}
        </div>`
      }).join('')}</div>`
    : '<div class="mt-1 text-xs text-yellow-400">Sin opciones (respuesta abierta)</div>'

  return `<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 mb-2">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium text-[#8B5CF6]">${typeLabels[q.type] || q.type}</span>
          <span class="text-xs text-zinc-500">${q.points} pts</span>
          ${q.status === 'error' ? '<span class="text-xs text-red-400">Error</span>' : ''}
          ${q.status === 'warning' ? '<span class="text-xs text-yellow-400">Advertencia</span>' : ''}
        </div>
        <p class="text-sm text-white mb-1">${q.stem.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        ${optsHtml}
      </div>
    </div>
  </div>`
}
