import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { router } from '@/f3395c'

export function renderPlayerCourseDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerCourseDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado.</p>'
      return
    }

    const html = `
      <div>
        <a href="#/players/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a mis cursos
        </a>

        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(course.name)}</h1>
          <p class="mt-1 text-sm text-zinc-400">
            ${escapeHtml(course.seasons?.name || '')} · ${course.duration_months} meses · Rango mínimo: ${escapeHtml(course.min_rank)}
          </p>
          ${course.description ? `<p class="mt-2 text-sm text-zinc-300">${escBr(course.description)}</p>` : ''}
        </div>

      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
