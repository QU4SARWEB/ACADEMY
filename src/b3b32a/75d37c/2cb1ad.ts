import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { renderTaskGridHtml } from '@/b3b32a/shared/taskList'

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
      ${renderTaskGridHtml(tasks ?? [], smap, '/students')}`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}
