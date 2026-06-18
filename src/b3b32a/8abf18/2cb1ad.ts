import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'

export function renderCoachTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTasks(): Promise<void> {
  try {
    const { data } = await supabase
      .from('tasks')
      .select('*, course_modules(name, course_id, courses(name))')
      .order('due_date', { ascending: false })

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
          <p class="mt-1 text-sm text-zinc-500">${(data ?? []).length} tareas</p>
        </div>
        <a href="#/coaches/tasks/new"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nueva tarea
        </a>
      </div>
      <div class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay tareas creadas.</p>'
          : (data ?? []).map((t: any) => `
            <a href="#/coaches/tasks/${escapeHtml(t.id)}"
               class="glass glass-hover flex items-center justify-between rounded-xl p-4">
              <div>
                <h3 class="font-medium text-white">${escapeHtml(t.title)}</h3>
                <p class="mt-0.5 text-sm text-zinc-500">
                  ${escapeHtml(t.course_modules?.courses?.name || 'Sin curso')} / ${escapeHtml(t.course_modules?.name || 'Sin módulo')}
                </p>
              </div>
              <div class="text-right text-xs text-zinc-500">
                <p>${t.due_date ? formatDate(t.due_date) : 'Sin fecha'}</p>
                ${t.max_score ? `<p>Máx: ${t.max_score} pts</p>` : ''}
              </div>
            </a>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    if ((window as any).__channels?.tasks) {
      supabase.removeChannel((window as any).__channels.tasks)
    }
    const channel = supabase.channel('tasks-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.tasks = channel
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') toast('info', 'Nueva tarea disponible')
          initCoachTasks()
        }
      )
      .subscribe()
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
