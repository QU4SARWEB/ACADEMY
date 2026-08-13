import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { getAssignedCourseIds } from '@/2b3583/assignments'
import { renderTaskCreateForm, bindTaskFormEvents } from './tasks'
import {
  GRADE_WEIGHTS,
  COMPONENT_LABELS,
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

interface StCourse { id: string; name: string; minPass: number }
interface StStudent {
  enrollId: string
  sid: string
  name: string
  platform: string
  manual: number | null
  effective: number | null
  tasksAvg: number | null
  examsAvg: number | null
  pendingRec: boolean
}

let st: {
  courses: StCourse[]
  studentsByCourse: Record<string, StStudent[]>
} | null = null

export async function initCoachGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id

    const params = new URLSearchParams(location.hash.split('?')[1] || '')
    const studentParam = params.get('student') || ''
    const courseParam = params.get('course') || ''
    if (studentParam) {
      await renderStudentDetail(studentParam, courseParam)
      return
    }

    const assignedIds = await getAssignedCourseIds(coachId)
    let coursesQuery = supabase.from('courses').select('id, name, min_pass_grade').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: enrolls }, { data: allTasks }, { data: allExams }] = await Promise.all([
      supabase.from('enrollments')
        .select('id, profile_id, course_id, final_grade, profiles!inner(full_name, platform)')
        .in('course_id', idFilter)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase.from('course_tasks').select('id, course_id, title, is_recovery').in('course_id', idFilter),
      supabase.from('exams').select('id, course_id, title, is_final, is_recovery').in('course_id', idFilter),
    ])

    const taskIds = (allTasks ?? []).map((t: any) => t.id)
    const taskIdFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']
    const examIds = (allExams ?? []).map((x: any) => x.id)
    const examIdFilter = examIds.length > 0 ? examIds : ['00000000-0000-0000-0000-000000000000']

    const [{ data: allSubs }, { data: allResults }] = await Promise.all([
      supabase.from('task_submissions').select('task_id, student_id, score, graded').in('task_id', taskIdFilter),
      supabase.from('exam_results').select('exam_id, student_id, total_score, status').in('exam_id', examIdFilter),
    ])

    const tasksByCourse = new Map<string, { id: string; title: string; is_recovery: boolean }[]>()
    for (const t of allTasks ?? []) {
      if (!tasksByCourse.has(t.course_id)) tasksByCourse.set(t.course_id, [])
      tasksByCourse.get(t.course_id)!.push({ id: t.id, title: t.title, is_recovery: !!t.is_recovery })
    }
    const examsByCourse = new Map<string, { id: string; title: string; is_final: boolean; is_recovery: boolean }[]>()
    for (const x of allExams ?? []) {
      if (!examsByCourse.has(x.course_id)) examsByCourse.set(x.course_id, [])
      examsByCourse.get(x.course_id)!.push({ id: x.id, title: x.title, is_final: !!x.is_final, is_recovery: !!x.is_recovery })
    }

    const studentsByCourse: Record<string, StStudent[]> = {}
    for (const e of enrolls ?? []) {
      const sid = e.profile_id
      const tasks = tasksByCourse.get(e.course_id) || []
      const exams = examsByCourse.get(e.course_id) || []
      const ref = {
        scheduleIds: [] as string[],
        tasks: tasks.map(t => ({ id: t.id, is_recovery: t.is_recovery })),
        exams: exams.map(x => ({ id: x.id, is_final: x.is_final, is_recovery: x.is_recovery })),
      }
      const raw = buildRawScores(ref, [], allSubs ?? [], allResults ?? [], sid)
      const comp = computeComponents(raw)
      const computed = weightedFinal(comp)
      const manual = e.final_grade != null ? parseFloat(e.final_grade) : null
      const effective = manual !== null && !isNaN(manual) ? manual : computed
      const prof: any = Array.isArray((e as any).profiles) ? (e as any).profiles[0] : (e as any).profiles
      if (!studentsByCourse[e.course_id]) studentsByCourse[e.course_id] = []
      studentsByCourse[e.course_id].push({
        enrollId: e.id,
        sid,
        name: prof?.full_name || 'Desconocido',
        platform: prof?.platform || 'pc',
        manual,
        effective,
        tasksAvg: comp.tasks,
        examsAvg: comp.exams,
        pendingRec: hasPendingRecovery(ref, allResults ?? [], allSubs ?? [], sid),
      })
    }

    st = {
      courses: (courses ?? []).map((c: any) => ({ id: c.id, name: c.name, minPass: c.min_pass_grade ?? 14 })),
      studentsByCourse,
    }

    renderPlanilla()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}

