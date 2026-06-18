import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'

export function renderPlayerSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    if (!activeSeason) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-sm text-zinc-500">No hay temporada activa.</p>'
      return
    }

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('season_id', activeSeason.id)
      .eq('type', 'competitive')
      .order('week_number')
      .order('day_of_week')
      .order('start_time')

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    const grouped: Record<number, any[]> = {}
    for (const s of schedules ?? []) {
      const day = (s as any).day_of_week
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(s)
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Horario competitivo</h1>
        <p class="mt-1 text-sm text-zinc-500">Temporada activa</p>
      </div>
      <div class="space-y-4">
        ${Object.keys(grouped).length === 0
          ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horario competitivo publicado todavía.</p></div>'
          : Array.from({ length: 7 }, (_, day) => {
              const ds = grouped[day]
              if (!ds || ds.length === 0) return ''
              return `<div class="glass rounded-xl p-4">
                <h3 class="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-white"><span class="text-green-400">${Icon('calendar', 16)}</span> ${days[day]}</h3>
                <div class="space-y-2">
                  ${ds.map((s: any) => `
                    <div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                      <div>
                        <span class="text-white">${escapeHtml(s.title)}</span>
                        ${s.week_number ? `<span class="ml-2 text-xs text-zinc-600">Sem ${s.week_number}</span>` : ''}
                      </div>
                      <span class="text-xs text-zinc-400">${s.start_time?.slice(0, 5) || '??'} - ${s.end_time?.slice(0, 5) || '??'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
