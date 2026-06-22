import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'

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
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!course) {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
        return
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles(full_name, display_name)')
        .eq('course_id', id)
        .eq('status', 'active')

      const html = `
        ${Breadcrumb([
          { label: 'Cursos', href: '#/coaches/courses' },
          { label: (course as any).name || 'Detalle' },
        ])}
        <div class="flex items-center justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml((course as any).name)}</h1>
              <p class="mt-1 text-sm text-zinc-500">
                ${(course as any).duration_months} meses · Rango mínimo: ${escapeHtml((course as any).min_rank)}${(course as any).price && (course as any).price > 0 ? ` · $${(course as any).price}/mes` : ' · Gratis'}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/coaches/courses/${escapeHtml(id)}/edit"
                class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 14)} Editar</a>
              <button id="delete-course-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
            </div>
          </div>
        </div>

        ${(course as any).description ? `<div class="glass mb-6 rounded-xl p-4 text-sm text-zinc-300">${escBr((course as any).description)}</div>` : ''}

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