function renderPlanilla(): void {
  if (!st) return
  const { courses, studentsByCourse } = st

  const sections = courses.map((c) => {
    const students = studentsByCourse[c.id] || []
    if (students.length === 0) return ''

    const rows = students.map((s) => {
      const platformBadge = s.platform === 'mobile'
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`

      const meta = statusMeta[gradeStatus(s.effective, c.minPass, s.pendingRec)]
      const notaVal = s.effective !== null ? s.effective.toFixed(1) : ''

      return `<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-course="${escapeHtml(c.id)}" data-enroll="${escapeHtml(s.enrollId)}">
        <td class="py-2.5 px-3">
          <button type="button" class="grade-student-btn flex items-center gap-2 text-sm text-white hover:text-[#A78BFA] transition" data-student="${escapeHtml(s.sid)}">
            ${Icon('user', 14)}
            <span class="truncate max-w-[180px]">${escapeHtml(s.name)}</span>
          </button>
        </td>
        <td class="py-2.5 px-3">${platformBadge}</td>
        <td class="py-2.5 px-3 text-center text-sm" data-role="tasks-avg">
          ${s.tasksAvg !== null ? `<span class="text-zinc-300">${s.tasksAvg.toFixed(1)}</span>` : '<span class="text-zinc-600">—</span>'}
        </td>
        <td class="py-2.5 px-3 text-center">
          <input type="number" step="0.1" min="0" max="20" value="${notaVal}" placeholder="0-20"
            class="grade-nota w-20 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-center text-sm text-white outline-none transition focus:border-[#8B5CF6]"
            data-enroll="${escapeHtml(s.enrollId)}" title="Nota del alumno sobre 20" />
        </td>
        <td class="py-2.5 px-3 text-center" data-role="status"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}">${meta.label}</span></td>
        <td class="py-2.5 px-3 text-center text-sm text-zinc-300 whitespace-nowrap" data-role="ranking">${s.effective !== null ? rankingHtml(c.id, s.effective) : '<span class="text-zinc-600">—</span>'}</td>
        <td class="py-2.5 px-3 text-right">
          <button type="button" class="grade-student-btn text-zinc-400 hover:text-[#A78BFA] transition" data-student="${escapeHtml(s.sid)}" title="Ver todas sus notas">${Icon('eye', 15)}</button>
        </td>
      </tr>`
    }).join('')

    return `
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden mb-6" data-course-section="${escapeHtml(c.id)}">
        <div class="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)}</h3>
          <p class="text-xs text-zinc-500 mt-0.5">${students.length} alumno${students.length !== 1 ? 's' : ''} · Aprobado desde ${c.minPass}/20 · ${COMPONENT_LABELS.classes} ${GRADE_WEIGHTS.classes}% · ${COMPONENT_LABELS.tasks} ${GRADE_WEIGHTS.tasks}% · ${COMPONENT_LABELS.exams} ${GRADE_WEIGHTS.exams}% · ${COMPONENT_LABELS.final} ${GRADE_WEIGHTS.final}%</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-2.5 px-3 font-medium min-w-[180px]">Alumno</th>
                <th class="py-2.5 px-3 font-medium">Plataforma</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[80px]">Nota tareas</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[90px]">Nota alumno</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[90px]">Estado</th>
                <th class="py-2.5 px-3 font-medium text-center min-w-[80px]">Ranking</th>
                <th class="py-2.5 px-3 font-medium text-right min-w-[50px]"></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="px-4 py-2 text-[10px] text-zinc-600">La nota se guarda automáticamente al escribir. Clic en el alumno para ver todas sus notas.</p>
      </div>`
  }).filter(Boolean).join('')

  const html = `
    <div class="mb-6">
      <span class="kicker">Calificaciones de la academia</span>
      <h1 class="font-heading text-2xl font-bold text-white">Notas</h1>
      <p class="mt-1 text-sm text-zinc-500">Lista de alumnos por curso — escribe la nota del alumno (0-20) o clic para ver sus notas de tareas y exámenes.</p>
    </div>
    ${sections || '<p class="text-sm text-zinc-500">No hay alumnos inscritos en tus cursos.</p>'}`

  document.getElementById('page-content')!.innerHTML = html
  bindPlanillaEvents()
}

function rankingHtml(courseId: string, grade: number): string {
  if (!st) return ''
  const students = st.studentsByCourse[courseId] || []
  const grades = students.map(s => s.effective).filter((v): v is number => v !== null)
  const sorted = [...grades].sort((a, b) => b - a)
  const pos = sorted.findIndex(v => v === grade) + 1
  return `#${pos} de ${sorted.length}`
}

function bindPlanillaEvents(): void {
  document.querySelectorAll<HTMLInputElement>('.grade-nota').forEach(input => {
    input.addEventListener('change', async () => {
      await saveNota(input)
    })
  })

  document.querySelectorAll<HTMLElement>('.grade-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = btn.closest<HTMLElement>('tr')?.dataset.course || ''
      const sid = btn.dataset.student || ''
      location.hash = `#/coaches/grades?student=${encodeURIComponent(sid)}&course=${encodeURIComponent(courseId)}`
    })
  })
}

