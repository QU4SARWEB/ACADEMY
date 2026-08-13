import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { getAssignedCourseIds } from '@/2b3583/assignments'
import {
  GRADE_WEIGHTS,
  buildRawScores,
  hasPendingRecovery,
  computeComponents,
  weightedFinal,
  gradeStatus,
} from '@/2b3583/grades_utils'

export function renderCoachGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Aprobado', cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
  recovery: { label: 'Recuperación', cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  failed: { label: 'Reprobado', cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
  none: { label: 'Sin notas', cls: 'text-zinc-400 border-zinc-700/50 bg-zinc-800/30' },
}

interface PlanillaState {
  courses: any[]
  schedulesByCourse: Record<string, any[]>
  studentsByCourse: Record<string, any[]>
  gradesByKey: Map<string, any>
  refsByCourse: Map<string, { scheduleIds: string[]; tasks: any[]; exams: any[] }>
  minPassByCourse: Map<string, number>
  classGrades: any[]
  submissions: any[]
  results: any[]
  coachId: string
}

let planilla: PlanillaState | null = null

export async function initCoachGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id

    const assignedIds = await getAssignedCourseIds(coachId)
    let coursesQuery = supabase.from('courses').select('id, name, min_pass_grade').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('id, course_id, title, schedule_date, start_time')
      .in('course_id', idFilter)
      .order('schedule_date', { ascending: true })

    const schedulesByCourse: Record<string, any[]> = {}
    for (const s of allSchedules ?? []) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = []
      schedulesByCourse[s.course_id].push(s)
    }

    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('id, profile_id, course_id, profiles(full_name, platform)')
      .in('course_id', idFilter)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    const studentsByCourse: Record<string, any[]> = {}
    for (const e of enrolls ?? []) {
      if (!studentsByCourse[e.course_id]) studentsByCourse[e.course_id] = []
      studentsByCourse[e.course_id].push(e)
    }

    const allScheduleIds = (allSchedules ?? []).map((s: any) => s.id)
    const schedFilter = allScheduleIds.length > 0 ? allScheduleIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: allClassGrades }, { data: allTasks }, { data: allExams }] = await Promise.all([
      supabase.from('class_grades').select('*').in('schedule_id', schedFilter),
      supabase.from('course_tasks').select('id, course_id, is_recovery').in('course_id', idFilter),
      supabase.from('exams').select('id, course_id, is_final, is_recovery').in('course_id', idFilter),
    ])

    const taskIds = (allTasks ?? []).map((t: any) => t.id)
    const taskIdFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']
    const examIds = (allExams ?? []).map((x: any) => x.id)
    const examIdFilter = examIds.length > 0 ? examIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: allSubmissions }, { data: allResults }] = await Promise.all([
      supabase.from('task_submissions').select('task_id, student_id, score').in('task_id', taskIdFilter),
      supabase.from('exam_results').select('exam_id, student_id, total_score, status').in('exam_id', examIdFilter),
    ])

    const gradesByKey = new Map<string, any>()
    for (const g of allClassGrades ?? []) gradesByKey.set(g.schedule_id + '_' + g.student_id, g)

    const refsByCourse = new Map<string, { scheduleIds: string[]; tasks: any[]; exams: any[] }>()
    const minPassByCourse = new Map<string, number>()
    for (const c of courses ?? []) {
      const schedIds = (schedulesByCourse[c.id] || []).map((s: any) => s.id)
      refsByCourse.set(c.id, {
        scheduleIds: schedIds,
        tasks: (allTasks ?? []).filter((t: any) => t.course_id === c.id).map((t: any) => ({ id: t.id, is_recovery: !!t.is_recovery })),
        exams: (allExams ?? []).filter((x: any) => x.course_id === c.id).map((x: any) => ({ id: x.id, is_final: !!x.is_final, is_recovery: !!x.is_recovery })),
      })
      minPassByCourse.set(c.id, c.min_pass_grade ?? 14)
    }

    planilla = {
      courses: courses ?? [],
      schedulesByCourse,
      studentsByCourse,
      gradesByKey,
      refsByCourse,
      minPassByCourse,
      classGrades: allClassGrades ?? [],
      submissions: allSubmissions ?? [],
      results: allResults ?? [],
      coachId,
    }

    renderPlanilla()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}

