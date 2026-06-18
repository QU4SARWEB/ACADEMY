import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'

export function renderCoachEvaluationDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEvaluationDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: ev } = await supabase
      .from('evaluations')
      .select('*, course_modules(name, course_id, courses(name))')
      .eq('id', id)
      .maybeSingle()

    if (!ev) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Evaluación no encontrada.</p>'
      return
    }

    const { data: results } = await supabase
      .from('evaluation_results')
      .select('*, enrollments(profile_id, profiles(full_name, avatar_url))')
      .eq('evaluation_id', id)
      .order('created_at', { ascending: false })

    const html = `
      <div>
        <a href="#/coaches/evaluations" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a evaluaciones
        </a>
        <div class="mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(ev.title)}</h1>
              <p class="mt-1 text-sm text-zinc-400">
                ${escapeHtml(ev.course_modules?.courses?.name || '')} / ${escapeHtml(ev.course_modules?.name || '')}
              </p>
              <p class="text-sm text-zinc-500">
                Máx: ${ev.max_score ?? '—'} pts ${ev.eval_type ? `· Tipo: ${escapeHtml(ev.eval_type)}` : ''} ${ev.month ? `· Mes: ${ev.month}` : ''}
              </p>
              ${ev.description ? `<p class="mt-2 text-sm text-zinc-300">${escapeHtml(ev.description)}</p>` : ''}
            </div>
            <button id="delete-eval-detail-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
          </div>
        </div>

        <h2 class="mb-4 font-heading text-lg font-bold text-white">Resultados (${(results ?? []).length})</h2>
        <div class="space-y-2">
          ${(results ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">Sin resultados todavía.</p>'
            : (results ?? []).map((r: any) => {
                const profile = r.enrollments?.profiles
                return `
                  <div class="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                        ${profile?.avatar_url
                          ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : escapeHtml(profile?.full_name?.charAt(0) ?? '?')
                        }
                      </div>
                      <span class="text-sm text-white">${escapeHtml(profile?.full_name ?? '—')}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      ${r.score != null
                        ? `<span class="text-sm font-medium text-white">${r.score}/${ev.max_score}</span>`
                        : `<form class="eval-grade-form flex items-center gap-2" data-result-id="${escapeHtml(r.id)}">
                            <input name="score" type="number" min="0" max="${ev.max_score}" placeholder="Nota"
                              class="w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-center text-sm text-white outline-none focus:border-[#8B5CF6]" />
                            <button type="submit"
                              class="rounded bg-[#8B5CF6] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
                              Calificar
                            </button>
                          </form>`
                      }
                    </div>
                  </div>`
              }).join('')
          }
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('delete-eval-detail-btn')?.addEventListener('click', async () => {
      if (!(await confirmDialog('¿Eliminar esta evaluación? También se eliminarán todos los resultados asociados.'))) return
      const { error } = await supabase.from('evaluations').delete().eq('id', id)
      if (error) { toast('error', error.message); return }
      toast('success', 'Evaluación eliminada')
      router.navigate('/coaches/evaluations')
    })

    document.querySelectorAll('.eval-grade-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const resultId = (e.target as HTMLElement).getAttribute('data-result-id')
        if (!resultId) return

        const { error } = await supabase
          .from('evaluation_results')
          .update({ score: parseFloat(fd.get('score') as string) })
          .eq('id', resultId)

        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Calificación guardada')
          router.navigate(`/coaches/evaluations/${id}`)
        }
      })
    })
  } catch (err) {
    console.error('Error loading evaluation detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar evaluación</p>'
  }
}
