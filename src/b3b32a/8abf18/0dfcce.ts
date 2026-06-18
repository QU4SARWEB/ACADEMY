import { Spinner, LoadingSkeleton } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderCoachCourses(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export function mountCoachCourses(): void {
  ;(async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select('*, seasons(name)')
        .order('display_order')

      const html = `
        <div class="mb-6 flex items-center justify-between">
          <h1 class="font-heading text-2xl font-bold text-white">Cursos</h1>
          <a href="#/coaches/courses/new"
            class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            ${Icon('plus', 16)} Nuevo curso
          </a>
        </div>

        <div class="space-y-3">
          ${(data ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">No hay cursos creados todavía.</p>'
            : (data ?? []).map((c: any) => `
              <a href="#/coaches/courses/${escapeHtml(c.id)}"
                 class="glass glass-hover flex items-center justify-between rounded-xl p-4">
                <div>
                  <h3 class="font-medium text-white">${escapeHtml(c.name)}</h3>
                  <p class="mt-0.5 text-sm text-zinc-500">
                    ${escapeHtml(c.seasons?.name ?? 'Sin season')} · Rango mínimo: ${escapeHtml(c.min_rank)} · ${c.duration_months} meses
                  </p>
                </div>
                <span class="text-sm ${c.is_active ? 'text-green-400' : 'text-zinc-500'}">
                  ${c.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </a>
            `).join('')
          }
        </div>`

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
    } catch (err) {
      console.error('Error loading courses:', err)
      const container = document.getElementById('page-content')
      if (container) container.innerHTML = '<p class="text-red-400 text-sm">Error al cargar cursos</p>'
    }
  })()
}
