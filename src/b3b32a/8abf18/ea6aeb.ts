import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderCoachPromotions(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPromotions(): Promise<void> {
  try {
    const { data } = await supabase
      .from('promotions')
      .select('*, from_course:from_course_id(name), to_course:to_course_id(name), profiles(full_name, avatar_url), promoter:promoted_by(full_name)')
      .order('created_at', { ascending: false })

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Promociones</h1>
        <p class="mt-1 text-sm text-zinc-500">Historial de promociones de estudiantes</p>
      </div>
      <div class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay promociones registradas.</p>'
          : (data ?? []).map((p: any) => {
              const name = p.profiles?.full_name || 'Desconocido'
              const initial = name[0]
              const fromName = p.from_course?.name || '?'
              const toName = p.to_course?.name || '?'
              const promoterName = p.promoter?.full_name || '?'
              return `
                <div class="glass rounded-xl p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6]">${escapeHtml(initial)}</div>
                      <div>
                        <h3 class="font-medium text-white">${escapeHtml(name)}</h3>
                        <p class="mt-0.5 text-xs text-zinc-400">
                          ${escapeHtml(fromName)} → ${escapeHtml(toName)}
                        </p>
                      </div>
                    </div>
                    <div class="text-right text-xs text-zinc-500">
                      <p>${escapeHtml(promoterName)}</p>
                      <p>${p.created_at ? formatDate(p.created_at) : ''}</p>
                      ${p.grade_at_time != null ? `<p>Nota: ${p.grade_at_time}</p>` : ''}
                      ${p.rank_at_time ? `<p>Rango: ${escapeHtml(p.rank_at_time)}</p>` : ''}
                    </div>
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading promotions:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar promociones</p>'
  }
}
