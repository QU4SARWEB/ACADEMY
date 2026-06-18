import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderStudentSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentSchedule(): Promise<void> {
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
      .eq('type', 'academic')
      .order('week_number')
      .order('day_of_week')
      .order('start_time')

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Mi Horario</h1>
      </div>
      <div class="space-y-4">
        ${(schedules ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay horarios disponibles.</p>'
          : Array.from({ length: 7 }, (_, day) => {
              const dayScheds = (schedules ?? []).filter((s: any) => s.day_of_week === day)
              if (dayScheds.length === 0) return ''
              return `
                <div class="glass rounded-xl p-4">
                  <h3 class="mb-3 font-heading text-sm font-bold text-white">${days[day]}</h3>
                  <div class="space-y-2">
                    ${dayScheds.map((s: any) => `
                      <div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                        <div>
                          <span class="text-white">${escapeHtml(s.title)}</span>
                          ${s.description ? `<p class="text-xs text-zinc-500">${escapeHtml(s.description)}</p>` : ''}
                        </div>
                        <span class="shrink-0 text-xs text-zinc-400">Sem ${s.week_number} · ${s.start_time?.slice(0, 5) || '??'} - ${s.end_time?.slice(0, 5) || '??'}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading schedule:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
