import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachExams(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

type Exam = Record<string, any>
type Question = Record<string, any>

interface TempQuestion {
  id: string
  type: 'multiple' | 'truefalse' | 'detail'
  question_text: string
  options: string[]
  correct_answer: string
  points: number
}

const QUESTION_ICONS: Record<string, string> = {
  multiple: 'clipboardList',
  true_false: 'checkCircle',
  truefalse: 'checkCircle',
  detail: 'fileText',
}

export async function initCoachExams(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id

    const assignedIds = await getAssignedCourseIds(coachId)
    let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery
    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: examData } = await supabase
      .from('exams')
      .select('id, course_id, title, description, week_number, is_final, is_recovery, published, created_at')
      .in('course_id', idFilter)
      .not('title', 'ilike', '%practico%')
      .order('created_at', { ascending: false })

    const courseFilter = new URLSearchParams(location.hash.split('?')[1] || '').get('course')
    const exams = courseFilter ? (examData ?? []).filter((exam: any) => exam.course_id === courseFilter) : (examData ?? [])
    const examIds = exams.map((e: any) => e.id)
    const examFilter = examIds.length > 0 ? examIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: questions }, { data: results }] = await Promise.all([
      supabase.from('exam_questions').select('*').in('exam_id', examFilter).order('order_index'),
      supabase.from('exam_results').select('exam_id, student_id, total_score, status').in('exam_id', examFilter),
    ])

    const questionsByExam: Record<string, any[]> = {}
    for (const q of questions ?? []) {
      if (!questionsByExam[q.exam_id]) questionsByExam[q.exam_id] = []
      questionsByExam[q.exam_id].push(q)
    }

    const resultsByExam: Record<string, any[]> = {}
    for (const r of results ?? []) {
      if (!resultsByExam[r.exam_id]) resultsByExam[r.exam_id] = []
      resultsByExam[r.exam_id].push(r)
    }

    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('course_id, profile_id')
      .in('course_id', idFilter)
      .eq('status', 'active')

    const enrollCountByCourse: Record<string, Set<string>> = {}
    for (const e of enrolls ?? []) {
      if (!enrollCountByCourse[e.course_id]) enrollCountByCourse[e.course_id] = new Set()
      enrollCountByCourse[e.course_id].add(e.profile_id)
    }

    const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

    // Week navigation
    const allWeeks = [...new Set((exams ?? []).map((e: any) => e.week_number).filter(Boolean))].sort()
    const savedWeek = sessionStorage.getItem('examWeek')
    let currentWeek: number | null = savedWeek ? parseInt(savedWeek) : (allWeeks.length > 0 ? allWeeks[0] : null)

    const weekFilterHtml = allWeeks.map((w: number) => `
      <button class="week-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
        ${w === currentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}"
        data-week="${w}">
        ${Icon('calendar', 12)}
        <span>Semana ${w}</span>
      </button>
    `).join('')

    const filteredExams = currentWeek ? (exams ?? []).filter((e: any) => e.week_number === currentWeek) : (exams ?? [])

    const filterHtml = (courses ?? []).map((c: any) => {
      const examCount = filteredExams.filter((e: any) => e.course_id === c.id).length
      return `
      <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
        bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
        <span class="text-zinc-500">${examCount}</span>
      </button>`
    }).join('')

    const examCards = filteredExams.length === 0
      ? '<div class="col-span-full py-12 text-center text-sm text-zinc-500">No hay exámenes creados. Crea tu primer examen.</div>'
      : filteredExams.map((e: any) => {
          const course = courseMap.get(e.course_id)
          const qs = questionsByExam[e.id] || []
          const totalPoints = qs.reduce((sum: number, q: any) => sum + (q.points || 0), 0)
          const examResults = resultsByExam[e.id] || []
          const completedCount = examResults.filter((r: any) => r.status === 'graded').length
          const enrolledCount = enrollCountByCourse[e.course_id]?.size || 0
          return `
          <div class="exam-card rounded-xl border border-zinc-800 bg-[#111] p-5 hover:border-zinc-700 transition"
            data-exam-id="${escapeHtml(e.id)}" data-course-id="${escapeHtml(e.course_id)}">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-white truncate">${escapeHtml(e.title)}</h3>
                <p class="text-xs text-zinc-500 mt-1">${escapeHtml(course?.name || 'Desconocido')} · Semana ${escapeHtml(String(e.week_number))}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 ml-2">
                ${e.is_final ? `<span class="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">${Icon('trophy', 10)} Final</span>` : ''}
                ${e.is_recovery ? `<span class="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">${Icon('refreshCw', 10)} Recuperación</span>` : ''}
                <span class="rounded px-2 py-0.5 text-[10px] font-medium ${e.published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${e.published ? 'Publicado' : 'Borrador'}</span>
              </div>
            </div>
            ${e.description ? `<p class="text-xs text-zinc-400 mb-3 line-clamp-2">${escapeHtml(e.description)}</p>` : ''}
            <div class="flex items-center gap-4 text-xs text-zinc-500 mb-3">
              <span class="flex items-center gap-1">${Icon('helpCircle', 12)} ${qs.length} preguntas</span>
              <span class="flex items-center gap-1">${Icon('target', 12)} ${totalPoints} pts</span>
              <span class="flex items-center gap-1">${Icon('users', 12)} ${completedCount}/${enrolledCount} completados</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="publish-exam-btn flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[10px] font-medium transition ${e.published ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'}" data-exam-id="${escapeHtml(e.id)}" data-published="${e.published ? '1' : '0'}">
                ${e.published ? Icon('pause', 11) : Icon('play', 11)} ${e.published ? 'Despublicar' : 'Publicar'}
              </button>
              <button class="edit-exam-btn flex items-center gap-1.5 rounded bg-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700 transition" data-exam-id="${escapeHtml(e.id)}">
                ${Icon('edit', 11)} Editar
              </button>
              <button class="view-results-btn flex items-center gap-1.5 rounded bg-[#8B5CF6]/15 px-2.5 py-1.5 text-[10px] font-medium text-[#8B5CF6] hover:bg-[#8B5CF6]/25 transition" data-exam-id="${escapeHtml(e.id)}">
                ${Icon('eye', 11)} Ver resultados
              </button>
              <button class="delete-exam-btn ml-auto flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] text-zinc-600 hover:text-red-400 transition" data-exam-id="${escapeHtml(e.id)}" title="Eliminar examen">
                ${Icon('trash', 11)}
              </button>
            </div>
          </div>`
        }).join('')

    const html = `
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="kicker">Evaluaciones teóricas</span>
          <h1 class="font-heading text-2xl font-bold text-white">Exámenes</h1>
          <p class="mt-1 text-sm text-zinc-500">Gestiona los exámenes de tus cursos.</p>
        </div>
        <button id="btn-new-exam" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo examen</button>
      </div>
      <div id="exam-form-container" class="hidden mb-6"></div>
      ${allWeeks.length > 1 ? `
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-zinc-500 mr-1">Semana:</span>
        <button class="week-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300" data-week="all">
          ${Icon('calendar', 12)} Todas
        </button>
        ${weekFilterHtml}
      </div>` : ''}
      <div class="mb-4 flex flex-wrap items-center gap-2" id="course-filters">${filterHtml}</div>
      <div id="exam-list" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${examCards}</div>`

    document.getElementById('page-content')!.innerHTML = html
    bindExamEvents(courses ?? [], coachId)
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}

