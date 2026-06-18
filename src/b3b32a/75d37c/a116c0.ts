import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { router } from '@/f3395c'

export function renderStudentEvaluations(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentEvaluations(): Promise<void> {
  try {
    const params = router.getParams()
    const courseId = params.id
    if (!courseId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .maybeSingle()

    const { data: mods } = await supabase
      .from('course_modules')
      .select('id, name')
      .eq('course_id', courseId)
      .order('display_order')

    const moduleIds = (mods ?? []).map((m: any) => m.id)
    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
      .order('created_at', { ascending: false })

    const byModule: Record<string, any[]> = {}
    for (const ev of evals ?? []) {
      if (!byModule[ev.module_id]) byModule[ev.module_id] = []
      byModule[ev.module_id]!.push(ev)
    }

    const html = `
      <div>
        <a href="#/students/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>

        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">Evaluaciones — ${escapeHtml(course?.name || '')}</h1>
        </div>

        <div class="space-y-6">
          ${(mods ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">No hay módulos disponibles.</p>'
            : (mods ?? []).map((mod: any) => {
                const evs = byModule[mod.id] ?? []
                if (evs.length === 0) return ''
                return `
                  <div class="glass rounded-xl p-5">
                    <h2 class="mb-4 font-heading text-base font-bold text-white">${escapeHtml(mod.name)}</h2>
                    <div class="space-y-3">
                      ${evs.map((ev: any) => `
                        <a href="#/students/evaluations/${escapeHtml(ev.id)}"
                           class="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-3 transition hover:border-zinc-700">
                          <div class="flex items-center gap-3">
                            ${Icon('clipboardList', 16)}
                            <div>
                              <span class="text-sm text-white">${escapeHtml(ev.title)}</span>
                              <span class="text-xs text-zinc-500"> · Peso: ${ev.weight}%</span>
                            </div>
                          </div>
                          ${Icon('arrowRight', 14)}
                        </a>
                      `).join('')}
                    </div>
                  </div>`
              }).join('')
          }
          ${(mods ?? []).every((m: any) => (byModule[m.id] ?? []).length === 0)
            ? '<p class="text-sm text-zinc-500">No hay evaluaciones disponibles.</p>'
            : ''
          }
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading evaluations:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar evaluaciones</p>'
  }
}
