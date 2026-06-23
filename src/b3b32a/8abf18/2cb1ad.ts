import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTasks(): Promise<void> {
  try {
    const { data: courses } = await supabase.from('courses').select('id, name').order('name')
    const allCourses = courses ?? []
    const courseMap = new Map(allCourses.map((c: any) => [c.id, c.name]))

    const { data } = await supabase
      .from('tasks')
      .select('*')
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

      <div class="mb-4">
        <div class="flex flex-wrap gap-2" id="task-course-filter">
          <button type="button" class="task-filter-btn rounded-xl border px-3 py-1.5 text-xs transition border-[#8B5CF6] bg-[#8B5CF6]/20 text-white" data-course-id="">Todos</button>
          ${allCourses.map((c: any) => `
            <button type="button" class="task-filter-btn rounded-xl border px-3 py-1.5 text-xs transition hover:border-[#8B5CF6] hover:text-white border-zinc-700 text-zinc-300 hover:text-white bg-zinc-900/50"
              data-course-id="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>
          `).join('')}
        </div>
      </div>

      <div id="task-list" class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay tareas creadas.</p>'
          : (data ?? []).map((t: any) => renderTaskItem(t, courseMap)).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // Task filter buttons
    document.getElementById('task-course-filter')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.task-filter-btn') as HTMLElement
      if (!btn) return
      document.querySelectorAll('.task-filter-btn').forEach(b => {
        b.classList.remove('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
        b.classList.add('border-zinc-700', 'text-zinc-300')
      })
      btn.classList.add('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
      btn.classList.remove('border-zinc-700', 'text-zinc-300')
      const courseId = btn.dataset.courseId || ''
      const filtered = !courseId ? (data ?? []) : (data ?? []).filter((t: any) => t.course_id === courseId)
      document.getElementById('task-list')!.innerHTML = filtered.length === 0
        ? '<p class="text-sm text-zinc-500">No hay tareas para este curso.</p>'
        : filtered.map((t: any) => renderTaskItem(t, courseMap)).join('')
    })

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

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const taskId = (btn as HTMLElement).getAttribute('data-id')
        if (!taskId || !(await confirmDialog('¿Eliminar esta tarea y todas sus entregas?'))) return
        const { error } = await supabase.from('tasks').delete().eq('id', taskId)
        if (error) { toast('error', error.message); return }
        toast('success', 'Tarea eliminada')
        initCoachTasks()
      })
    })
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}

function renderTaskItem(t: any, courseMap?: Map<string, string>): string {
  return `
    <div class="glass glass-hover flex items-center justify-between rounded-xl p-4">
      <a href="#/coaches/tasks/${escapeHtml(t.id)}" class="flex-1 min-w-0">
        <h3 class="font-medium text-white">${escapeHtml(t.title)}</h3>
        <p class="mt-0.5 text-sm text-zinc-500">
          ${courseMap?.get(t.course_id) ? escapeHtml(courseMap.get(t.course_id)!) + ' · ' : ''}${t.due_date ? `Límite: ${formatDate(t.due_date)}` : ''}${t.max_score ? ` · Máx: ${t.max_score} pts` : ''}
        </p>
      </a>
      <div class="flex items-center gap-3 shrink-0">
        <div class="text-right text-xs text-zinc-500">
          <p>${t.due_date ? formatDate(t.due_date) : 'Sin fecha'}</p>
          ${t.max_score ? `<p>Máx: ${t.max_score} pts</p>` : ''}
        </div>
        <button class="delete-task-btn rounded-lg border border-red-700 px-2 py-1 text-xs text-red-400 transition hover:bg-red-900/30" data-id="${escapeHtml(t.id)}">${Icon('trash', 12)}</button>
      </div>
    </div>`
}