function bindExamEvents(courses: any[], coachId: string): void {
  // Week filter
  document.querySelectorAll('.week-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = (btn as HTMLElement).dataset.week
      if (week === 'all') {
        sessionStorage.removeItem('examWeek')
      } else {
        sessionStorage.setItem('examWeek', week!)
      }
      initCoachExams()
    })
  })

  initCourseFilters()
  document.getElementById('btn-new-exam')?.addEventListener('click', () => {
    const container = document.getElementById('exam-form-container')!
    container.classList.toggle('hidden')
    if (!container.classList.contains('hidden')) {
      container.innerHTML = renderExamCreateForm(courses)
      bindExamFormEvents(container, coachId)
    }
  })

  document.querySelectorAll('.publish-exam-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const el = btn as HTMLElement
      const examId = el.dataset.examId
      const published = el.dataset.published === '1'
      if (!examId) return
      const { error } = await supabase.from('exams').update({ published: !published }).eq('id', examId)
      if (error) { toast('error', error.message); return }
      toast('success', published ? 'Examen despublicado' : 'Examen publicado')
      initCoachExams()
    })
  })

  document.querySelectorAll('.edit-exam-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const examId = (btn as HTMLElement).dataset.examId
      if (!examId) return
      const container = document.getElementById('exam-form-container')!
      document.getElementById('exam-list')?.classList.add('hidden')
      container.classList.remove('hidden')
      container.innerHTML = Spinner()

      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).maybeSingle()
      if (!exam) { toast('error', 'Examen no encontrado'); return }

      const { data: questionsData } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('order_index')
      const currentQuestions: TempQuestion[] = (questionsData ?? []).map((q: any) => ({
        id: q.id,
        type: q.type,
        question_text: q.question,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        points: q.points || 0,
      }))

      container.innerHTML = renderExamCreateForm(courses, exam, currentQuestions)
      bindExamFormEvents(container, coachId, examId, currentQuestions)
    })
  })

  document.querySelectorAll('.view-results-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const examId = (btn as HTMLElement).dataset.examId
      if (!examId) return
      openExamResultsModal(examId)
    })
  })

  document.querySelectorAll('.delete-exam-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const examId = (btn as HTMLElement).dataset.examId
      if (!examId || !(await confirmDialog('¿Eliminar este examen? También se eliminarán todas las preguntas y resultados asociados.'))) return
      const { error } = await supabase.from('exams').delete().eq('id', examId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Examen eliminado')
      initCoachExams()
    })
  })
}

function initCourseFilters(): void {
  const activeFilters = new Set<string>()
  document.querySelectorAll('.course-filter-btn').forEach(btn => {
    const cid = (btn as HTMLElement).dataset.courseId
    if (cid) activeFilters.add(cid)
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement
      const courseId = el.dataset.courseId
      const active = el.dataset.active === '1'
      if (active) activeFilters.delete(courseId!)
      else activeFilters.add(courseId!)
      el.dataset.active = active ? '0' : '1'
      el.classList.toggle('bg-[#8B5CF6]/15', !active)
      el.classList.toggle('text-[#8B5CF6]', !active)
      el.classList.toggle('border-[#8B5CF6]/30', !active)
      el.classList.toggle('bg-zinc-800/40', active)
      el.classList.toggle('text-zinc-500', active)
      el.classList.toggle('border-dashed', active)
      el.innerHTML = active
        ? `${Icon('plus', 12)} <span>${escapeHtml(el.dataset.courseName || '')}</span> <span class="text-zinc-500">${el.dataset.courseCount || ''}</span>`
        : `${Icon('checkCircle', 14)} <span>${escapeHtml(el.dataset.courseName || '')}</span> <span class="text-zinc-500">${el.dataset.courseCount || ''}</span>`

      document.querySelectorAll<HTMLElement>('.exam-card').forEach(card => {
        const cid2 = card.dataset.courseId
        card.classList.toggle('hidden', !!cid2 && !activeFilters.has(cid2))
      })
    })
  })
}

