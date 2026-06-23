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

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${examList.length === 0
            ? '<p class="text-sm text-zinc-500 col-span-full">No hay exámenes disponibles.</p>'
            : examList.map((exam: any) => {
                const attempt = attemptsByExam[exam.id]
                const subCount = (window as any).__examSubmittedCount?.[exam.id] || 0
                const canRetry = subCount < (exam.max_attempts ?? 1)
                const isInProgress = attempt?.status === 'in_progress'
                const showAction = !!enrollment && (canRetry || isInProgress)
                const actionLabel = isInProgress ? 'Continuar' : attempt ? 'Reintentar' : 'Iniciar'
                const passed = attempt && (attempt.score ?? 0) >= (exam.passing_score ?? 12)
                return `
                  <div class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5">
                    <div class="flex items-center gap-3 mb-4">
                      <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                        ${Icon('scrollText', 24)}
                      </div>
                      <div class="min-w-0 flex-1">
                        <h3 class="font-medium text-white truncate">${escapeHtml(exam.title)}</h3>
                        <p class="text-xs text-zinc-500">${exam.max_attempts ? `${exam.max_attempts} intento(s)` : 'Sin límite'}</p>
                      </div>
                    </div>
                    ${exam.description ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(exam.description.substring(0, 80))}</p>` : '<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">Sin descripción</p>'}
                    <div class="space-y-1 mb-3">
                      <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('clock', 12)} ${exam.time_limit || 300} min</div>
                      <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('target', 12)} Mín: ${exam.passing_score}/20</div>
                      ${exam.due_date ? `<div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('calendar', 12)} Vence: ${formatDate(exam.due_date)}</div>` : ''}
                    </div>
                    <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
                      ${attempt
                        ? `<span class="text-xs font-medium ${passed ? 'text-green-400' : 'text-yellow-400'}">${attempt.score ?? '—'}/20</span>`
                        : '<span class="text-xs text-zinc-500">Sin intento</span>'
                      }
                      ${showAction
                        ? `<a href="#/students/courses/${escapeHtml(id)}/exams/${escapeHtml(exam.id)}" class="btn-glow flex items-center gap-1 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('play', 12)} ${actionLabel}</a>`
                        : ''
                      }
                    </div>
                  </div>`
              }).join('')
          }
        </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}
