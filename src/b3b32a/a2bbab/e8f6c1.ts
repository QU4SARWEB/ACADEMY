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
      .from('course_modules')
      .select('id, course_id')
      .in('course_id', courseIds)

    const moduleIds = (modules ?? []).map((m: any) => m.id)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, course_modules(name, course_id, courses(name))')
      .in('module_id', moduleIds)
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
        <p class="mt-1 text-sm text-zinc-500">Tus tareas y entregas</p>
      </div>
      <div class="space-y-3">
        ${(tasks ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay tareas disponibles.</p>'
          : (tasks ?? []).map((t: any) => {
              const status = submissionMap[t.id]
              const statusBadge = !status
                ? '<span class="rounded bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Pendiente</span>'
                : status === 'submitted'
                  ? '<span class="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">Entregado</span>'
                  : status === 'graded'
                    ? '<span class="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Calificado</span>'
                    : `<span class="rounded bg-zinc-500/20 px-2 py-0.5 text-xs text-zinc-400">${escapeHtml(status)}</span>`
              return `
                <a href="#/players/tasks/${escapeHtml(t.id)}"
                  class="glass block rounded-xl p-4 transition hover:bg-zinc-800/50">
                  <div class="flex items-center justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-medium text-white truncate">${escapeHtml(t.title)}</h3>
                        ${statusBadge}
                      </div>
                      <p class="mt-0.5 text-sm text-zinc-500">
                        ${escapeHtml(t.course_modules?.courses?.name || '')} / ${escapeHtml(t.course_modules?.name || '')}
                      </p>
                    </div>
                    <div class="shrink-0 ml-4 text-right text-xs text-zinc-500">
                      <p>${t.due_date ? formatDate(t.due_date) : 'Sin fecha'}</p>
                      ${t.max_score ? `<p>Máx: ${t.max_score} pts</p>` : ''}
                    </div>
                  </div>
                </a>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
