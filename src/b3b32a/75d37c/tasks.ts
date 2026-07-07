import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { loadAndRenderTasks } from '@/b3b32a/shared/tasks'

export function renderStudentTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentTasks(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    await loadAndRenderTasks('page-content', session.user.id, 'student')
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
