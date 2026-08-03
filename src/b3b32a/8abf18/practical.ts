import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
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
      return `
      <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-course-id="${escapeHtml(courseId)}">
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml((s.full_name || '?').charAt(0).toUpperCase())}</div>
            <span class="text-sm text-white">${escapeHtml(s.full_name || '')}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-zinc-400">${escapeHtml(s.email || '')}</td>
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

      // Find theoretical final exam for this course
      const { data: theoryExam } = await supabase
        .from('exams')
        .select('id')
        .eq('course_id', c.id)
        .eq('is_final', true)
        .ilike('title', '%teorico%')
        .maybeSingle()

      // Get students who have graded the theoretical exam
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
        .select('id, full_name, email')
        .in('id', studentIds)
        .order('full_name')

      // Get existing practical results
      const { data: existingResults } = await supabase
        .from('exam_results')
        .select('student_id, total_score, status')
        .eq('exam_id', ex.id)

      const resultsMap = new Map<string, any>()
      for (const r of existingResults ?? []) resultsMap.set(r.student_id, r)

      // Assign resultsMap to exam for the render function
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

    const sections = courseSections.filter(Boolean).join('')

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6">
        <span class="kicker">Evaluaciones en juego</span>
        <h1 class="font-heading text-2xl font-bold text-white">Ex\u00e1menes Pr\u00e1cticos</h1>
        <p class="mt-1 text-sm text-zinc-500">Califica a los alumnos que aprobaron el examen te\u00f3rico. Solo se muestran alumnos con te\u00f3rico calificado.</p>
      </div>
      ${sections || '<div class="flex flex-col items-center justify-center py-20 text-center"><p class="text-zinc-500">No hay alumnos con te\u00f3rico aprobado a\u00fan.</p></div>'}
      <p class="text-xs text-zinc-600 mt-4">La nota del examen pr\u00e1ctico es sobre 20. El coach decide cu\u00e1ndo calificar a cada alumno.</p>`

    // Save practical grade
    document.querySelectorAll('.save-practical-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const el = btn as HTMLElement
        const studentId = el.dataset.student
        const examId = el.dataset.examId
        if (!studentId || !examId) return
        const scoreInput = document.querySelector<HTMLInputElement>(`.practical-score[data-student="${studentId}"]`)
        const score = parseInt(scoreInput?.value || '0')
        if (isNaN(score) || score < 0 || score > 20) { toast('error', 'Nota inv\u00e1lida (0-20)'); return }

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
