import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachCourses(): void {
  ;(async () => {
    try {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .order('display_order')

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']
    const [{ data: exams }, { data: enrolls }, { data: tasks }] = await Promise.all([
      supabase.from('exams').select('course_id').in('course_id', idFilter),
      supabase.from('enrollments').select('course_id').in('course_id', idFilter),
      supabase.from('tasks').select('course_id').in('course_id', idFilter),
    ])
    const examCount: Record<string, number> = {}
    const studentCount: Record<string, number> = {}
    const taskCount: Record<string, number> = {}
    for (const e of exams ?? []) { if (!examCount[e.course_id]) examCount[e.course_id] = 0; examCount[e.course_id]++ }
    for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }
    for (const t of tasks ?? []) { if (!taskCount[t.course_id]) taskCount[t.course_id] = 0; taskCount[t.course_id]++ }

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Cursos</h1>
          <p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes en ${(courses ?? []).length} cursos</p>
        </div>
        <a href="#/coaches/courses/new"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nuevo curso
        </a>
      </div>

      ${(courses ?? []).length === 0
        ? '<p class="text-sm text-zinc-500">No hay cursos creados todavía.</p>'
        : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${(courses ?? []).map((c: any) => `
            <a href="#/coaches/courses/${escapeHtml(c.id)}"
               class="glass rounded-xl p-5 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                  ${Icon('bookOpen', 24)}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-white truncate">${escapeHtml(c.name)}</h3>
                  <p class="text-xs text-zinc-500">${c.duration_months} meses</p>
                </div>
                <span class="text-xs ${c.is_active ? 'text-green-400' : 'text-zinc-500'} shrink-0">${c.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              ${c.description ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(c.description)}</p>` : '<div class="flex-1"></div>'}
              <div class="space-y-1 mb-3">
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('scrollText', 12)} ${examCount[c.id] || 0} exámenes</div>
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('clipboardList', 12)} ${taskCount[c.id] || 0} tareas</div>
                <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('users', 12)} ${studentCount[c.id] || 0} estudiantes</div>
              </div>
              <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
                <span class="text-xs text-zinc-500">${c.price && c.price > 0 ? `$${c.price}/mes` : 'Gratis'}</span>
                <button class="delete-course-btn rounded-lg border border-red-700 px-2 py-1 text-xs text-red-400 transition hover:bg-red-900/30" data-id="${escapeHtml(c.id)}" onclick="event.stopPropagation()">${Icon('trash', 12)}</button>
              </div>
            </a>
          `).join('')}
        </div>`
      }`

      const container = document.getElementById('page-content')
      if (container) container.innerHTML = html

      // --- Realtime subscription ---
      if ((window as any).__channels?.courses) {
        supabase.removeChannel((window as any).__channels.courses)
      }
      const channel = supabase.channel('courses-realtime')
      if (!(window as any).__channels) (window as any).__channels = {}
      ;(window as any).__channels.courses = channel
      channel
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'courses' },
          () => mountCoachCourses()
        )
        .subscribe()

      document.querySelectorAll('.delete-course-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          const courseId = (btn as HTMLElement).getAttribute('data-id')
          if (!courseId || !(await confirmDialog('¿Eliminar este curso? Se eliminarán todos los datos asociados.'))) return
          const { error } = await supabase.from('courses').delete().eq('id', courseId)
          if (error) { toast('error', error.message); return }
          toast('success', 'Curso eliminado')
          mountCoachCourses()
        })
      })
    } catch (err) {
      console.error('Error loading courses:', err)
      const container = document.getElementById('page-content')
      if (container) container.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
    }
  })()
}