function renderExamCreateForm(courses: any[], editExam?: any, currentQuestions?: TempQuestion[]): string {
  const isEdit = !!editExam
  const questions = currentQuestions || []
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const remaining = 20 - totalPoints

  return `
    <div class="glass rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-medium text-white">${isEdit ? 'Editar examen' : 'Nuevo examen'}</h3>
        <button type="button" id="btn-close-exam-form" class="text-zinc-500 hover:text-white">${Icon('x', 16)}</button>
      </div>
      <form id="exam-create-form" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Curso</label>
            <select name="courseId" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              ${courses.map((c: any) => `<option value="${escapeHtml(c.id)}" ${editExam?.course_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">N° de semana</label>
            <input type="number" name="weekNumber" min="1" max="52" value="${escapeHtml(editExam?.week_number || '')}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-400">Título</label>
            <input type="text" name="title" value="${escapeHtml(editExam?.title || '')}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-400">Descripción</label>
            <textarea name="description" rows="2" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(editExam?.description || '')}</textarea>
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isFinal" ${editExam?.is_final ? 'checked' : ''} class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
              <span class="text-sm text-zinc-400">${Icon('trophy', 14)} Examen final</span>
            </label>
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isRecovery" ${editExam?.is_recovery ? 'checked' : ''} class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
              <span class="text-sm text-zinc-400">${Icon('refreshCw', 14)} Recuperación</span>
            </label>
          </div>
          ${isEdit ? `<div class="sm:col-span-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="published" ${editExam?.published ? 'checked' : ''} class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
              <span class="text-sm text-zinc-400">Publicado</span>
            </label>
          </div>` : ''}
        </div>

        <div id="exam-questions-section" class="border-t border-zinc-700/50 pt-3 mt-3">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-medium text-zinc-300">${Icon('helpCircle', 12)} Preguntas</h4>
            <div class="flex items-center gap-2">
              <span id="points-indicator" class="text-xs ${remaining === 0 ? 'text-green-400' : remaining < 0 ? 'text-red-400' : 'text-yellow-400'}">
                ${remaining === 0 ? '✓ 20/20 puntos' : remaining < 0 ? `Excede por ${Math.abs(remaining)} pts` : `Faltan ${remaining} puntos`}
              </span>
            </div>
          </div>
          <div id="questions-list" class="space-y-2 mb-3">
            ${questions.length === 0 ? '<p class="text-xs text-zinc-600 text-center py-2">No hay preguntas agregadas.</p>' : ''}
            ${questions.map((q, i) => renderQuestionItem(q, i)).join('')}
          </div>
          <div class="flex gap-2 mb-3">
            <button type="button" id="btn-add-question" class="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-3 py-2 text-xs text-zinc-400 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition flex-1 justify-center">
              ${Icon('plus', 12)} Agregar pregunta
            </button>
            <button type="button" id="btn-bulk-upload" class="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-3 py-2 text-xs text-zinc-400 hover:border-green-500 hover:text-green-400 transition flex-1 justify-center">
              ${Icon('upload', 12)} Subir examen completo
            </button>
          </div>
          <div id="bulk-upload-panel" class="hidden mb-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3"></div>
          <div id="add-question-panel" class="hidden mt-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3"></div>
        </div>

        <p id="exam-form-error" class="hidden text-xs text-red-400"></p>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${isEdit ? 'Guardar cambios' : 'Crear examen'}</button>
          <button type="button" id="btn-cancel-exam" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        </div>
      </form>
    </div>`
}

function renderQuestionItem(q: TempQuestion, index: number): string {
  const typeNames: Record<string, string> = { multiple: 'M\u00faltiple', true_false: 'Verdadero/Falso', truefalse: 'Verdadero/Falso', detail: 'Detalle' }
  return `
    <div class="question-item flex items-start gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/30 px-3 py-2" data-qid="${escapeHtml(q.id)}">
      <span class="text-xs text-zinc-500 mt-0.5 shrink-0 w-5">${index + 1}.</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-white truncate">${escapeHtml(q.question_text || 'Sin texto')}</p>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-[10px] text-zinc-500">${Icon(QUESTION_ICONS[q.type] || 'helpCircle', 10)} ${typeNames[q.type] || q.type}</span>
          <span class="text-[10px] font-medium text-[#8B5CF6]">${q.points} pts</span>
        </div>
      </div>
      <button type="button" class="remove-question-btn text-zinc-600 hover:text-red-400 transition shrink-0" data-qid="${escapeHtml(q.id)}">${Icon('trash', 12)}</button>
    </div>`
}

function renderAddQuestionPanel(): string {
  return `
    <div class="space-y-2">
      <div>
        <label class="mb-1 block text-xs text-zinc-400">Tipo de pregunta</label>
        <select id="question-type-select" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
          <option value="multiple">Múltiple elección</option>
          <option value="truefalse">Verdadero / Falso</option>
          <option value="detail">Detalle</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs text-zinc-400">Texto de la pregunta</label>
        <textarea id="question-text-input" rows="2" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
      </div>
      <div id="question-options-area">
        <label class="mb-1 block text-xs text-zinc-400">Opciones</label>
        <div class="space-y-1.5">
          ${['A', 'B', 'C', 'D'].map((letter, idx) => `
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-500 w-4 shrink-0">${letter}</span>
              <input type="text" class="question-option-input flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" data-option="${letter}" placeholder="Opción ${letter}" />
              <input type="radio" name="correct-option" value="${letter}" class="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-[#8B5CF6]" title="Correcta" />
            </div>
          `).join('')}
        </div>
      </div>
      <div id="question-truefalse-area" class="hidden">
        <label class="mb-1 block text-xs text-zinc-400">Respuesta correcta</label>
        <div class="flex gap-3">
          <label class="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
            <input type="radio" name="truefalse-answer" value="true" class="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-green-500" checked /> Verdadero
          </label>
          <label class="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
            <input type="radio" name="truefalse-answer" value="false" class="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-red-500" /> Falso
          </label>
        </div>
      </div>
      <div id="question-detail-area" class="hidden">
        <p class="text-xs text-zinc-500">Esta pregunta se calificará manualmente.</p>
      </div>
      <div>
        <label class="mb-1 block text-xs text-zinc-400">Puntos (1-20)</label>
        <input type="number" id="question-points-input" min="1" max="20" value="5" class="w-24 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
      </div>
      <p id="question-add-error" class="hidden text-xs text-red-400"></p>
      <div class="flex gap-2 pt-1">
        <button type="button" id="btn-confirm-question" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 11)} Agregar pregunta</button>
        <button type="button" id="btn-cancel-question" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
      </div>
    </div>`
}

function bindExamFormEvents(container: HTMLElement, coachId: string, editId?: string, existingQuestions?: TempQuestion[]): void {
  const tempQuestions: TempQuestion[] = existingQuestions ? [...existingQuestions] : []
  let tempIdCounter = tempQuestions.length

  document.getElementById('btn-close-exam-form')?.addEventListener('click', () => {
    container.classList.add('hidden')
    document.getElementById('exam-list')?.classList.remove('hidden')
  })
  document.getElementById('btn-cancel-exam')?.addEventListener('click', () => {
    container.classList.add('hidden')
    document.getElementById('exam-list')?.classList.remove('hidden')
  })

  function renderQuestionsList(): void {
    const listEl = document.getElementById('questions-list')
    if (!listEl) return
    const total = tempQuestions.reduce((s, q) => s + q.points, 0)
    const remaining = 20 - total
    const indicator = document.getElementById('points-indicator')
    if (indicator) {
      indicator.textContent = remaining === 0 ? '✓ 20/20 puntos' : remaining < 0 ? `Excede por ${Math.abs(remaining)} pts` : `Faltan ${remaining} puntos`
      indicator.className = `text-xs ${remaining === 0 ? 'text-green-400' : remaining < 0 ? 'text-red-400' : 'text-yellow-400'}`
    }
    if (tempQuestions.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-zinc-600 text-center py-2">No hay preguntas agregadas.</p>'
    } else {
      listEl.innerHTML = tempQuestions.map((q, i) => renderQuestionItem(q, i)).join('')
    }
    listEl.querySelectorAll('.remove-question-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = (btn as HTMLElement).dataset.qid
        const idx = tempQuestions.findIndex(q => q.id === qid)
        if (idx !== -1) {
          tempQuestions.splice(idx, 1)
          renderQuestionsList()
        }
      })
    })
  }

  document.getElementById('btn-add-question')?.addEventListener('click', () => {
    const panel = document.getElementById('add-question-panel')!
    const bulkPanel = document.getElementById('bulk-upload-panel')!
    bulkPanel.classList.add('hidden')
    panel.classList.toggle('hidden')
    if (!panel.classList.contains('hidden')) {
      panel.innerHTML = renderAddQuestionPanel()
      bindQuestionPanelEvents(panel, tempQuestions, () => renderQuestionsList(), tempIdCounter)
    }
  })

  document.getElementById('btn-bulk-upload')?.addEventListener('click', () => {
    const bulkPanel = document.getElementById('bulk-upload-panel')!
    const panel = document.getElementById('add-question-panel')!
    panel.classList.add('hidden')
    bulkPanel.classList.toggle('hidden')
    if (!bulkPanel.classList.contains('hidden')) {
      bulkPanel.innerHTML = renderBulkUploadPanel()
      bindBulkUploadEvents(bulkPanel, tempQuestions, () => renderQuestionsList(), tempIdCounter)
    }
  })

  document.getElementById('exam-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const courseId = fd.get('courseId') as string
    const title = fd.get('title') as string
    const description = fd.get('description') as string
    const weekNumber = parseInt(fd.get('weekNumber') as string, 10)
    const isFinal = fd.get('isFinal') === 'on'
    const isRecovery = fd.get('isRecovery') === 'on'
    const published = fd.get('published') === 'on'

    const errorEl = document.getElementById('exam-form-error')!
    if (!courseId || !title || !weekNumber) {
      errorEl.textContent = 'Completa todos los campos obligatorios'
      errorEl.classList.remove('hidden')
      return
    }

    if (tempQuestions.length === 0) {
      errorEl.textContent = 'Debes agregar al menos una pregunta'
      errorEl.classList.remove('hidden')
      return
    }

    const totalPoints = tempQuestions.reduce((s, q) => s + q.points, 0)
    if (totalPoints !== 20) {
      errorEl.textContent = `La suma de puntos debe ser exactamente 20 (actual: ${totalPoints})`
      errorEl.classList.remove('hidden')
      return
    }

    const submitBtn = document.querySelector<HTMLButtonElement>('#exam-create-form button[type="submit"]')!
    submitBtn.disabled = true
    submitBtn.textContent = 'Guardando...'

    let examId = editId
    const payload: any = { course_id: courseId, title, description: description || '', week_number: weekNumber, is_final: isFinal, is_recovery: isRecovery }
    if (editId) payload.published = published

    if (editId) {
      const { error } = await supabase.from('exams').update(payload).eq('id', editId)
      if (error) { toast('error', error.message); submitBtn.disabled = false; submitBtn.textContent = 'Guardar cambios'; return }
    } else {
      payload.published = false
      const { data, error } = await supabase.from('exams').insert(payload).select().maybeSingle()
      if (error) { toast('error', error.message); submitBtn.disabled = false; submitBtn.textContent = 'Crear examen'; return }
      examId = data?.id
    }

    if (examId && existingQuestions) {
      const existingIds = new Set(existingQuestions.map(q => q.id))
      const incomingIds = new Set(tempQuestions.map(q => q.id))
      const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
      if (toDelete.length > 0) {
        await supabase.from('exam_questions').delete().in('id', toDelete)
      }
    }

    if (examId) {
      const newQuestions = tempQuestions.filter(q => q.id.startsWith('temp_'))
      if (newQuestions.length > 0) {
        const inserts = newQuestions.map((q, i) => ({
          exam_id: examId,
          type: q.type,
          question: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: i + 1,
        }))
        const { error } = await supabase.from('exam_questions').insert(inserts)
        if (error) { toast('error', error.message); submitBtn.disabled = false; submitBtn.textContent = editId ? 'Guardar cambios' : 'Crear examen'; return }
      }

      const updatedQuestions = tempQuestions.filter(q => !q.id.startsWith('temp_'))
      if (updatedQuestions.length > 0) {
        for (const q of updatedQuestions) {
          await supabase.from('exam_questions').update({
            type: q.type,
            question: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            points: q.points,
          }).eq('id', q.id)
        }
      }
    }

    submitBtn.disabled = false
    toast('success', editId ? 'Examen actualizado' : 'Examen creado')
    container.classList.add('hidden')
    document.getElementById('exam-list')?.classList.remove('hidden')
    initCoachExams()
  })
}

function bindQuestionPanelEvents(panel: HTMLElement, tempQuestions: TempQuestion[], onUpdate: () => void, idCounter: number): void {
  const typeSelect = document.getElementById('question-type-select') as HTMLSelectElement
  const optionsArea = document.getElementById('question-options-area')
  const tfArea = document.getElementById('question-truefalse-area')
  const detailArea = document.getElementById('question-detail-area')

  function updateQuestionType(): void {
    const val = typeSelect.value
    optionsArea?.classList.toggle('hidden', val !== 'multiple')
    tfArea?.classList.toggle('hidden', val !== 'truefalse')
    detailArea?.classList.toggle('hidden', val !== 'detail')
  }

  typeSelect?.addEventListener('change', updateQuestionType)
  updateQuestionType()

  document.getElementById('btn-cancel-question')?.addEventListener('click', () => {
    panel.classList.add('hidden')
  })

  document.getElementById('btn-confirm-question')?.addEventListener('click', () => {
    const errorEl = document.getElementById('question-add-error')!
    errorEl.classList.add('hidden')

    const type = (document.getElementById('question-type-select') as HTMLSelectElement)?.value || 'multiple'
    const questionText = (document.getElementById('question-text-input') as HTMLTextAreaElement)?.value?.trim()
    const points = parseInt((document.getElementById('question-points-input') as HTMLInputElement)?.value || '0', 10)

    if (!questionText) {
      errorEl.textContent = 'El texto de la pregunta es obligatorio'
      errorEl.classList.remove('hidden')
      return
    }

    if (isNaN(points) || points < 1 || points > 20) {
      errorEl.textContent = 'Los puntos deben estar entre 1 y 20'
      errorEl.classList.remove('hidden')
      return
    }

    const currentTotal = tempQuestions.reduce((s, q) => s + q.points, 0)
    if (currentTotal + points > 20) {
      errorEl.textContent = `Solo quedan ${20 - currentTotal} puntos disponibles`
      errorEl.classList.remove('hidden')
      return
    }

    let options: string[] = []
    let correctAnswer = ''

    if (type === 'multiple') {
      const optionInputs = document.querySelectorAll<HTMLInputElement>('.question-option-input')
      const correctRadio = document.querySelector<HTMLInputElement>('input[name="correct-option"]:checked')
      options = []
      let hasError = false
      optionInputs.forEach(input => {
        const val = input.value.trim()
        if (!val) hasError = true
        options.push(val)
      })
      if (hasError) {
        errorEl.textContent = 'Completa todas las opciones'
        errorEl.classList.remove('hidden')
        return
      }
      if (!correctRadio) {
        errorEl.textContent = 'Selecciona la opción correcta'
        errorEl.classList.remove('hidden')
        return
      }
      correctAnswer = correctRadio.value
    } else if (type === 'truefalse') {
      const tfRadio = document.querySelector<HTMLInputElement>('input[name="truefalse-answer"]:checked')
      if (!tfRadio) {
        errorEl.textContent = 'Selecciona la respuesta correcta'
        errorEl.classList.remove('hidden')
        return
      }
      correctAnswer = tfRadio.value
    }

    const newId = `temp_${++idCounter}`
    tempQuestions.push({ id: newId, type: type as any, question_text: questionText, options, correct_answer: correctAnswer, points })

    ;(document.getElementById('question-text-input') as HTMLTextAreaElement).value = ''
    ;(document.getElementById('question-points-input') as HTMLInputElement).value = '5'
    document.querySelectorAll<HTMLInputElement>('.question-option-input').forEach(inp => inp.value = '')
    document.querySelectorAll<HTMLInputElement>('input[name="correct-option"]').forEach(r => r.checked = false)
    document.querySelector<HTMLInputElement>('input[name="truefalse-answer"][value="true"]')!.checked = true

    panel.classList.add('hidden')
    onUpdate()
  })
}

function parseExamText(raw: string): { type: 'multiple' | 'detail'; question_text: string; options: string[]; correct_answer: string }[] {
  const cleaned = raw.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim()
  const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim().length > 0)
  const results: { type: 'multiple' | 'detail'; question_text: string; options: string[]; correct_answer: string }[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) continue

    const optionPattern = /^([A-Da-d])[\)\.\:\-]\s*(.+?)-?\s*$/
    const optionLines: { letter: string; text: string; isCorrect: boolean }[] = []
    let questionLines: string[] = []

    for (const line of lines) {
      const match = line.match(/^([A-Da-d])[\)\.\:\-]\s*(.+)/)
      if (match) {
        const letter = match[1].toUpperCase()
        let text = match[2].trim()
        const isCorrect = text.endsWith('-')
        if (isCorrect) text = text.slice(0, -1).trimEnd()
        optionLines.push({ letter, text, isCorrect })
      } else {
        questionLines.push(line)
      }
    }

    const questionText = questionLines.join(' ').replace(/\s+/g, ' ').trim()

    if (optionLines.length >= 2) {
      const options = optionLines.map(o => o.text)
      const correctIdx = optionLines.findIndex(o => o.isCorrect)
      const correctAnswer = correctIdx >= 0 ? optionLines[correctIdx].letter : ''
      results.push({
        type: 'multiple',
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
      })
    } else {
      results.push({
        type: 'detail',
        question_text: questionText,
        options: [],
        correct_answer: '',
      })
    }
  }

  return results
}

function renderBulkUploadPanel(): string {
  return `
    <div class="space-y-3">
      <div>
        <label class="mb-1 block text-xs text-zinc-400">Pega el examen completo</label>
        <textarea id="bulk-exam-text" rows="12" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] font-mono text-[13px] leading-relaxed" placeholder="¿Cuál es el principal objetivo de un buen posicionamiento?
