import { supabase } from '@/304244'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Icon } from '@/2b3583/bd2119'
import { renderQuestionBank, renderQuestionCard } from './render'
import { fetchQuestions, deleteQuestion, bulkDeleteQuestions } from './manager'
import { Spinner } from '@/4725dc/a14fa2'
import type { BankQuestion } from '../shared/types'

export { renderQuestionBank } from './render'
export { fetchQuestions, deleteQuestion, bulkDeleteQuestions } from './manager'

let currentPage = 1
let currentTotal = 0
let currentFilters: any = {}
let selectedIds: Set<string> = new Set()
let questions: BankQuestion[] = []

export async function initQuestionBank(): Promise<void> {
  currentPage = 1
  selectedIds = new Set()
  questions = []

  document.getElementById('bank-filter-btn')?.addEventListener('click', () => loadQuestions(1))
  document.getElementById('bank-clear-btn')?.addEventListener('click', () => {
    const search = document.getElementById('bank-search') as HTMLInputElement
    const type = document.getElementById('bank-type') as HTMLSelectElement
    const difficulty = document.getElementById('bank-difficulty') as HTMLSelectElement
    const category = document.getElementById('bank-category') as HTMLSelectElement
    if (search) search.value = ''
    if (type) type.value = ''
    if (difficulty) difficulty.value = ''
    if (category) category.value = ''
    loadQuestions(1)
  })

  document.getElementById('bank-search')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') loadQuestions(1)
  })

  document.getElementById('bank-bulk-delete')?.addEventListener('click', async () => {
    if (selectedIds.size === 0) return
    const confirmed = await confirmDialog(`¿Eliminar ${selectedIds.size} preguntas?`)
    if (!confirmed) return
    const ok = await bulkDeleteQuestions([...selectedIds])
    if (ok) {
      selectedIds.clear()
      updateBulkBar()
      loadQuestions(currentPage)
    }
  })

  document.getElementById('bank-bulk-clear')?.addEventListener('click', () => {
    selectedIds.clear()
    updateBulkBar()
    renderQuestionsList()
  })

  await loadQuestions(1)
}

async function loadQuestions(page: number): Promise<void> {
  const list = document.getElementById('bank-questions-list')
  if (!list) return
  list.innerHTML = Spinner()

  currentPage = page
  const search = (document.getElementById('bank-search') as HTMLInputElement)?.value || ''
  const type = (document.getElementById('bank-type') as HTMLSelectElement)?.value || ''
  const difficulty = (document.getElementById('bank-difficulty') as HTMLSelectElement)?.value || ''
  const category = (document.getElementById('bank-category') as HTMLSelectElement)?.value || ''

  currentFilters = { search, type, difficulty: difficulty ? parseInt(difficulty) : undefined, category }

  const result = await fetchQuestions({ ...currentFilters, page, pageSize: 20 })
  questions = result.data
  currentTotal = result.total

  document.getElementById('bank-total')!.textContent = `${currentTotal} preguntas`
  renderQuestionsList()
  renderPagination()
}

function renderQuestionsList(): void {
  const list = document.getElementById('bank-questions-list')
  if (!list) return

  if (questions.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center gap-3 py-12"><p class="text-sm text-zinc-500">No se encontraron preguntas</p><p class="text-xs text-zinc-600">Creá preguntas desde la página de exámenes de un curso</p></div>'
    return
  }

  list.innerHTML = questions.map(q => renderQuestionCard(q, selectedIds.has(q.id))).join('')

  // Wire up events
  list.querySelectorAll('.bank-q-select').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const card = (e.currentTarget as HTMLElement).closest('.bank-question') as HTMLElement
      const id = card?.dataset.qId
      if (!id) return
      if ((e.currentTarget as HTMLInputElement).checked) {
        selectedIds.add(id)
      } else {
        selectedIds.delete(id)
      }
      updateBulkBar()
    })
  })

  list.querySelectorAll('.bank-q-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = (btn as HTMLElement).closest('.bank-question') as HTMLElement
      const id = card?.dataset.qId
      if (!id) return
      const confirmed = await confirmDialog('¿Eliminar esta pregunta?')
      if (!confirmed) return
      const ok = await deleteQuestion(id)
      if (ok) loadQuestions(currentPage)
    })
  })

  list.querySelectorAll('.bank-q-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = (btn as HTMLElement).closest('.bank-question') as HTMLElement
      const id = card?.dataset.qId
      if (!id) return
      questionsModal(id)
    })
  })
}

function renderPagination(): void {
  const container = document.getElementById('bank-pagination')
  if (!container) return
  const totalPages = Math.ceil(currentTotal / 20)
  if (totalPages <= 1) { container.innerHTML = ''; return }

  let html = ''
  html += `<button class="bank-page-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" data-page="${currentPage - 1}">${Icon('chevronLeft', 12)}</button>`

  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="bank-page-btn rounded-lg px-3 py-1.5 text-xs ${i === currentPage ? 'bg-[#8B5CF6] text-white' : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'}" data-page="${i}">${i}</button>`
  }

  html += `<button class="bank-page-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}" data-page="${currentPage + 1}">${Icon('chevronRight', 12)}</button>`

  container.innerHTML = html
  container.querySelectorAll('.bank-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt((btn as HTMLElement).dataset.page || '1')
      if (page >= 1 && page <= totalPages) loadQuestions(page)
    })
  })
}

function updateBulkBar(): void {
  const bar = document.getElementById('bank-bulk-bar')
  const count = document.getElementById('bank-selected-count')
  if (!bar || !count) return
  if (selectedIds.size > 0) {
    bar.classList.remove('hidden')
    bar.classList.add('flex')
    count.textContent = `${selectedIds.size} seleccionadas`
  } else {
    bar.classList.add('hidden')
    bar.classList.remove('flex')
  }
}

async function questionsModal(questionId: string): Promise<void> {
  const { data: q } = await supabase.from('questions').select('*, question_options(*)').eq('id', questionId).maybeSingle()
  if (!q) { toast('error', 'Pregunta no encontrada'); return }

  // For now, show a simple edit prompt
  const newStem = prompt('Editar pregunta:', q.stem || '')
  if (newStem && newStem !== q.stem) {
    const { error } = await supabase.from('questions').update({ stem: newStem }).eq('id', questionId)
    if (error) toast('error', error.message)
    else { toast('success', 'Pregunta actualizada'); loadQuestions(currentPage) }
  }
}
