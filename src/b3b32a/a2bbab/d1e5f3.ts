import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderPlayerCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerCourses(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(name, description, min_rank, duration_months)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const enrollIds = (enrollments ?? []).map((e: any) => e.id)
    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]

    // Task counts per course
    const { data: allTasks } = courseIds.length > 0
      ? await supabase.from('tasks').select('course_id').in('course_id', courseIds)
      : { data: [] }
    const taskCountByCourse: Record<string, number> = {}
    for (const t of allTasks ?? []) { if (!taskCountByCourse[t.course_id]) taskCountByCourse[t.course_id] = 0; taskCountByCourse[t.course_id]++ }

    // Completed submissions
    const { data: submissions } = enrollIds.length > 0
      ? await supabase.from('task_submissions').select('enrollment_id, status').in('enrollment_id', enrollIds)
      : { data: [] }
    const enrCourseMap: Record<string, string> = {}
    for (const e of enrollments ?? []) enrCourseMap[e.id] = e.course_id
    const completedByCourse: Record<string, number> = {}
    for (const s of submissions ?? []) {
      const cid = enrCourseMap[s.enrollment_id]
      if (cid && (s.status === 'submitted' || s.status === 'graded')) {
        if (!completedByCourse[cid]) completedByCourse[cid] = 0
        completedByCourse[cid]++
      }
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mis Cursos</h1>
        <p class="mt-1 text-sm text-zinc-500">Tus cursos activos</p>
      </div>
      ${(enrollments ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${(enrollments ?? []).map((e: any) => {
            const c = e.courses || {}
            const total = taskCountByCourse[c.id] || 0
            const done = completedByCourse[c.id] || 0
            return `<div class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                  ${Icon('bookOpen', 24)}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-white truncate">${escapeHtml(c.name || 'Curso')}</h3>
                  <p class="text-xs text-zinc-500">${c.duration_months || 0} meses${c.min_rank ? ' · ' + escapeHtml(c.min_rank) : ''}</p>
                </div>
              </div>
              ${c.description ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escapeHtml(c.description)}</p>` : '<div class="flex-1"></div>'}
              <div class="space-y-1 mb-3">
                ${total > 0 ? `<div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('clipboardList', 12)} ${total} tareas · ${done} realizadas</div>` : ''}
              </div>
              <div class="mt-auto pt-3 border-t border-zinc-800 text-xs text-zinc-500">${e.status}</div>
            </div>`
          }).join('')}
        </div>`
      }`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
  }
}
