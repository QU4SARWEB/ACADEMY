import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { renderTaskGridHtml } from '@/b3b32a/shared/taskList'

export function renderPlayerTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerTasks(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, course_id')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]
    const { data: tasks } = courseIds.length > 0
      ? await supabase.from('tasks').select('*').in('course_id', courseIds).order('due_date', { ascending: false })
      : { data: [] }

    const enrollmentIds = (enrollments ?? []).map((e: any) => e.id)
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('task_id, status, score')
      .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])

    const smap: Record<string, any> = {}
    for (const s of submissions ?? []) smap[s.task_id] = s

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
        <p class="mt-1 text-sm text-zinc-500">${(tasks ?? []).length} tareas asignadas</p>
      </div>
      ${renderTaskGridHtml(tasks ?? [], smap, '/players')}`
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
