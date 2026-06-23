import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderPlayerTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerTasks(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, course_id, courses(name)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]

    if (courseIds.length === 0) {
      document.getElementById('page-content')!.innerHTML = `
        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
          <p class="mt-1 text-sm text-zinc-500">No hay tareas disponibles.</p>
        </div>`
      return
    }

    const { data: modules } = await supabase
      .from('exams') 
      .select('id, course_id')
      .in('course_id', courseIds)

    const moduleIds = (modules ?? []).map((m: any) => m.id)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      
      .order('due_date', { ascending: false })

    const enrollmentIds = (enrollments ?? []).map((e: any) => e.id)
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('task_id, status')
      .in('enrollment_id', enrollmentIds)

    const submissionMap: Record<string, string> = {}
    for (const s of submissions ?? []) {
      submissionMap[s.task_id] = s.status
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p class="mt-1 text-sm text-zinc-500">${(tasks ?? []).length} tareas asignadas</p>
      </div>
      ${(tasks ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No hay tareas disponibles.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${(tasks ?? []).map((t: any) => {
            const status = submissionMap[t.id]
            const statusLabel = !status ? 'Pendiente' : status === 'submitted' ? 'Entregado' : status === 'graded' ? 'Calificado' : status
            const statusColor = !status ? 'text-yellow-400' : status === 'submitted' ? 'text-blue-400' : status === 'graded' ? 'text-green-400' : 'text-zinc-400'
            return `
              <a href="#/players/tasks/${escapeHtml(t.id)}"
                 class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group">
                <div class="flex items-center gap-3 mb-4">
                  <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                    ${Icon('clipboardList', 24)}
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 class="font-medium text-white truncate">${escapeHtml(t.title)}</h3>
                    <p class="text-xs text-zinc-500">${t.max_score ? `Máx: ${t.max_score} pts` : 'Sin puntaje'}</p>
                  </div>
                </div>
                <p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${t.description ? escapeHtml(t.description.substring(0, 80)) : 'Sin descripción'}</p>
                <div class="space-y-1 mb-3">
                  ${t.due_date ? `<div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('calendar', 12)} Límite: ${formatDate(t.due_date)}</div>` : ''}
                </div>
                <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
                  <span class="text-xs font-medium ${statusColor}">${statusLabel}</span>
                  <span class="text-xs text-zinc-500 group-hover:text-white transition">Ver →</span>
                </div>
              </a>`
          }).join('')}
        </div>`
      }`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
