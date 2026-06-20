import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'

export function renderCoachCourseDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachCourseDetail(): void {
  const params = router.getParams()
  const id = params.id
  if (!id) return

  ;(async () => {
    try {
      const { data: course } = await supabase
        .from('courses')
        .select('*, seasons(name)')
        .eq('id', id)
        .maybeSingle()

      if (!course) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
        return
      }

      const { data: modules } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', id)
        .order('display_order')

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles(full_name, display_name)')
        .eq('course_id', id)
        .eq('status', 'active')

      const html = `
        <div class="mb-6">
          <a href="#/coaches/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            ${Icon('arrowLeft', 16)} Volver a cursos
          </a>
          <div class="flex items-center justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((course as any).name)}</h1>
              <p class="mt-1 text-sm text-zinc-500">
                ${escapeHtml((course as any).seasons?.name || 'Sin season')} · ${(course as any).duration_months} meses · Rango mínimo: ${escapeHtml((course as any).min_rank)}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/coaches/courses/${escapeHtml(id)}/edit"
                class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 14)} Editar</a>
              <a href="#/coaches/courses/${escapeHtml(id)}/grades"
                class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Notas</a>
              <button id="delete-course-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
            </div>
          </div>
        </div>

        ${(course as any).description ? `<div class="glass mb-6 rounded-xl p-4 text-sm text-zinc-300">${escBr((course as any).description)}</div>` : ''}

        <div class="mb-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-heading text-lg font-bold text-white">Módulos (${(modules ?? []).length})</h2>
            <a href="#/coaches/courses/${escapeHtml(id)}/modules/new"
              class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('plus', 14)} Nuevo módulo
            </a>
          </div>
          <div class="space-y-2">
            ${(modules ?? []).length === 0
              ? '<p class="text-sm text-zinc-500">No hay módulos aún.</p>'
              : (modules ?? []).map((m: any) => `
                <div class="glass glass-hover rounded-xl p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-medium text-white">${escapeHtml(m.name)}</h3>
                      <p class="mt-0.5 text-xs text-zinc-500">Mes ${m.month_number} · Orden ${m.display_order}</p>
                    </div>
                    <a href="#/coaches/courses/${escapeHtml(id)}/modules/${escapeHtml(m.id)}"
                      class="text-xs text-[#8B5CF6] hover:underline">Ver</a>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <div>
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Estudiantes inscritos (${(enrollments ?? []).length})</h2>
          <div class="space-y-2">
            ${(enrollments ?? []).length === 0
              ? '<p class="text-sm text-zinc-500">No hay estudiantes inscritos.</p>'
              : (enrollments ?? []).map((e: any) => {
                  const name = e.profiles?.display_name || e.profiles?.full_name || 'Desconocido'
                  return `
                    <div class="glass rounded-lg px-4 py-3 flex items-center justify-between">
                      <span class="text-sm text-white">${escapeHtml(name)}</span>
                      <span class="text-xs text-zinc-500">${escapeHtml(e.status)}</span>
                    </div>`
                }).join('')
            }
          </div>
        </div>`

      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = html

      document.getElementById('delete-course-btn')?.addEventListener('click', async () => {
        if (!(await confirmDialog('¿Eliminar este curso? Se eliminarán todos los módulos, materiales, evaluaciones y datos asociados.'))) return
        const { error } = await supabase.from('courses').delete().eq('id', id)
        if (error) { toast('error', error.message); return }
        toast('success', 'Curso eliminado')
        router.navigate('/coaches/courses')
      })
    } catch (err) {
      console.error('Error loading course detail:', err)
      const pc = document.getElementById('page-content')
      if (pc) pc.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
    }
  })()
}
