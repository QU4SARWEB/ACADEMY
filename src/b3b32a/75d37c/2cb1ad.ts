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
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: false })

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
        <p class="mt-1 text-sm text-zinc-500">Tus tareas asignadas</p>
      </div>
      <div class="space-y-3">
        ${(tasks ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay tareas asignadas.</p>'
          : (tasks ?? []).map((t: any) => {
              const sub = smap[t.id]
              const status = sub?.status || (new Date() > new Date(t.due_date) ? 'late' : 'pending')
              return `
                <a href="#/students/tasks/${escapeHtml(t.id)}"
                   class="glass glass-hover flex items-center justify-between rounded-xl p-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-3">
                      <h3 class="font-medium text-white">${escapeHtml(t.title)}</h3>
                      <span class="text-xs ${statusColors[status] || 'text-zinc-500'}">${escapeHtml(status)}</span>
                    </div>
                    <p class="mt-0.5 text-sm text-zinc-500">
                      Límite: ${formatDate(t.due_date)}
                    </p>
                  </div>
                </a>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