function renderPlanilla(): void {
  if (!planilla) return
  const { courses, schedulesByCourse, studentsByCourse } = planilla

  const fmtDate = (d: string) => {
    if (!d) return '—'
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
  }
  const fmtTime = (d: string) => (d ? d.slice(0, 5) : '')

  const sections = courses.map((c: any) => {
    const schedules = schedulesByCourse[c.id] || []
    const students = studentsByCourse[c.id] || []
    if (schedules.length === 0 || students.length === 0) return ''

    const headerCells = schedules.map((s: any) =>
      `<th class="py-2 px-2 text-xs font-medium text-zinc-400 min-w-[110px] text-center" title="${escapeHtml(s.title || '')}">${fmtDate(s.schedule_date)}<br><span class="text-zinc-600">${fmtTime(s.start_time)}</span></th>`,
    ).join('')

    const rows = students.map((e: any) => {
      const sid = e.profile_id
      const studentName = e.profiles?.full_name || 'Desconocido'
      const platformBadge = e.profiles?.platform === 'mobile'
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`

      const cells = schedules.map((s: any) => cellHtml(s.id, sid))
      const summary = summaryFor(c.id, sid)

      return `<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-course="${escapeHtml(c.id)}" data-student="${escapeHtml(sid)}">
        <td class="py-2.5 px-3 text-sm text-white whitespace-nowrap sticky left-0 bg-[#111] z-10 min-w-[160px]">${escapeHtml(studentName)}</td>
        <td class="py-2.5 px-3">${platformBadge}</td>
        ${cells}
        <td class="py-2.5 px-3 text-center text-sm" data-role="class-avg">${summary.classesHtml}</td>
        <td class="py-2.5 px-3 text-center text-sm" data-role="final">${summary.finalHtml}</td>
        <td class="py-2.5 px-3 text-center" data-role="status">${summary.statusHtml}</td>
        <td class="py-2.5 px-3 text-center text-sm text-zinc-300 whitespace-nowrap" data-role="ranking">${summary.rankingHtml}</td>
      </tr>`
    }).join('')

    return `
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden mb-6" data-course-section="${escapeHtml(c.id)}">
        <div class="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)}</h3>
          <p class="text-xs text-zinc-500 mt-0.5">${students.length} alumno${students.length !== 1 ? 's' : ''} · ${schedules.length} clase${schedules.length !== 1 ? 's' : ''} · Clases ${GRADE_WEIGHTS.classes}% · Tareas ${GRADE_WEIGHTS.tasks}% · Exámenes ${GRADE_WEIGHTS.exams}% · Final ${GRADE_WEIGHTS.final}%</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-2.5 px-3 font-medium sticky left-0 bg-[#111] z-10 min-w-[160px]">Alumno</th>
                <th class="py-2.5 px-3 font-medium">Plataforma</th>
                ${headerCells}
                <th class="py-2.5 px-3 font-medium text-center min-w-[60px]">Clases</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[70px]">Nota final</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[90px]">Estado</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[80px]">Ranking</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="px-4 py-2 text-[10px] text-zinc-600">Clic en una celda de clase para ingresar Teoría (0-5) + Práctica (0-15). Guarda con Enter o el botón ✓.</p>
      </div>`
  }).filter(Boolean).join('')

  const html = `
    <div class="mb-6">
      <span class="kicker">Calificaciones de la academia</span>
      <h1 class="font-heading text-2xl font-bold text-white">Notas</h1>
      <p class="mt-1 text-sm text-zinc-500">Planilla de notas por curso — Teoría (0-5) + Práctica (0-15) = Total (0-20)</p>
    </div>
    ${sections || '<p class="text-sm text-zinc-500">No hay cursos con clases y alumnos asignados.</p>'}`

  document.getElementById('page-content')!.innerHTML = html
  bindCellEditor()
}

function cellHtml(scheduleId: string, sid: string): string {
  if (!planilla) return '<td></td>'
  const g = planilla.gradesByKey.get(scheduleId + '_' + sid)
  const theory = g?.theory_score ?? null
  const practice = g?.practice_score ?? null
  const total = theory !== null && practice !== null ? (parseFloat(theory) + parseFloat(practice)) : null
  const color = total !== null ? (total >= 14 ? 'text-green-400' : total >= 11 ? 'text-yellow-400' : 'text-red-400') : 'text-zinc-600'
  return `<td class="py-2 px-2 text-center text-xs ${color} grade-cell cursor-pointer hover:bg-zinc-800/40" data-role="grade-cell" data-sched="${escapeHtml(scheduleId)}" data-student="${escapeHtml(sid)}" title="Clic para editar">${total !== null ? total.toFixed(1) : '—'}</td>`
}

function summaryFor(courseId: string, sid: string) {
  if (!planilla) return { classesHtml: '', finalHtml: '', statusHtml: '', rankingHtml: '' }
  const ref = planilla.refsByCourse.get(courseId)
  const minPass = planilla.minPassByCourse.get(courseId) ?? 14
  const raw = ref ? buildRawScores(ref, planilla.classGrades, planilla.submissions, planilla.results, sid) : null
  const comp = ref && raw ? computeComponents(raw) : { classes: null, tasks: null, exams: null, final: null }
  const final = weightedFinal(comp)
  const pendingRec = ref ? hasPendingRecovery(ref, planilla.results, planilla.submissions, sid) : false
  const status = gradeStatus(final, minPass, pendingRec)
  const meta = statusMeta[status]

  const classesHtml = comp.classes !== null
    ? `<span class="${comp.classes >= 14 ? 'text-green-400 font-bold' : comp.classes >= 11 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}">${comp.classes.toFixed(1)}</span>`
    : '<span class="text-zinc-600">—</span>'

  const finalHtml = final !== null
    ? `<span class="${final >= minPass ? 'text-green-400 font-bold' : final >= 11 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}">${final.toFixed(1)}</span>`
    : '<span class="text-zinc-600">—</span>'

  const statusHtml = `<span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}">${meta.label}</span>`

  let rankingHtml = '<span class="text-zinc-600">—</span>'
  if (final !== null) {
    const students = planilla.studentsByCourse[courseId] || []
    const finals: number[] = []
    for (const e of students) {
      const r = ref ? buildRawScores(ref, planilla.classGrades, planilla.submissions, planilla.results, e.profile_id) : null
      const f = r ? weightedFinal(computeComponents(r)) : null
      if (f !== null) finals.push(f)
    }
    const sorted = [...finals].sort((a, b) => b - a)
    const pos = sorted.findIndex((f: number) => f === final) + 1
    rankingHtml = `<span class="text-zinc-300">#${pos} de ${sorted.length}</span>`
  }

  return { classesHtml, finalHtml, statusHtml, rankingHtml }
}

function bindCellEditor(): void {
  const page = document.getElementById('page-content')
  if (!page) return
  page.addEventListener('click', (ev: Event) => {
    const target = ev.target as HTMLElement
    const saveBtn = target.closest<HTMLElement>('[data-role="cell-save"]')
    if (saveBtn) { commitCell(saveBtn.closest<HTMLElement>('td.grade-cell')!); return }
    const cancelBtn = target.closest<HTMLElement>('[data-role="cell-cancel"]')
    if (cancelBtn) { const cell = cancelBtn.closest<HTMLElement>('td.grade-cell')!; closeCellEditor(cell); return }
    if (target.closest('td.grade-cell')) { openCellEditor(target.closest<HTMLElement>('td.grade-cell')!); return }
    // clic fuera de un editor activo sin guardar
    document.querySelectorAll<HTMLElement>('td.grade-cell.editing').forEach(cell => closeCellEditor(cell))
  })
}

function openCellEditor(cell: HTMLElement): void {
  if (cell.classList.contains('editing')) return
  cell.classList.add('editing')
  const sched = cell.dataset.sched || ''
  const sid = cell.dataset.student || ''
  let theory = ''
  let practice = ''
  if (planilla) {
    const g = planilla.gradesByKey.get(sched + '_' + sid)
    theory = g ? String(g.theory_score) : ''
    practice = g ? String(g.practice_score) : ''
  }
  cell.innerHTML = `
    <div class="flex items-center justify-center gap-1">
      <input type="number" class="gcell-theory w-12 rounded border border-zinc-700 bg-[#0A0A0A] px-1 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="5" value="${theory}" placeholder="T0-5" />
      <input type="number" class="gcell-practice w-12 rounded border border-zinc-700 bg-[#0A0A0A] px-1 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="15" value="${practice}" placeholder="P0-15" />
      <button class="text-green-400 hover:text-green-300" data-role="cell-save" title="Guardar">${Icon('check', 12)}</button>
      <button class="text-zinc-500 hover:text-zinc-300" data-role="cell-cancel" title="Cancelar">${Icon('x', 12)}</button>
    </div>`
  const tInput = cell.querySelector('.gcell-theory') as HTMLInputElement
  const pInput = cell.querySelector('.gcell-practice') as HTMLInputElement
  tInput?.focus()
  const keyHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter') commitCell(cell)
    else if (ev.key === 'Escape') closeCellEditor(cell)
  }
  tInput?.addEventListener('keydown', keyHandler)
  pInput?.addEventListener('keydown', keyHandler)
}

function closeCellEditor(cell: HTMLElement): void {
  if (!cell.classList.contains('editing')) return
  cell.classList.remove('editing')
  const sched = cell.dataset.sched || ''
  const sid = cell.dataset.student || ''
  const outer = cell.outerHTML
  const re = /<td[^>]*data-role="grade-cell"[^>]*>[\s\S]*?<\/td>/i
  if (re.test(outer)) {
    const html = cellHtml(sched, sid)
    cell.outerHTML = html
    return
  }
  cell.innerHTML = cellHtml(sched, sid)
}

async function commitCell(cell: HTMLElement): Promise<void> {
  if (!planilla) return
  const sched = cell.dataset.sched || ''
  const sid = cell.dataset.student || ''
  const courseId = cell.closest<HTMLElement>('tr')?.dataset.course || ''
  const theory = Math.min(Math.max(parseFloat((cell.querySelector('.gcell-theory') as HTMLInputElement)?.value || '0') || 0, 0), 5)
  const practice = Math.min(Math.max(parseFloat((cell.querySelector('.gcell-practice') as HTMLInputElement)?.value || '0') || 0, 0), 15)

  if (theory === 0 && practice === 0) {
    const existing = planilla.gradesByKey.get(sched + '_' + sid)
    if (!existing) { closeCellEditor(cell); return }
  }

  const { error } = await supabase.from('class_grades').upsert({
    schedule_id: sched,
    student_id: sid,
    theory_score: theory,
    practice_score: practice,
    coach_id: planilla.coachId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'schedule_id,student_id' })

  if (error) {
    toast('error', 'No se pudo guardar: ' + error.message)
    closeCellEditor(cell)
    return
  }

  planilla.gradesByKey.set(sched + '_' + sid, { schedule_id: sched, student_id: sid, theory_score: theory, practice_score: practice })

  const row = cell.closest<HTMLElement>('tr')
  cell.outerHTML = cellHtml(sched, sid)
  if (row) updateRowStats(row, courseId, sid)
  toast('success', 'Nota guardada')
}

function updateRowStats(row: HTMLElement, courseId: string, sid: string): void {
  const summary = summaryFor(courseId, sid)
  const set = (role: string, html: string) => {
    const el = row.querySelector<HTMLElement>(`[data-role="${role}"]`)
    if (el) el.innerHTML = html
  }
  set('class-avg', summary.classesHtml)
  set('final', summary.finalHtml)
  set('status', summary.statusHtml)
  set('ranking', summary.rankingHtml)
}