A) Buscar siempre el primer enfrentamiento-
B) Maximizar las posibilidades de ganar
C) Permanecer siempre detrás del equipo
D) Mantenerse en movimiento constantemente

¿Qué es un trade kill?

¿Por qué es importante evitar que varios jugadores estén expuestos al mismo ángulo?"></textarea>
      </div>
      <div class="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
        <p class="text-[11px] text-zinc-500 mb-2"><span class="text-zinc-400 font-medium">Formato:</span> Separa cada pregunta con una línea en blanco.</p>
        <ul class="text-[11px] text-zinc-500 space-y-1">
          <li>• <span class="text-green-400">Múltiple elección</span>: Pregunta + opciones A) B) C) D)</li>
          <li>• <span class="text-yellow-400">Respuesta correcta</span>: Agrega <code class="bg-zinc-700 px-1 rounded">-</code> al final de la opción (ej: <code class="bg-zinc-700 px-1 rounded">A) Opción correcta-</code>)</li>
          <li>• <span class="text-blue-400">Pregunta abierta</span>: Solo la pregunta (sin opciones)</li>
        </ul>
      </div>
      <p id="bulk-upload-error" class="hidden text-xs text-red-400"></p>
      <div id="bulk-preview" class="hidden space-y-2"></div>
      <div class="flex gap-2 pt-1">
        <button type="button" id="btn-parse-exam" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('eye', 11)} Vista previa</button>
        <button type="button" id="btn-confirm-bulk" class="hidden rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">${Icon('check', 11)} Agregar todas</button>
        <button type="button" id="btn-cancel-bulk" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
      </div>
    </div>`
}

function bindBulkUploadEvents(panel: HTMLElement, tempQuestions: TempQuestion[], onUpdate: () => void, idCounter: number): void {
  let parsedQuestions: { type: 'multiple' | 'detail'; question_text: string; options: string[]; correct_answer: string }[] = []

  document.getElementById('btn-cancel-bulk')?.addEventListener('click', () => panel.classList.add('hidden'))

  document.getElementById('btn-parse-exam')?.addEventListener('click', () => {
    const textarea = document.getElementById('bulk-exam-text') as HTMLTextAreaElement
    const errorEl = document.getElementById('bulk-upload-error')!
    const previewEl = document.getElementById('bulk-preview')!
    const confirmBtn = document.getElementById('btn-confirm-bulk')!

    errorEl.classList.add('hidden')
    previewEl.classList.add('hidden')
    confirmBtn.classList.add('hidden')

    const raw = textarea.value.trim()
    if (!raw) {
      errorEl.textContent = 'Pega el texto del examen'
      errorEl.classList.remove('hidden')
      return
    }

    parsedQuestions = parseExamText(raw)
    if (parsedQuestions.length === 0) {
      errorEl.textContent = 'No se detectaron preguntas. Revisa el formato.'
      errorEl.classList.remove('hidden')
      return
    }

    let previewHtml = `<p class="text-xs text-zinc-400 mb-2">Se detectaron <span class="text-white font-medium">${parsedQuestions.length}</span> preguntas:</p>`

    const mcCount = parsedQuestions.filter(q => q.type === 'multiple').length
    const detailCount = parsedQuestions.filter(q => q.type === 'detail').length
    previewHtml += `<div class="flex gap-3 mb-3">
      ${mcCount > 0 ? `<span class="text-[11px] text-green-400">${mcCount} múltiple${mcCount > 1 ? 's' : ''}</span>` : ''}
      ${detailCount > 0 ? `<span class="text-[11px] text-blue-400">${detailCount} abierta${detailCount > 1 ? 's' : ''}</span>` : ''}
    </div>`

    previewHtml += '<div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">'
    parsedQuestions.forEach((q, i) => {
      const isMc = q.type === 'multiple'
      const typeBadge = isMc
        ? '<span class="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">Múltiple</span>'
        : '<span class="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">Abierta</span>'
      const optionsHtml = isMc ? q.options.map((opt, j) => {
        const letter = String.fromCharCode(65 + j)
        const isCorrect = q.correct_answer === letter
        return `<span class="text-[10px] ${isCorrect ? 'text-green-400 font-medium' : 'text-zinc-500'}">${letter}) ${escapeHtml(opt)}${isCorrect ? ' ✓' : ''}</span>`
      }).join(' &nbsp;·&nbsp; ') : ''
      previewHtml += `
        <div class="rounded-lg border border-zinc-700/50 bg-zinc-900/30 px-3 py-2">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs text-zinc-500 shrink-0">${i + 1}.</span>
            ${typeBadge}
          </div>
          <p class="text-xs text-white ml-5">${escapeHtml(q.question_text)}</p>
          ${optionsHtml ? `<div class="ml-5 mt-1 space-x-2">${optionsHtml}</div>` : ''}
        </div>`
    })
    previewHtml += '</div>'

    previewEl.innerHTML = previewHtml
    previewEl.classList.remove('hidden')
    confirmBtn.classList.remove('hidden')
  })

  document.getElementById('btn-confirm-bulk')?.addEventListener('click', () => {
    if (parsedQuestions.length === 0) return

    const pointsPerQuestion = Math.floor(20 / parsedQuestions.length)
    const remainder = 20 - (pointsPerQuestion * parsedQuestions.length)

    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i]
      const points = i === 0 ? pointsPerQuestion + remainder : pointsPerQuestion
      const newId = `temp_${++idCounter}`
      tempQuestions.push({
        id: newId,
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        points,
      })
    }

    toast('success', `${parsedQuestions.length} preguntas agregadas`)
    panel.classList.add('hidden')
    onUpdate()
  })
}

async function openExamResultsModal(examId: string): Promise<void> {
  const existing = document.getElementById('exam-results-modal')
  if (existing) existing.remove()

  const div = document.createElement('div')
  div.id = 'exam-results-modal'
  div.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onclick="if(event.target===this)document.getElementById('exam-results-modal')?.remove()">
      <div class="glass max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 id="results-modal-title" class="font-heading text-lg font-bold text-white">Resultados del examen</h2>
          <button id="close-results-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
        </div>
        <div id="results-modal-body">${Spinner()}</div>
      </div>
    </div>`
  document.body.appendChild(div)

  document.getElementById('close-results-modal')?.addEventListener('click', () => div.remove())

  const { data: exam } = await supabase.from('exams').select('*, courses!inner(name)').eq('id', examId).maybeSingle()
  if (!exam) {
    document.getElementById('results-modal-body')!.innerHTML = '<p class="text-sm text-red-400">Examen no encontrado</p>'
    return
  }

  document.getElementById('results-modal-title')!.textContent = `${exam.title} - ${exam.courses?.name || ''}`

  const { data: rawQuestions } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('order_index')
  const questions = (rawQuestions ?? []).map((q: any) => ({ ...q, question_text: q.question }))
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('profile_id, profiles!inner(full_name, email, avatar_url, riot_id, platform)')
    .eq('course_id', exam.course_id)
    .eq('status', 'active')

  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_id', examId)

  const { data: allAnswers } = await supabase
    .from('exam_answers')
    .select('*')
    .eq('exam_id', examId)

  const answersByStudent: Record<string, any[]> = {}
  for (const a of allAnswers ?? []) {
    if (!answersByStudent[a.student_id]) answersByStudent[a.student_id] = []
    answersByStudent[a.student_id].push(a)
  }

  const resultsByStudent: Record<string, any> = {}
  for (const r of results ?? []) {
    r.exam_answers = answersByStudent[r.student_id] || []
    resultsByStudent[r.student_id] = r
  }

  const statusIcons: Record<string, string> = {
    pending: '<span class="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400"><span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>Pendiente</span>',
    in_progress: '<span class="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-400"><span class="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>En progreso</span>',
    reviewing: '<span class="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs text-orange-400"><span class="h-1.5 w-1.5 rounded-full bg-orange-400"></span>En revisión</span>',
    graded: '<span class="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs text-green-400"><span class="h-1.5 w-1.5 rounded-full bg-green-400"></span>Calificado</span>',
  }

  const rows = (enrollments ?? []).length === 0
    ? '<tr><td colspan="5" class="py-8 text-center text-sm text-zinc-500">No hay estudiantes inscritos.</td></tr>'
    : (enrollments ?? []).map((e: any) => {
        const studentId = e.profile_id
        const name = e.profiles?.full_name || e.profiles?.riot_id || 'Desconocido'
        const platformBadge = e.profiles?.platform === 'mobile'
          ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
          : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
        const result = resultsByStudent[studentId]
        let status: string
        let score: string
        if (!result) {
          status = statusIcons.pending
          score = '—'
        } else if (!result.submitted_at) {
          status = statusIcons.in_progress
          score = '—'
        } else if (result.status === 'graded') {
          status = statusIcons.graded
          score = `${result.total_score ?? '?'}/20`
        } else {
          const answers = (result.exam_answers || []) as any[]
          const gradedCount = answers.filter((a: any) => a.graded).length
          if (gradedCount > 0 && gradedCount < (questions ?? []).length) {
            status = statusIcons.reviewing
          } else {
            status = statusIcons.in_progress
          }
          score = '—'
        }
        return `
        <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30 cursor-pointer student-result-row" data-student-id="${escapeHtml(studentId)}" data-exam-id="${escapeHtml(examId)}">
          <td class="py-3 px-3 text-sm text-white">${escapeHtml(name)}</td>
          <td class="py-3 px-3">${platformBadge}</td>
          <td class="py-3 px-3">${status}</td>
          <td class="py-3 px-3 text-sm text-zinc-300">${score}</td>
        </tr>`
      }).join('')

  document.getElementById('results-modal-body')!.innerHTML = `
    <div class="flex items-center gap-3 mb-4 text-xs text-zinc-400">
      <span>${Icon('helpCircle', 12)} ${(questions ?? []).length} preguntas</span>
      <span>${Icon('target', 12)} ${totalPoints} pts</span>
      <span>${Icon('users', 12)} ${(enrollments ?? []).length} estudiantes</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="text-zinc-500 text-xs uppercase border-b border-zinc-800">
            <th class="py-2.5 px-3 font-medium">Estudiante</th>
            <th class="py-2.5 px-3 font-medium">Plataforma</th>
            <th class="py-2.5 px-3 font-medium">Estado</th>
            <th class="py-2.5 px-3 font-medium">Nota</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  document.querySelectorAll('.student-result-row').forEach(row => {
    row.addEventListener('click', () => {
      const studentId = (row as HTMLElement).dataset.studentId
      if (!studentId) return
      openGradeStudentModal(examId, studentId, exam, questions ?? [])
    })
  })
}

async function openGradeStudentModal(examId: string, studentId: string, exam: any, questions: any[]): Promise<void> {
  const existing = document.getElementById('grade-student-modal')
  if (existing) existing.remove()

  const { data: profile } = await supabase.from('profiles').select('full_name, riot_id').eq('id', studentId).maybeSingle()
  const name = profile?.full_name || profile?.riot_id || 'Estudiante'

  let { data: result } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle()

  // Fetch answers separately (no FK relationship)
  let { data: studentAnswers } = await supabase
    .from('exam_answers')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)

  if (result) {
    result.exam_answers = studentAnswers || []
  }

  if (!result) {
    const { data: newResult } = await supabase
      .from('exam_results')
      .insert({ exam_id: examId, student_id: studentId })
      .select('*')
      .maybeSingle()
    result = newResult || null
    if (result) result.exam_answers = []
    if (!result) { toast('error', 'Error al iniciar la revisión'); return }
  }

  if (!result.submitted_at) {
    await supabase.from('exam_results').update({ submitted_at: new Date().toISOString() }).eq('id', result.id)
    result.submitted_at = new Date().toISOString()
  }

  const answersByQuestion: Record<string, any> = {}
  for (const a of (result.exam_answers || []) as any[]) {
    answersByQuestion[a.question_id] = a
  }

  const typeNames: Record<string, string> = { multiple: 'Múltiple', truefalse: 'V/F', detail: 'Detalle' }

  const div = document.createElement('div')
  div.id = 'grade-student-modal'
  div.innerHTML = `
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onclick="if(event.target===this)document.getElementById('grade-student-modal')?.remove()">
      <div class="glass max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-heading text-lg font-bold text-white">${escapeHtml(name)}</h2>
            <p class="text-xs text-zinc-500 mt-0.5">${escapeHtml(exam.title)}</p>
          </div>
          <button id="close-grade-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
        </div>
        <div id="grade-modal-body" class="space-y-4">
          ${(questions ?? []).map((q: any, i: number) => {
            const answer = answersByQuestion[q.id]
            const studentAnswer = answer?.answer || ''
            const isGraded = answer?.graded || false
            const score = answer?.score ?? null
            let answerHtml = ''
            let gradeInput = ''

            if (q.type === 'multiple') {
              const options: string[] = q.options || []
              const correctIdx = q.correct_answer
              const correctLetter = String.fromCharCode(65 + (parseInt(correctIdx) || 0))
              const isCorrect = studentAnswer === correctLetter || studentAnswer === q.correct_answer
              answerHtml = `
                <div class="space-y-1 mt-2">
                  ${options.map((opt: string, oi: number) => {
                    const letter = String.fromCharCode(65 + oi)
                    const isAns = studentAnswer === letter || studentAnswer === String(oi)
                    const isCorr = (q.correct_answer === letter || q.correct_answer === String(oi))
                    let cls = 'border-zinc-700 bg-zinc-900/50'
                    if (isAns && isCorr) cls = 'border-green-500/50 bg-green-500/10'
                    else if (isAns) cls = 'border-red-500/50 bg-red-500/10'
                    else if (isCorr) cls = 'border-green-500/30 bg-green-500/5'
                    return `<div class="flex items-center gap-2 rounded border ${cls} px-3 py-1.5 text-xs">
                      <span class="text-zinc-500 w-4">${letter}</span>
                      <span class="flex-1 text-zinc-300">${escapeHtml(opt)}</span>
                      ${isAns ? (isCorr ? Icon('checkCircle', 12) : Icon('xCircle', 12)) : ''}
                      ${!isAns && isCorr ? Icon('checkCircle', 12) : ''}
                    </div>`
                  }).join('')}
                </div>
                <div class="mt-1 text-xs ${isCorrect ? 'text-green-400' : 'text-red-400'}">
                  ${isCorrect ? '✓ Correcto' : '✗ Incorrecto'} · ${q.points} pts
                </div>`
            } else if (q.type === 'truefalse') {
              const isCorrect = studentAnswer === q.correct_answer
              answerHtml = `
                <div class="flex gap-3 mt-2">
                  <div class="flex items-center gap-1.5 rounded border ${studentAnswer === 'true' ? (isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10') : q.correct_answer === 'true' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-700'} px-3 py-1.5 text-xs">
                    <span class="text-zinc-400">V</span>
                    ${studentAnswer === 'true' ? (isCorrect ? Icon('checkCircle', 12) : Icon('xCircle', 12)) : ''}
                    ${q.correct_answer === 'true' && studentAnswer !== 'true' ? Icon('checkCircle', 12) : ''}
                  </div>
                  <div class="flex items-center gap-1.5 rounded border ${studentAnswer === 'false' ? (isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10') : q.correct_answer === 'false' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-700'} px-3 py-1.5 text-xs">
                    <span class="text-zinc-400">F</span>
                    ${studentAnswer === 'false' ? (isCorrect ? Icon('checkCircle', 12) : Icon('xCircle', 12)) : ''}
                    ${q.correct_answer === 'false' && studentAnswer !== 'false' ? Icon('checkCircle', 12) : ''}
                  </div>
                </div>
                <div class="mt-1 text-xs ${isCorrect ? 'text-green-400' : 'text-red-400'}">
                  ${isCorrect ? '✓ Correcto' : '✗ Incorrecto'} · ${q.points} pts
                </div>`
            } else {
              answerHtml = `
                <div class="mt-2">
                  <label class="text-xs text-zinc-400">Respuesta del estudiante:</label>
                  <div class="mt-1 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-white">${escapeHtml(studentAnswer) || '<span class="text-zinc-600">Sin respuesta</span>'}</div>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <label class="text-xs text-zinc-400">Puntaje (0-${q.points}):</label>
                  <input type="number" class="detail-score-input w-20 rounded-lg border ${isGraded ? 'border-green-500/40' : 'border-zinc-700'} bg-[#0A0A0A] px-2 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" min="0" max="${q.points}" step="0.5" value="${score !== null ? score : ''}" data-question-id="${escapeHtml(q.id)}" ${isGraded ? 'disabled' : ''} />
                  <span class="text-[10px] text-zinc-600">/ ${q.points}</span>
                  ${isGraded ? '<span class="text-[10px] text-green-400">Guardado</span>' : ''}
                </div>`
            }

            return `
            <div class="question-grade-item rounded-lg border border-zinc-800 bg-zinc-900/30 p-4" data-question-id="${escapeHtml(q.id)}">
              <div class="flex items-start gap-2">
                <span class="text-xs text-zinc-500 mt-0.5 shrink-0">${i + 1}.</span>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] text-zinc-500">${Icon(QUESTION_ICONS[q.type] || 'helpCircle', 10)} ${typeNames[q.type] || q.type}</span>
                    <span class="text-[10px] text-[#8B5CF6]">${q.points} pts</span>
                    ${isGraded ? '<span class="text-[10px] text-green-400">✓ Calificado</span>' : ''}
                  </div>
                  <p class="text-sm text-white">${escapeHtml(q.question_text)}</p>
                  ${answerHtml}
                </div>
              </div>
            </div>`
          }).join('')}
        </div>

        <div id="grade-total" class="mt-4 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3">
          <span class="text-sm text-zinc-300">Total</span>
          <span id="grade-total-score" class="text-lg font-bold text-white">0 / ${(questions ?? []).reduce((s, q) => s + (q.points || 0), 0)}</span>
        </div>

        <div class="mt-4 flex gap-2">
          <button id="btn-save-grade" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 12)} Guardar calificación</button>
          <button id="btn-close-grade" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cerrar</button>
        </div>
      </div>
    </div>`
  document.body.appendChild(div)

  document.getElementById('close-grade-modal')?.addEventListener('click', () => div.remove())
  document.getElementById('btn-close-grade')?.addEventListener('click', () => div.remove())
  div.addEventListener('click', (e) => { if (e.target === e.currentTarget) div.remove() })

  function updateTotal(): void {
    const questionsList = questions ?? []
    const maxTotal = questionsList.reduce((s, q) => s + (q.points || 0), 0)
    let total = 0
    let allGraded = true

    questionsList.forEach((q: any) => {
      const answer = answersByQuestion[q.id]
      if (q.type === 'detail') {
        const input = document.querySelector<HTMLInputElement>(`.detail-score-input[data-question-id="${escapeHtml(q.id)}"]`)
        if (input && input.value !== '' && !isNaN(parseFloat(input.value))) {
          total += parseFloat(input.value)
        } else if (!answer?.graded) {
          allGraded = false
        }
        if (answer?.graded) {
          total += (answer?.score || 0)
        }
      } else if (q.type === 'multiple' || q.type === 'truefalse') {
        if (answer?.graded || answer?.score !== null) {
          total += (answer?.score || 0)
        } else {
          allGraded = false
        }
      }
    })

    document.getElementById('grade-total-score')!.textContent = `${total.toFixed(1)} / ${maxTotal}`
  }

  document.querySelectorAll('.detail-score-input').forEach(input => {
    input.addEventListener('input', updateTotal)
  })

  setTimeout(updateTotal, 100)

  document.getElementById('btn-save-grade')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-grade') as HTMLButtonElement
    btn.disabled = true
    btn.textContent = 'Guardando...'

    try {
      let totalScore = 0
      let allGraded = true

      for (const q of questions ?? []) {
        let answer = answersByQuestion[q.id]
        if (!answer) {
          const { data: newAns } = await supabase.from('exam_answers').insert({
            exam_id: examId,
            question_id: q.id,
            student_id: studentId,
            answer: '',
          }).select().maybeSingle()
          answer = newAns
          if (answer) answersByQuestion[q.id] = answer
        }

        if (q.type === 'multiple' || q.type === 'truefalse') {
          const studentAnswer = answer?.answer || ''
          const isCorrect = studentAnswer === (q.type === 'multiple' && /^[A-D]$/.test(q.correct_answer) ? q.correct_answer : q.correct_answer) ||
                           (q.type === 'multiple' && /^\d$/.test(q.correct_answer) ? String.fromCharCode(65 + parseInt(q.correct_answer)) === studentAnswer : false)
          const correct = q.type === 'multiple'
            ? (q.correct_answer === studentAnswer || String.fromCharCode(65 + (parseInt(q.correct_answer) || 0)) === studentAnswer)
            : q.correct_answer === studentAnswer
          const autoScore = correct ? q.points : 0
          totalScore += autoScore
          if (!answer?.graded) {
            await supabase.from('exam_answers').update({ score: autoScore, graded: true }).eq('id', answer.id)
          } else {
            totalScore += (answer?.score || autoScore)
          }
        } else {
          const input = document.querySelector<HTMLInputElement>(`.detail-score-input[data-question-id="${escapeHtml(q.id)}"]`)
          if (input && !input.disabled) {
            const val = parseFloat(input.value)
            if (!isNaN(val) && val >= 0 && val <= q.points) {
              totalScore += val
              await supabase.from('exam_answers').update({ score: val, graded: true }).eq('id', answer.id)
            } else if (input.value !== '' && input.value !== '0') {
              toast('error', `Puntaje inválido para la pregunta ${q.question_text?.slice(0, 30)}`)
              btn.disabled = false
              btn.innerHTML = `${Icon('save', 12)} Guardar calificación`
              return
            } else {
              allGraded = false
            }
          } else if (answer?.graded) {
            totalScore += (answer?.score || 0)
          } else {
            allGraded = false
          }
        }
      }

      if (!allGraded) {
        toast('warning', 'No todas las preguntas de detalle tienen puntaje asignado')
      }

      await supabase.from('exam_results').update({
        total_score: totalScore,
        graded: allGraded,
      }).eq('id', result.id)

      toast('success', 'Calificación guardada')
      div.remove()
      openExamResultsModal(examId)
    } catch (err: any) {
      toast('error', err?.message || 'Error al guardar')
      btn.disabled = false
      btn.innerHTML = `${Icon('save', 12)} Guardar calificación`
    }
  })
}
