import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { router } from '@/f3395c'

export function renderStudentExamList(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentExamList(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    const { data: examsAll } = await supabase
      .from('exams')
      .select('*')
      .eq('course_id', id)
      .order('created_at', { ascending: false })

    // Also fetch individually assigned exams
    const { data: myAssignments } = await supabase
      .from('exam_assignments')
      .select('exam_id')
      .eq('profile_id', session.user.id)
    const assignExamIds = (myAssignments ?? []).map((a: any) => a.exam_id).filter((id: string) => !examsAll?.some((e: any) => e.id === id))
    let assignedExams: any[] = []
    if (assignExamIds.length > 0) {
      const { data: ae } = await supabase.from('exams').select('*').in('id', assignExamIds)
      assignedExams = ae ?? []
    }
    const examList = [...(examsAll ?? []), ...assignedExams].filter((e: any) => e.is_published)

    let enrollment: any = null
    let attemptsByExam: Record<string, any> = {}
    if (examList.length > 0) {
      const { data: enr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', id)
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()
      enrollment = enr

      if (enr) {
        const examIds = examList.map((e: any) => e.id)
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('*')
          .in('exam_id', examIds.length > 0 ? examIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('enrollment_id', enr.id)
        // Track last attempt AND submitted count per exam
        const lastAttempt: Record<string, any> = {}
        const submittedCount: Record<string, number> = {}
        for (const a of attempts ?? []) {
          lastAttempt[a.exam_id] = a
          if (a.status === 'submitted' || a.status === 'graded') {
            submittedCount[a.exam_id] = (submittedCount[a.exam_id] || 0) + 1
          }
        }
        attemptsByExam = lastAttempt
        ;(window as any).__examSubmittedCount = submittedCount
      }
    }

    const html = `
      <div>
        <a href="#/students/courses/${escapeHtml(id)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>

        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">Exámenes — ${escapeHtml(course?.name || '')}</h1>
        </div>

        <div class="space-y-3">
          ${examList.length === 0
            ? '<p class="text-sm text-zinc-500">No hay exámenes disponibles.</p>'
            : examList.map((exam: any) => {
                const attempt = attemptsByExam[exam.id]
                return `
                  <div class="glass rounded-xl p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <h2 class="text-base font-semibold text-white">${escapeHtml(exam.title)}</h2>
                        ${exam.description ? `<p class="mt-1 text-sm text-zinc-400">${escBr(exam.description)}</p>` : ''}
                        <div class="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                          <span>Tiempo: ${exam.time_limit || 300} min</span>
                          <span>Nota mínima: ${exam.passing_score}/20</span>
                          ${exam.max_attempts ? `<span>Intentos: ${exam.max_attempts}</span>` : ''}
                          ${exam.due_date ? `<span>Vence: ${formatDate(exam.due_date)}</span>` : ''}
                        </div>
                        ${attempt
                          ? `<p class="mt-2 text-sm ${(attempt.score ?? 0) >= (exam.passing_score ?? 12) ? 'text-green-400' : 'text-yellow-400'}">
                              Puntaje: ${attempt.score ?? '—'}/20
                            </p>`
                          : ''
                        }
                      </div>
                      ${(() => {
                        const subCount = (window as any).__examSubmittedCount?.[exam.id] || 0
                        const canRetry = subCount < (exam.max_attempts ?? 1)
                        const isInProgress = attempt?.status === 'in_progress'
                        if (!enrollment) return ''
                        if (canRetry || isInProgress) {
                          const label = isInProgress ? 'Continuar' : attempt ? 'Reintentar' : 'Iniciar'
                          return `<a href="#/students/courses/${escapeHtml(id)}/exams/${escapeHtml(exam.id)}"
                               class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                              ${Icon('play', 16)} ${label}
                            </a>`
                        }
                        return ''
                      })()}
                    </div>
                  </div>`
              }).join('')
          }
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}
