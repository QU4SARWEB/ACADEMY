import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Spinner } from '@/4725dc/a14fa2'
import { QUESTION_CATEGORIES, getCategoryColor, getCategoryLabel } from '../shared/types'
import type { BankQuestion } from '../shared/types'

export function renderQuestionBank(): string {
  return `
    <div class="mx-auto max-w-6xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="font-heading text-2xl font-bold text-white">Banco de Preguntas</h1>
        <div class="flex items-center gap-3">
          <span id="bank-total" class="text-sm text-zinc-500">0 preguntas</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-6 glass rounded-xl p-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[200px]">
            <label class="mb-1 block text-xs text-zinc-400">Buscar</label>
            <input id="bank-search" type="text" placeholder="Buscar por texto..."
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
          </div>
          <div class="w-40">
            <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
            <select id="bank-type"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Todos</option>
              <option value="multiple_choice">Opción múltiple</option>
              <option value="true_false">Verdadero/Falso</option>
              <option value="short_answer">Respuesta corta</option>
              <option value="open_ended">Desarrollo</option>
            </select>
          </div>
          <div class="w-40">
            <label class="mb-1 block text-xs text-zinc-400">Dificultad</label>
            <select id="bank-difficulty"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Todas</option>
              <option value="1">★</option>
              <option value="2">★★</option>
              <option value="3">★★★</option>
              <option value="4">★★★★</option>
              <option value="5">★★★★★</option>
            </select>
          </div>
          <div class="w-44">
            <label class="mb-1 block text-xs text-zinc-400">Categoría</label>
            <select id="bank-category"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Todas</option>
              ${QUESTION_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
            </select>
          </div>
          <button id="bank-filter-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            ${Icon('filter', 14)} Filtrar
          </button>
          <button id="bank-clear-btn" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800">
            Limpiar
          </button>
        </div>
      </div>

      <!-- Bulk actions -->
      <div id="bank-bulk-bar" class="mb-4 hidden flex items-center gap-3 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-3">
        <span id="bank-selected-count" class="text-sm text-zinc-300">0 seleccionadas</span>
        <button id="bank-bulk-delete" class="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-700">Eliminar seleccionadas</button>
        <button id="bank-bulk-clear" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">Cancelar</button>
      </div>

      <!-- Question list -->
      <div id="bank-questions-list" class="space-y-2">
        ${Spinner()}
      </div>

      <!-- Pagination -->
      <div id="bank-pagination" class="mt-6 flex items-center justify-center gap-2"></div>
    </div>`
}

export function renderQuestionCard(q: BankQuestion, selected = false): string {
  const typeLabels: Record<string, string> = {
    multiple_choice: 'Opción múltiple',
    true_false: 'V/F',
    short_answer: 'Corta',
    open_ended: 'Desarrollo',
  }

  const categories = (q.categories || []).map(c => {
    const cat = QUESTION_CATEGORIES.find(x => x.id === c)
    return cat || { id: c, label: c, color: '#8B5CF6' }
  })

  const difficultyStars = '★'.repeat(q.difficulty || 1) + '☆'.repeat(5 - (q.difficulty || 1))

  return `
    <div class="bank-question glass rounded-xl p-4 transition hover:border-zinc-600 ${selected ? 'border-[#8B5CF6] ring-1 ring-[#8B5CF6]/30' : 'border-zinc-800'}"
         data-q-id="${escapeHtml(q.id)}">
      <div class="flex items-start gap-3">
        <label class="mt-1 flex-shrink-0">
          <input type="checkbox" class="bank-q-select h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none" ${selected ? 'checked' : ''}>
        </label>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="rounded bg-[#8B5CF6]/20 px-2 py-0.5 text-xs font-medium text-[#8B5CF6]">${typeLabels[q.type] || q.type}</span>
            <span class="text-xs text-zinc-500">${difficultyStars}</span>
            <span class="text-xs text-zinc-500">${q.points} pts</span>
            ${q.course_name ? `<span class="text-xs text-zinc-500">${escapeHtml(q.course_name)}</span>` : ''}
            ${categories.map(c => `<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background:${c.color}20;color:${c.color}">${c.label}</span>`).join('')}
          </div>
          <p class="text-sm text-white">${escapeHtml(q.stem)}</p>
          ${q.options.length > 0 ? `
            <div class="mt-2 space-y-0.5">
              ${q.options.map((o, i) => `
                <div class="flex items-center gap-2 text-xs ${o.is_correct ? 'text-green-400 font-medium' : 'text-zinc-500'}">
                  <span class="w-4 text-right shrink-0">${String.fromCharCode(65 + i)}.</span>
                  <span>${escapeHtml(o.text)}</span>
                  ${o.is_correct ? '<span class="text-green-400">&#10003;</span>' : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${q.explanation ? `<p class="mt-2 text-xs text-zinc-500 italic">${escapeHtml(q.explanation)}</p>` : ''}
        </div>
        <div class="flex flex-col gap-1 flex-shrink-0">
          <button class="bank-q-edit rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">${Icon('edit', 12)}</button>
          <button class="bank-q-delete rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-900/30">${Icon('trash', 12)}</button>
        </div>
      </div>
    </div>`
}
