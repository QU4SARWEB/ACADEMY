import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

function scoreToLetter(s: number): string {
  const r = Math.round(s)
  if (r >= 18) return 'AD'
  if (r >= 14) return 'A'
  if (r >= 11) return 'B'
  if (r >= 5) return 'C'
  return 'D'
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function renderCoachGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachGrades(): Promise<void> {
  try {
    const params = router.getParams()
    const courseId = params.id
    if (!courseId) return

    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).maybeSingle()
    if (!course) { document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'; return }

    const { data: enrollments } = await supabase.from('enrollments').select('id, profile_id, final_grade, profiles(full_name, display_name)').eq('course_id', courseId).eq('status', 'active')
    const enrollIds = (enrollments ?? []).map((e: any) => e.id)

    // Fetch all monthly grades for these enrollments
    const { data: allGrades } = enrollIds.length > 0
      ? await supabase.from('monthly_grades').select('*').in('enrollment_id', enrollIds).order('month', { ascending: true })
      : { data: [] }

    // Index grades by enrollment_id + month
    const gradeMap: Record<string, Record<string, any>> = {}
    for (const g of allGrades ?? []) {
      if (!gradeMap[g.enrollment_id]) gradeMap[g.enrollment_id] = {}
      gradeMap[g.enrollment_id][g.month] = g
    }

    // Get all months that have grades
    const allMonths = [...new Set((allGrades ?? []).map((g: any) => g.month))].sort()

    // Get exam attempts for these enrollments
    const { data: allExams } = enrollIds.length > 0
      ? await supabase.from('exam_attempts').select('score, enrollment_id').in('enrollment_id', enrollIds).not('score', 'is', null)
      : { data: [] }

    // Get task submissions for these enrollments
    const { data: allTasks } = enrollIds.length > 0
      ? await supabase.from('task_submissions').select('score, tasks!inner(max_score), enrollment_id').in('enrollment_id', enrollIds).not('score', 'is', null)
      : { data: [] }

    // Calculate exam avg and task avg per enrollment
    const examAvgByEnroll: Record<string, number> = {}
    for (const e of allExams ?? []) {
      if (!examAvgByEnroll[e.enrollment_id]) examAvgByEnroll[e.enrollment_id] = 0
      examAvgByEnroll[e.enrollment_id] = (examAvgByEnroll[e.enrollment_id] || 0) + Number(e.score)
    }
    for (const eid of Object.keys(examAvgByEnroll)) {
      const count = (allExams ?? []).filter((e: any) => e.enrollment_id === eid).length
      examAvgByEnroll[eid] = (examAvgByEnroll[eid] / count)
    }

    const taskAvgByEnroll: Record<string, number> = {}
    for (const t of allTasks ?? []) {
      const maxScore = (t as any).tasks?.max_score
      if (maxScore && maxScore > 0) {
        if (!taskAvgByEnroll[t.enrollment_id]) taskAvgByEnroll[t.enrollment_id] = 0
        taskAvgByEnroll[t.enrollment_id] = (taskAvgByEnroll[t.enrollment_id] || 0) + (Number(t.score) / Number(maxScore)) * 20
      }
    }
    for (const eid of Object.keys(taskAvgByEnroll)) {
      const count = (allTasks ?? []).filter((t: any) => t.enrollment_id === eid).length
      taskAvgByEnroll[eid] = (taskAvgByEnroll[eid] / count)
    }

    // Pending changes for batch save
    const pendingChanges = new Map<string, { enrollmentId: string; month: string; score: number }>()

    function calcFinal(enrId: string): { score20: number; letter: string; finalGrade: number } {
      const grades = gradeMap[enrId] || {}
      const monthlyScores = Object.values(grades).map((g: any) => Number(g.score))
      const monthlyAvg = monthlyScores.length > 0 ? monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length : 0
      const examAvg = examAvgByEnroll[enrId] || 0
      const taskAvg = taskAvgByEnroll[enrId] || 0
      let score20: number
      if (monthlyScores.length > 0) {
        score20 = (monthlyAvg * 0.6) + (examAvg * 0.2) + (taskAvg * 0.2)
      } else {
        let tw = 0, ts = 0
        if (examAvg > 0) { ts += examAvg * 0.5; tw += 0.5 }
        if (taskAvg > 0) { ts += taskAvg * 0.5; tw += 0.5 }
        score20 = tw > 0 ? ts / tw : 0
      }
      return { score20: Math.round(score20 * 10) / 10, letter: scoreToLetter(score20), finalGrade: Math.round(score20 * 5) }

    }

    function renderTable(): string {
      return `<div class="overflow-x-auto rounded-xl border border-zinc-800">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
              <th class="sticky left-0 z-10 bg-zinc-900/50 px-3 py-3 font-medium min-w-[140px]">Alumno</th>
              ${allMonths.map(m => {
                const [y, mo] = m.split('-')
                const label = MONTHS[parseInt(mo) - 1] || m
                return `<th class="px-2 py-3 font-medium text-center min-w-[80px]">${label}<div class="text-[10px] text-zinc-600">${y}</div></th>`
              }).join('')}
              <th class="px-2 py-3 font-medium text-center min-w-[60px]">Exams</th>
              <th class="px-2 py-3 font-medium text-center min-w-[60px]">Tasks</th>
              <th class="px-2 py-3 font-medium text-center min-w-[60px]">Final</th>
            </tr>
          </thead>
          <tbody>
            ${(enrollments ?? []).length === 0 ? '<tr><td colspan="' + (3 + allMonths.length) + '" class="px-3 py-8 text-center text-zinc-500">No hay estudiantes inscritos.</td></tr>'
              : (enrollments ?? []).map((enr: any) => {
                const name = enr.profiles?.display_name || enr.profiles?.full_name || 'Desconocido'
                const grades = gradeMap[enr.id] || {}
                const result = calcFinal(enr.id)
                return `<tr class="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td class="sticky left-0 z-10 bg-[#0A0A0A] px-3 py-3 text-white text-sm">${escapeHtml(name)}</td>
                  ${allMonths.map(m => {
                    const g = grades[m]
                    const key = `${enr.id}|${m}`
                    const pending = pendingChanges.get(key)
                    const displayScore = pending !== undefined ? pending.score : (g ? Number(g.score) : null)
                    const displayLetter = pending !== undefined ? scoreToLetter(pending.score) : (g ? g.letter : '')
                    return `<td class="px-2 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <input type="number" min="0" max="20" step="0.1" value="${displayScore !== null ? displayScore : ''}"
                          class="month-grade-input w-12 rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]"
                          data-enrollment="${enr.id}" data-month="${m}" data-original="${displayScore !== null ? displayScore : ''}" ${!g && pending === undefined ? 'placeholder="—"' : ''} />
                        <span class="text-[10px] font-medium ${g ? 'text-zinc-400' : 'text-zinc-600'}">${displayLetter}</span>
                      </div>
                    </td>`
                  }).join('')}
                  <td class="px-2 py-3 text-center text-xs text-zinc-400">${examAvgByEnroll[enr.id] !== undefined ? Math.round(examAvgByEnroll[enr.id] * 10) / 10 : '—'}</td>
                  <td class="px-2 py-3 text-center text-xs text-zinc-400">${taskAvgByEnroll[enr.id] !== undefined ? Math.round(taskAvgByEnroll[enr.id] * 10) / 10 : '—'}</td>
                  <td class="px-2 py-3 text-center">
                    <span class="text-sm font-bold ${result.score20 >= 14 ? 'text-green-400' : result.score20 >= 11 ? 'text-yellow-400' : result.score20 >= 5 ? 'text-orange-400' : 'text-red-400'}">${result.score20 > 0 ? result.score20 : '—'}</span>
                    ${result.score20 > 0 ? `<span class="text-[10px] text-zinc-500 ml-1">${result.letter}</span>` : ''}
                  </td>
                </tr>`
              }).join('')}
          </tbody>
        </table>
      </div>`
    }

    const html = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver al curso</a>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-heading text-2xl font-bold text-white">Notas — ${escapeHtml(course.name)}</h1>
            <p class="mt-1 text-sm text-zinc-500">${(enrollments ?? []).length} estudiantes · Nota máxima: 20</p>
          </div>
          <div class="flex gap-2">
            <button id="btn-save-grades" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 14)} Guardar</button>
            <button id="btn-add-month" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">${Icon('plus', 14)} Nuevo mes</button>
          </div>
        </div>
      </div>

      <div id="grades-table-container">${renderTable()}</div>`

    document.getElementById('page-content')!.innerHTML = html

    // Track pending changes on input
    document.getElementById('grades-table-container')!.addEventListener('input', (e) => {
      const input = (e.target as HTMLElement).closest('.month-grade-input') as HTMLInputElement
      if (!input) return
      const enrollmentId = input.dataset.enrollment!
      const month = input.dataset.month!
      const key = `${enrollmentId}|${month}`
      const val = parseFloat(input.value)
      const original = parseFloat(input.dataset.original || '')
      if (input.value === '' || isNaN(val)) {
        pendingChanges.delete(key)
      } else if (val !== original) {
        pendingChanges.set(key, { enrollmentId, month, score: val })
      } else {
        pendingChanges.delete(key)
      }
      // Update letter display
      const letterSpan = input.nextElementSibling
      if (letterSpan && !isNaN(val)) {
        letterSpan.textContent = scoreToLetter(val)
        letterSpan.className = `text-[10px] font-medium ${val >= 14 ? 'text-green-400' : val >= 11 ? 'text-yellow-400' : val >= 5 ? 'text-orange-400' : 'text-red-400'}`
      }
      // Update final for that row
      const tr = input.closest('tr')!
      const finalCell = tr.querySelector('td:last-child')!
      const enrId = enrollmentId
      const result = (window as any).__calcFinal ? (window as any).__calcFinal(enrId) : null
    })

    document.getElementById('btn-add-month')?.addEventListener('click', () => {
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      if (allMonths.includes(monthKey)) { toast('error', 'Este mes ya existe'); return }
      allMonths.push(monthKey)
      allMonths.sort()
      document.getElementById('grades-table-container')!.innerHTML = renderTable()
      document.getElementById('grades-table-container')!.querySelectorAll('.month-grade-input').forEach(inp => {
        inp.addEventListener('input', () => {})
      })
      toast('success', `Mes ${MONTHS[now.getMonth()]} agregado`)
    })

    document.getElementById('btn-save-grades')?.addEventListener('click', async () => {
      if (pendingChanges.size === 0) { toast('info', 'No hay cambios pendientes'); return }
      const btn = document.getElementById('btn-save-grades') as HTMLButtonElement
      btn.disabled = true
      btn.innerHTML = 'Guardando...'
      const { data: { session } } = await supabase.auth.getSession()
      const coachId = session?.user?.id || ''
      let ok = 0, fail = 0
      for (const [, change] of pendingChanges) {
        const score = Math.round(change.score * 10) / 10
        const letter = scoreToLetter(score)
        const { error } = await supabase.from('monthly_grades').upsert({
          enrollment_id: change.enrollmentId,
          month: change.month,
          score,
          letter,
          coach_id: coachId,
        }, { onConflict: 'enrollment_id,month', ignoreDuplicates: false })
        if (error) { console.error('Error saving grade:', error); fail++ }
        else { ok++; await recalcFinalGrade(change.enrollmentId) }
      }
      pendingChanges.clear()
      btn.disabled = false
      btn.innerHTML = `${Icon('save', 14)} Guardar`
      if (fail > 0) toast('warning', `${ok} guardados, ${fail} errores`)
      else toast('success', `${ok} nota${ok !== 1 ? 's' : ''} guardada${ok !== 1 ? 's' : ''}`)
      location.reload()
    })
  } catch (err) {
    console.error('Error loading grades:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}

async function recalcFinalGrade(enrollmentId: string): Promise<void> {
  const { recalcFinalGrade } = await import('@/b3b32a/8abf18/grade_utils')
  await recalcFinalGrade(enrollmentId)
}
