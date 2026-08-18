import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachPractical(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPractical(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id
    const assignedIds = await getAssignedCourseIds(coachId)

    let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery
    const courseIds = (courses ?? []).map((c: any) => c.id)
    const cidFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: practicalExams } = await supabase
      .from('exams')
      .select('*, exam_questions!inner(id)')
      .in('course_id', cidFilter)
      .eq('is_final', true)
      .ilike('title', '%practico%')

    const examByCourse = new Map<string, any>()
    for (const ex of practicalExams ?? []) examByCourse.set(ex.course_id, ex)

    const { data: allEnrolls } = await supabase
      .from('enrollments')
      .select('id, profile_id, course_id')
      .in('course_id', cidFilter)
      .eq('status', 'active')

    const enrollIds = (allEnrolls ?? []).map((e: any) => e.id)
    const { data: existingPractical } = await supabase
      .from('practical_grades')
      .select('id, enrollment_id, score, note, created_at')
      .in('enrollment_id', enrollIds.length > 0 ? enrollIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })

    const allGradesByEnroll = new Map<string, { id: string; score: number; note: string | null; created_at: string | null }[]>()
    for (const pg of existingPractical ?? []) {
      const v = parseFloat(pg.score)
      if (isNaN(v)) continue
      if (!allGradesByEnroll.has(pg.enrollment_id)) allGradesByEnroll.set(pg.enrollment_id, [])
      allGradesByEnroll.get(pg.enrollment_id)!.push({ id: pg.id, score: v, note: pg.note, created_at: pg.created_at })
    }

    const enrollByStudentCourse = new Map<string, any>()
    for (const en of allEnrolls ?? []) {
      const key = `${en.profile_id}:${en.course_id}`
      enrollByStudentCourse.set(key, en)
    }

    const filterHtml = (courses ?? []).map((c: any) => `
      <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
      </button>
    `).join('')

    const renderStudentRow = (s: any, courseId: string) => {
      const ex = examByCourse.get(courseId)
      const result = ex?.resultsMap?.get(s.id)
      const graded = result?.status === 'graded'
      const score = result?.total_score ?? ''
      const platformBadge = s.platform === 'mobile'
        ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
        : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
      return `
      <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-course-id="${escapeHtml(courseId)}">
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml((s.full_name || '?').charAt(0).toUpperCase())}</div>
            <span class="text-sm text-white">${escapeHtml(s.full_name || '')}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-zinc-400">${escapeHtml(s.email || '')}</td>
        <td class="py-3 px-4">${platformBadge}</td>
        <td class="py-3 px-4">${ex ? (graded ? Icon('checkCircle', 16) : Icon('clock', 16)) : Icon('x', 16)}</td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <input type="number" class="practical-score w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-sm text-white text-center outline-none focus:border-[#8B5CF6]" min="0" max="20" value="${score}" data-student="${escapeHtml(s.id)}" data-exam-id="${escapeHtml(ex?.id || '')}" ${ex ? '' : 'disabled'} />
            <button class="save-practical-btn rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition ${ex ? '' : 'opacity-50 cursor-not-allowed'}" data-student="${escapeHtml(s.id)}" data-exam-id="${escapeHtml(ex?.id || '')}" ${ex ? '' : 'disabled'}>${Icon('save', 12)} Guardar</button>
          </div>
        </td>
      </tr>`
    }

    const courseSections = await Promise.all((courses ?? []).map(async (c: any) => {
      const ex = examByCourse.get(c.id)
      if (!ex) return ''

      const { data: theoryExam } = await supabase
        .from('exams')
        .select('id')
        .eq('course_id', c.id)
        .eq('is_final', true)
        .ilike('title', '%teorico%')
        .maybeSingle()

      let studentIds: string[] = []
      if (theoryExam) {
        const { data: theoryResults } = await supabase
          .from('exam_results')
          .select('student_id')
          .eq('exam_id', theoryExam.id)
          .eq('status', 'graded')
        studentIds = (theoryResults ?? []).map((r: any) => r.student_id)
      }

      if (studentIds.length === 0) return ''

      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, email, platform')
        .in('id', studentIds)
        .order('full_name')

      const { data: existingResults } = await supabase
        .from('exam_results')
        .select('student_id, total_score, status')
        .eq('exam_id', ex.id)

      const resultsMap = new Map<string, any>()
      for (const r of existingResults ?? []) resultsMap.set(r.student_id, r)

      ex.resultsMap = resultsMap

      const studentList = students ?? []
      const rows = studentList.map((s: any) => renderStudentRow(s, c.id)).join('')
      if (!rows) return ''

      return `
      <div class="w-full mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)} — Examen Pr\u00e1ctico</h2>
          <span class="text-xs text-zinc-500">${studentList.length} alumno${studentList.length !== 1 ? 's' : ''} con teor\u00edco aprobado</span>
        </div>
        <div class="w-full rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th class="py-3 px-4 font-medium">Alumno</th>
                  <th class="py-3 px-4 font-medium">Email</th>
                  <th class="py-3 px-4 font-medium">Plataforma</th>
                  <th class="py-3 px-4 font-medium">Te\u00f3rico</th>
                  <th class="py-3 px-4 font-medium">Nota Pr\u00e1ctica (0-20)</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`
    }))

    const examSections = courseSections.filter(Boolean).join('')

    const practicalGradeRows = await Promise.all((courses ?? []).map(async (c: any) => {
      const courseEnrolls = (allEnrolls ?? []).filter((e: any) => e.course_id === c.id)
      if (courseEnrolls.length === 0) return ''

      const studentIds = courseEnrolls.map((e: any) => e.profile_id)
      const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name, email, platform')
        .in('id', studentIds)
        .order('full_name')

      const rows = (students ?? []).map((s: any) => {
        const enroll = enrollByStudentCourse.get(`${s.id}:${c.id}`)
        const grades = enroll ? (allGradesByEnroll.get(enroll.id) || []) : []
        const avg = grades.length > 0 ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length : null
        const platformBadge = s.platform === 'mobile'
          ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)}</span>`
          : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)}</span>`
        const gradesList = grades.length > 0 ? `
          <div class="mt-1 space-y-1">
            ${grades.map(g => `
              <div class="flex items-center gap-1.5 text-[11px]">
                <span class="text-[#8B5CF6] font-medium">${g.score.toFixed(1)}</span>
                ${g.note ? `<span class="text-zinc-500 truncate max-w-[120px]">${escapeHtml(g.note)}</span>` : ''}
                <span class="text-zinc-600">${g.created_at ? new Date(g.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}</span>
                <button type="button" class="delete-practice-grade text-zinc-600 hover:text-red-400" data-id="${escapeHtml(g.id)}" title="Eliminar">${Icon('trash', 10)}</button>
              </div>`).join('')}
          </div>` : '<p class="text-[10px] text-zinc-600 mt-1">Sin notas</p>'
        return `
        <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml((s.full_name || '?').charAt(0).toUpperCase())}</div>
              <span class="text-sm text-white">${escapeHtml(s.full_name || '')}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-xs text-zinc-400">${escapeHtml(s.email || '')}</td>
          <td class="py-3 px-4">${platformBadge}</td>
          <td class="py-3 px-4">
            <span class="text-sm font-bold ${avg !== null ? (avg >= 14 ? 'text-green-400' : avg >= 11 ? 'text-yellow-400' : 'text-red-400') : 'text-zinc-600'}">${avg !== null ? avg.toFixed(1) : '—'}</span>
            <span class="text-[10px] text-zinc-600 ml-1">${grades.length > 0 ? `(${grades.length} nota${grades.length > 1 ? 's' : ''})` : ''}</span>
            ${gradesList}
          </td>
          <td class="py-3 px-4">
            <input type="number" class="practice-grade-score w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-sm text-white text-center outline-none focus:border-[#8B5CF6]" min="0" max="20" step="0.1" value="" placeholder="Nueva" data-enrollment="${escapeHtml(enroll?.id || '')}" />
          </td>
          <td class="py-3 px-4">
            <input type="text" class="practice-grade-note w-full max-w-[200px] rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" value="" placeholder="Observación" data-enrollment="${escapeHtml(enroll?.id || '')}" />
          </td>
          <td class="py-3 px-4">
            <button class="save-practice-grade rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition" data-enrollment="${escapeHtml(enroll?.id || '')}">${Icon('plus', 12)} Agregar</button>
          </td>
        </tr>`
      }).join('')

      if (!rows) return ''

      return `
      <div class="w-full mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)} — Nota de Práctica</h2>
          <span class="text-xs text-zinc-500">${(students ?? []).length} alumno${(students ?? []).length !== 1 ? 's' : ''} · Peso: 20% de la nota final</span>
        </div>
        <div class="w-full rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-full text-sm">
              <thead>
                <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th class="py-3 px-4 font-medium">Alumno</th>
                  <th class="py-3 px-4 font-medium">Email</th>
                  <th class="py-3 px-4 font-medium">Plataforma</th>
                  <th class="py-3 px-4 font-medium">Promedio</th>
                  <th class="py-3 px-4 font-medium">Nueva nota</th>
                  <th class="py-3 px-4 font-medium">Observación</th>
                  <th class="py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>`
    }))

    const practiceSections = practicalGradeRows.filter(Boolean).join('')

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6">
        <span class="kicker">Evaluaciones en juego</span>
        <h1 class="font-heading text-2xl font-bold text-white">Práctica</h1>
        <p class="mt-1 text-sm text-zinc-500">Califica la práctica de tus alumnos. El promedio de todas las notas equivale al 20% de la nota final.</p>
      </div>

      <div class="mb-8">
        <h2 class="font-heading text-lg font-bold text-white mb-3 flex items-center gap-2">${Icon('target', 18)} Nota de Práctica (afecta nota final)</h2>
        <p class="text-xs text-zinc-500 mb-4">Asigna notas de 0 a 20 a cada alumno. El promedio de todas las notas equivale al <span class="text-[#8B5CF6] font-medium">20%</span> de la calificación final del curso.</p>
        ${practiceSections || '<div class="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-zinc-800 bg-[#111]"><p class="text-zinc-500">No hay alumnos inscritos en tus cursos.</p></div>'}
      </div>

      ${examSections ? `
      <div class="mb-8">
        <h2 class="font-heading text-lg font-bold text-white mb-3 flex items-center gap-2">${Icon('scrollText', 18)} Examen Práctico (evaluación)</h2>
        <p class="text-xs text-zinc-500 mb-4">Califica a los alumnos que aprobaron el examen teórico. Solo se muestran alumnos con teórico calificado.</p>
        ${examSections}
      </div>` : ''}
      <p class="text-xs text-zinc-600 mt-4">Las notas se guardan al hacer clic en "Guardar".</p>`

    document.querySelectorAll('.save-practice-grade').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement
        const enrollmentId = el.dataset.enrollment
        if (!enrollmentId) return
        const scoreInput = document.querySelector<HTMLInputElement>(`.practice-grade-score[data-enrollment="${enrollmentId}"]`)
        const noteInput = document.querySelector<HTMLInputElement>(`.practice-grade-note[data-enrollment="${enrollmentId}"]`)
        const raw = scoreInput?.value?.trim() || ''
        if (raw === '') { toast('error', 'Escribe una nota'); return }
        const v = parseFloat(raw)
        if (isNaN(v)) { toast('error', 'Nota inválida'); return }
        const score = Math.min(Math.max(v, 0), 20)
        const note = noteInput?.value?.trim() || null
        const { error } = await supabase.from('practical_grades').insert({
          enrollment_id: enrollmentId,
          coach_id: coachId,
          score,
          note,
        })
        if (error) { toast('error', error.message); return }
        toast('success', 'Nota de práctica guardada')
        void initCoachPractical()
      })
    })

    document.querySelectorAll('.delete-practice-grade').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement
        const id = el.dataset.id
        if (!id || !(await confirmDialog('¿Eliminar esta nota de práctica?', 'Eliminar'))) return
        const { error } = await supabase.from('practical_grades').delete().eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', 'Nota eliminada')
        void initCoachPractical()
      })
    })

    document.querySelectorAll('.save-practical-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement
        const studentId = el.dataset.student
        const examId = el.dataset.examId
        if (!studentId || !examId) return
        const scoreInput = document.querySelector<HTMLInputElement>(`.practical-score[data-student="${studentId}"]`)
        const score = parseInt(scoreInput?.value || '0')
        if (isNaN(score) || score < 0 || score > 20) { toast('error', 'Nota inválida (0-20)'); return }

        await supabase.from('exam_results').upsert({
          exam_id: examId,
          student_id: studentId,
          total_score: score,
          status: 'graded',
          graded_at: new Date().toISOString(),
        }, { onConflict: 'exam_id,student_id' })
        toast('success', 'Nota guardada')
      })
    })

  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