async function saveNota(input: HTMLInputElement): Promise<void> {
  if (!st) return
  const enrollId = input.dataset.enroll || ''
  const row = input.closest<HTMLElement>('tr')
  const courseId = row?.dataset.course || ''
  const raw = input.value.trim()
  let value: number | null = null
  if (raw !== '') {
    const v = parseFloat(raw)
    if (isNaN(v)) { toast('error', 'Nota inválida'); return }
    value = Math.min(Math.max(v, 0), 20)
  }

  const { error } = await supabase.from('enrollments').update({ final_grade: value }).eq('id', enrollId)
  if (error) { toast('error', error.message); return }

  const student = st.studentsByCourse[courseId]?.find(s => s.enrollId === enrollId)
  if (student) {
    student.manual = value
    student.effective = value
    reRenderCourse(courseId)
  }
  toast('success', 'Nota guardada')
}

function reRenderCourse(courseId: string): void {
  const section = document.querySelector<HTMLElement>(`[data-course-section="${courseId}"]`)
  if (!section || !st) return
  const c = st.courses.find(x => x.id === courseId)
  if (!c) return
  const students = st.studentsByCourse[courseId] || []
  if (students.length === 0) { section.remove(); return }

  const rows = students.map((s) => {
    const platformBadge = s.platform === 'mobile'
      ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
      : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
    const meta = statusMeta[gradeStatus(s.effective, c.minPass, s.pendingRec)]
    const notaVal = s.effective !== null ? s.effective.toFixed(1) : ''
    return `<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-course="${escapeHtml(c.id)}" data-enroll="${escapeHtml(s.enrollId)}">
      <td class="py-2.5 px-3">
        <button type="button" class="grade-student-btn flex items-center gap-2 text-sm text-white hover:text-[#A78BFA] transition" data-student="${escapeHtml(s.sid)}">
          ${Icon('user', 14)}<span class="truncate max-w-[180px]">${escapeHtml(s.name)}</span>
        </button>
      </td>
      <td class="py-2.5 px-3">${platformBadge}</td>
      <td class="py-2.5 px-3 text-center text-sm" data-role="tasks-avg">${s.tasksAvg !== null ? `<span class="text-zinc-300">${s.tasksAvg.toFixed(1)}</span>` : '<span class="text-zinc-600">—</span>'}</td>
      <td class="py-2.5 px-3 text-center"><input type="number" step="0.1" min="0" max="20" value="${notaVal}" placeholder="0-20" class="grade-nota w-20 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-center text-sm text-white outline-none transition focus:border-[#8B5CF6]" data-enroll="${escapeHtml(s.enrollId)}" title="Nota del alumno sobre 20" /></td>
      <td class="py-2.5 px-3 text-center" data-role="status"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}">${meta.label}</span></td>
      <td class="py-2.5 px-3 text-center text-sm text-zinc-300 whitespace-nowrap" data-role="ranking">${s.effective !== null ? rankingHtml(c.id, s.effective) : '<span class="text-zinc-600">—</span>'}</td>
      <td class="py-2.5 px-3 text-right"><button type="button" class="grade-student-btn text-zinc-400 hover:text-[#A78BFA] transition" data-student="${escapeHtml(s.sid)}" title="Ver todas sus notas">${Icon('eye', 15)}</button></td>
    </tr>`
  }).join('')

  section.querySelector('tbody')!.innerHTML = rows
  section.querySelectorAll<HTMLInputElement>('.grade-nota').forEach(input => {
    input.addEventListener('change', () => void saveNota(input))
  })
  section.querySelectorAll<HTMLElement>('.grade-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId2 = btn.closest<HTMLElement>('tr')?.dataset.course || ''
      location.hash = `#/coaches/grades?student=${encodeURIComponent(btn.dataset.student || '')}&course=${encodeURIComponent(courseId2)}`
    })
  })
}

