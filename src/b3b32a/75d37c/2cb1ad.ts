import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400', submitted: 'text-blue-400', reviewed: 'text-purple-400',
  graded: 'text-green-400', late: 'text-red-400',
}

export function renderStudentTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentTasks(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase.from('enrollments').select('id, course_id').eq('profile_id', session.user.id).eq('status', 'active')
    const enrolledCourseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]
    const { data: tasks } = enrolledCourseIds.length > 0
      ? await supabase.from('tasks').select('*').in('course_id', enrolledCourseIds).order('due_date', { ascending: false })
      : { data: [] }

    const enrollmentIds = (enrollments ?? []).map((e: any) => e.id)
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('task_id, status, score')
      .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])

    const smap: Record<string, any> = {}
    for (const sub of submissions ?? []) smap[sub.task_id] = sub

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p class="mt-1 text-sm text-zinc-500">${(tasks ?? []).length} tareas asignadas</p>
      </div>
      ${(tasks ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No hay tareas asignadas.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${(tasks ?? []).map((t: any) => {
            const sub = smap[t.id]
            const status = sub?.status || (new Date() > new Date(t.due_date) ? 'late' : 'pending')
            const statusLabel: Record<string, string> = { pending: 'Pendiente', submitted: 'Entregada', graded: 'Calificada', late: 'Atrasada', reviewed: 'Revisión' }
            return `
              <a href="#/students/tasks/${escapeHtml(t.id)}"
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
                  <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('calendar', 12)} Límite: ${formatDate(t.due_date)}</div>
                  ${sub?.score !== null && sub?.score !== undefined ? `<div class="flex items-center gap-2 text-xs text-green-400">${Icon('checkCircle', 12)} Nota: ${sub.score}</div>` : ''}
                </div>
                <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
                  <span class="text-xs font-medium ${statusColors[status] || 'text-zinc-500'}">${statusLabel[status] || status}</span>
                  <span class="text-xs text-zinc-500 group-hover:text-white transition">Ver →</span>
                </div>
              </a>`
          }).join('')}
        </div>`
      }`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
