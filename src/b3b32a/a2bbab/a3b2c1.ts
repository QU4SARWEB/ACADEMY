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
      .select('*, seasons(name)')
      .eq('id', id)
      .maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado.</p>'
      return
    }

    const { data: mods } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', id)
      .order('display_order')
    const modList = mods ?? []

    const moduleIds = modList.map((m: any) => m.id)
    const { data: mats } = await supabase
      .from('materials')
      .select('*')
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['none'])
      .order('display_order')

    const byModule: Record<string, any[]> = {}
    for (const mat of mats ?? []) {
      if (!byModule[mat.module_id]) byModule[mat.module_id] = []
      byModule[mat.module_id]!.push(mat)
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

        <div class="space-y-4">
          ${modList.length === 0
            ? '<p class="text-sm text-zinc-500">No hay módulos disponibles todavía.</p>'
            : modList.map((mod: any) => {
                const materials = byModule[mod.id] ?? []
                return `
                  <div class="glass rounded-xl p-5">
                    <div class="mb-3 flex items-center gap-3">
                      ${Icon('bookOpen', 18)}
                      <div>
                        <h2 class="font-medium text-white">${escapeHtml(mod.name)}</h2>
                        <p class="text-xs text-zinc-500">Mes ${mod.month_number}</p>
                      </div>
                    </div>
                    ${materials.length > 0
                      ? `<div class="ml-8 space-y-2">
                          ${materials.map((mat: any) => `
                            <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-2.5">
                              ${mat.type === 'video' ? Icon('play', 14) : mat.type === 'link' ? Icon('externalLink', 14) : Icon('scrollText', 14)}
                              <span class="flex-1 text-sm text-zinc-300">${escapeHtml(mat.title)}</span>
                              ${mat.url
                                ? `<a href="${escapeHtml(mat.url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-[#8B5CF6] hover:underline">
                                    ${mat.type === 'link' ? 'Abrir' : 'Descargar'}
                                  </a>`
                                : ''
                              }
                            </div>
                          `).join('')}
                        </div>`
                      : '<p class="ml-8 text-sm text-zinc-600">Sin materiales todavía.</p>'
                    }
                  </div>`
              }).join('')
          }
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading course detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el curso</p>'
  }
}
