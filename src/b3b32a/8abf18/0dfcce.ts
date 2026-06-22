import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
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
      const { data: exams } = await supabase.from('exams').select('course_id').in('course_id', idFilter)
      const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', idFilter)
      const examCount: Record<string, number> = {}
      const studentCount: Record<string, number> = {}
      for (const e of exams ?? []) { if (!examCount[e.course_id]) examCount[e.course_id] = 0; examCount[e.course_id]++ }
      for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }

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
          : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${(courses ?? []).map((c: any) => `
              <a href="#/coaches/courses/${escapeHtml(c.id)}"
                 class="glass rounded-xl p-5 transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 block">
                <div class="flex items-start justify-between">
                  <div class="min-w-0 flex-1">
                    <h3 class="font-medium text-white truncate">${escapeHtml(c.name)}</h3>
                    <p class="mt-1 text-sm text-zinc-500">
                      ${examCount[c.id] || 0} exámenes · ${studentCount[c.id] || 0} estudiantes
                    </p>
                    <p class="mt-0.5 text-xs text-zinc-600">
                      ${escapeHtml(c.min_rank || 'Sin rango')} · ${c.duration_months} meses
                    </p>
                    ${c.price && c.price > 0
                      ? `<span class="mt-2 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">$${c.price}/mes</span>`
                      : `<span class="mt-2 inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Gratis</span>`
                    }
                  </div>
                  <div class="flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span class="text-xs ${c.is_active ? 'text-green-400' : 'text-zinc-500'}">${c.is_active ? 'Activo' : 'Inactivo'}</span>
                    <button class="delete-course-btn rounded-lg border border-red-700 px-2 py-1 text-xs text-red-400 transition hover:bg-red-900/30" data-id="${escapeHtml(c.id)}">${Icon('trash', 12)}</button>
                  </div>
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
