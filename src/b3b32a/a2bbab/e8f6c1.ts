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

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, course_modules(name, course_id, courses(name))')
      .order('due_date', { ascending: false })

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p class="mt-1 text-sm text-zinc-500">Tus tareas y entregas</p>
      </div>
      <div class="space-y-3">
        ${(tasks ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay tareas disponibles.</p>'
          : (tasks ?? []).map((t: any) => `
            <div class="glass rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium text-white">${escapeHtml(t.title)}</h3>
                  <p class="mt-0.5 text-sm text-zinc-500">
                    ${escapeHtml(t.course_modules?.courses?.name || '')} / ${escapeHtml(t.course_modules?.name || '')}
                  </p>
                </div>
                <div class="text-right text-xs text-zinc-500">
                  <p>${t.due_date ? formatDate(t.due_date) : 'Sin fecha'}</p>
                  ${t.max_score ? `<p>Máx: ${t.max_score} pts</p>` : ''}
                </div>
              </div>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