async function renderStudentDetail(sid: string, courseParam: string): Promise<void> {
  try {
    const back = `#/coaches/grades${courseParam ? '?course=' + encodeURIComponent(courseParam) : ''}`

    let course: any = null
    let enrollment: any = null
    if (courseParam) {
      const [{ data: c }, { data: en }] = await Promise.all([
        supabase.from('courses').select('id, name, min_pass_grade').eq('id', courseParam).maybeSingle(),
        supabase.from('enrollments').select('id, final_grade').eq('profile_id', sid).eq('course_id', courseParam).eq('status', 'active').maybeSingle(),
      ])
      course = c
      enrollment = en
    } else {
      const { data: en } = await supabase.from('enrollments')
        .select('id, course_id, final_grade, courses(id, name, min_pass_grade)')
        .eq('profile_id', sid).eq('status', 'active').order('created_at', { ascending: false }).maybeSingle()
      enrollment = en
      course = en?.courses || null
    }
    if (!course || !enrollment) {
      document.getElementById('page-content')!.innerHTML = `<p class="text-sm text-zinc-500">Alumno o curso no encontrado. <a class="text-[#A78BFA] underline" href="${back}">Volver a notas</a></p>`
      return
    }
    const courseId = course.id
    const minPass = course.min_pass_grade ?? 14
    const enrollId = enrollment.id

    const [{ data: profile }, { data: tasks }, { data: subs }, { data: exams }, { data: results }, { data: allEnrolls }] = await Promise.all([
      supabase.from('profiles').select('full_name, platform, rank').eq('id', sid).maybeSingle(),
      supabase.from('course_tasks').select('id, title, is_recovery').eq('course_id', courseId),
      supabase.from('task_submissions').select('task_id, score, graded').eq('student_id', sid),
      supabase.from('exams').select('id, title, is_final, is_recovery').eq('course_id', courseId),
      supabase.from('exam_results').select('exam_id, total_score, status').eq('student_id', sid),
      supabase.from('enrollments').select('profile_id, final_grade').eq('course_id', courseId).eq('status', 'active'),
    ])

    const taskIds = (tasks ?? []).map((t: any) => t.id)
    const taskIdFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']
    const examIds = (exams ?? []).map((x: any) => x.id)
    const examIdFilter = examIds.length > 0 ? examIds : ['00000000-0000-0000-0000-000000000000']
    const subsF = (subs ?? []).filter((s: any) => taskIdFilter.includes(s.task_id))
    const resultsF = (results ?? []).filter((r: any) => examIdFilter.includes(r.exam_id))
    const ref = {
      scheduleIds: [] as string[],
      tasks: (tasks ?? []).map((t: any) => ({ id: t.id, is_recovery: !!t.is_recovery })),
      exams: (exams ?? []).map((x: any) => ({ id: x.id, is_final: !!x.is_final, is_recovery: !!x.is_recovery })),
    }
    const raw = buildRawScores(ref, [], subsF, resultsF, sid)
    const comp = computeComponents(raw)
    const computed = weightedFinal(comp)
    const manual = enrollment.final_grade != null ? parseFloat(enrollment.final_grade) : null
    const effective = manual !== null && !isNaN(manual) ? manual : computed
    const pendingRec = hasPendingRecovery(ref, resultsF, subsF, sid)
    const meta = statusMeta[gradeStatus(effective, minPass, pendingRec)]
    const notaVal = effective !== null ? effective.toFixed(1) : ''

    let ranking = '—'
    if (effective !== null) {
      const grades: number[] = []
      for (const en of allEnrolls ?? []) {
        const man = en.final_grade != null ? parseFloat(en.final_grade) : null
        if (man !== null && !isNaN(man)) { grades.push(man); continue }
        const r2 = buildRawScores(ref, [], subsF, resultsF, en.profile_id)
        const f = weightedFinal(computeComponents(r2))
        if (f !== null) grades.push(f)
      }
      const sorted = [...grades].sort((a, b) => b - a)
      const pos = sorted.findIndex(g => g === effective) + 1
      if (pos > 0) ranking = `#${pos} de ${sorted.length}`
    }

    const name = profile?.full_name || 'Desconocido'
    const platform = profile?.platform || 'pc'
    const platformName = platform === 'playstation' ? 'PlayStation' : platform === 'xbox' ? 'Xbox' : 'PC'
    const subMap = new Map<string, any>()
    for (const s of subsF) subMap.set(s.task_id, s)
    const resultMap = new Map<string, any>()
    for (const r of resultsF) resultMap.set(r.exam_id, r)

    const taskRows = (tasks ?? []).map((t: any) => {
      const sub = subMap.get(t.id)
      const score = sub && sub.score != null ? parseFloat(sub.score) : null
      return `<div class="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
        <div class="flex items-center gap-2 text-sm text-zinc-300 min-w-0">
          <span class="truncate">${escapeHtml(t.title || 'Tarea')}</span>
          ${t.is_recovery ? '<span class="shrink-0 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-400">Recuperación</span>' : ''}
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="text-sm font-medium ${score === null ? 'text-zinc-600' : score >= 14 ? 'text-green-400' : score >= 11 ? 'text-yellow-400' : 'text-red-400'}">${score !== null ? score.toFixed(1) + '/20' : '—'}</span>
          <div class="flex items-center gap-1">
            <button type="button" class="grades-task-edit text-zinc-500 hover:text-[#A78BFA] transition" data-task-id="${escapeHtml(t.id)}" title="Editar tarea">${Icon('edit', 13)}</button>
            <button type="button" class="grades-task-del text-zinc-600 hover:text-red-400 transition" data-task-id="${escapeHtml(t.id)}" title="Eliminar tarea">${Icon('trash', 13)}</button>
          </div>
        </div>
      </div>`
    }).join('')

    const examRows = (exams ?? []).map((x: any) => {
      const r = resultMap.get(x.id)
      const score = r && r.status === 'graded' && r.total_score != null ? parseFloat(r.total_score) : null
      return `<div class="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
        <div class="flex items-center gap-2 text-sm text-zinc-300 min-w-0">
          <span class="truncate">${escapeHtml(x.title || 'Examen')}</span>
          ${x.is_final ? '<span class="shrink-0 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-400">Final</span>' : ''}
          ${x.is_recovery ? '<span class="shrink-0 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-400">Recuperación</span>' : ''}
        </div>
        <span class="text-sm font-medium ${score === null ? 'text-zinc-600' : score >= 14 ? 'text-green-400' : score >= 11 ? 'text-yellow-400' : 'text-red-400'}">${score !== null ? score.toFixed(1) + '/20' : '—'}</span>
      </div>`
    }).join('')

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-4">
        <a href="${back}" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">${Icon('arrowLeft', 15)} Volver a notas</a>
      </div>

      <div class="mb-6">
        <span class="kicker">Notas del alumno</span>
        <h1 class="font-heading text-2xl font-bold text-white mt-1">${escapeHtml(name)}</h1>
        <p class="text-sm text-zinc-400 mt-1">${escapeHtml(course.name)} · ${platformName}</p>
      </div>

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Nota tareas</p>
          <p class="text-lg font-bold ${comp.tasks === null ? 'text-zinc-600' : comp.tasks >= 14 ? 'text-green-400' : comp.tasks >= 11 ? 'text-yellow-400' : 'text-red-400'}">${comp.tasks !== null ? comp.tasks.toFixed(1) : '—'}</p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Nota alumno</p>
          <p class="text-lg font-bold text-white">${effective !== null ? effective.toFixed(1) : '—'}</p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Estado</p>
          <p class="mt-1.5"><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.cls}">${meta.label}</span></p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Ranking</p>
          <p class="text-lg font-bold text-white">${ranking}</p>
        </div>
      </div>

      <div class="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h4 class="mb-3 text-xs font-medium text-zinc-400">${Icon('clipboardList', 12)} Nota del alumno (0-20)</h4>
        <div class="flex items-center gap-2">
          <input type="number" step="0.1" min="0" max="20" id="grades-student-nota" value="${notaVal}" class="w-32 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          <button type="button" id="grades-save-nota" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 13)} Guardar</button>
          ${manual !== null ? '<span class="text-xs text-zinc-500">Nota asignada por ti</span>' : '<span class="text-xs text-zinc-500">Sin asignar — se usa el promedio automático</span>'}
        </div>
      </div>

      <div class="mb-6">
        <h3 class="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-white">${Icon('clipboardList', 15)} Tareas</h3>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4">${taskRows || '<p class="py-4 text-xs text-zinc-600 text-center">Sin tareas registradas.</p>'}</div>
      </div>

      <div>
        <h3 class="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-white">${Icon('target', 15)} Exámenes</h3>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4">${examRows || '<p class="py-4 text-xs text-zinc-600 text-center">Sin exámenes registrados.</p>'}</div>
      </div>`

    document.getElementById('grades-save-nota')?.addEventListener('click', async () => {
      const input = document.getElementById('grades-student-nota') as HTMLInputElement
      const raw = input.value.trim()
      let value: number | null = null
      if (raw !== '') {
        const v = parseFloat(raw)
        if (isNaN(v)) { toast('error', 'Nota inválida'); return }
        value = Math.min(Math.max(v, 0), 20)
      }
      const { error } = await supabase.from('enrollments').update({ final_grade: value }).eq('id', enrollId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Nota guardada')
      await renderStudentDetail(sid, courseId)
    })

    await bindGradeTaskActions(sid, courseId)
  } catch (e: any) {
    toast('error', e?.message || 'Error cargando el alumno')
  }
}

async function bindGradeTaskActions(sid: string, courseId: string): Promise<void> {
  document.querySelectorAll<HTMLElement>('.grades-task-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = btn.dataset.taskId
      if (!taskId || !(await confirmDialog('¿Eliminar esta tarea? También se eliminarán todas las entregas.'))) return
      const { error } = await supabase.from('course_tasks').delete().eq('id', taskId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Tarea eliminada')
      await renderStudentDetail(sid, courseId)
    })
  })

  document.querySelectorAll<HTMLElement>('.grades-task-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = btn.dataset.taskId
      if (!taskId) return
      const [{ data: task }, { data: { session } }] = await Promise.all([
        supabase.from('course_tasks').select('*').eq('id', taskId).maybeSingle(),
        supabase.auth.getSession(),
      ])
      if (!task) return
      const coachId = session?.user?.id || ''
      const assignedIds = await getAssignedCourseIds(coachId)
      let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
      if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
      const { data: courses } = await coursesQuery

      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'
      const inner = document.createElement('div')
      inner.className = 'glass max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-4'
      inner.innerHTML = renderTaskCreateForm(courses ?? [], task)
      modal.appendChild(inner)
      document.body.appendChild(modal)
      bindTaskFormEvents(inner, coachId, taskId, () => {
        modal.remove()
        void renderStudentDetail(sid, courseId)
      })
      inner.querySelector('#btn-cancel-task')?.addEventListener('click', () => modal.remove())
    })
  })
}
