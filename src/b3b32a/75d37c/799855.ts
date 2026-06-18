import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatTimeWithTZ, getLocalTZ } from '@/2b3583/2938a7'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const SHORT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function renderStudentSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [{ data: seasons }, { data: schedules }] = await Promise.all([
      supabase.from('seasons').select('id, name').eq('is_active', true).maybeSingle(),
      supabase.from('schedules').select('*').eq('type', 'academic').order('day_of_week').order('start_time'),
    ])

    if (!seasons) {
      document.getElementById('page-content')!.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay temporada activa.</p></div>'
      return
    }

    const seasonScheds = (schedules ?? []).filter((s: any) => s.season_id === seasons.id)

    const today = new Date().getDay()
    const todayName = DAYS[today]

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('calendar', 22)} Horario académico</h1>
        <p class="mt-1 text-sm text-zinc-500">${escapeHtml(seasons.name)}</p>
      </div>

      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        ${DAYS.map((d, i) => {
          const hasClass = seasonScheds.some((s: any) => s.day_of_week === i)
          const isToday = i === today
          return `
            <a href="#dia-${i}" class="scroll-to-day shrink-0 rounded-xl px-4 py-3 text-center transition cursor-pointer ${isToday ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30' : 'glass'} ${hasClass ? 'hover:bg-zinc-800/50' : 'opacity-40'}">
              <p class="text-xs font-bold ${isToday ? 'text-[#8B5CF6]' : 'text-zinc-400'}">${SHORT_DAYS[i]}</p>
              <p class="text-lg font-bold text-white">${d.charAt(0)}</p>
              <p class="text-[10px] ${hasClass ? 'text-green-400' : 'text-zinc-600'}">${hasClass ? (seasonScheds.filter(s => s.day_of_week === i).length) + ' cls' : '—'}</p>
            </a>`
        }).join('')}
      </div>

      <div class="space-y-6">
        ${seasonScheds.length === 0
          ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horarios publicados para esta temporada.</p></div>'
          : Array.from({ length: 7 }, (_, day) => {
              const dayScheds = seasonScheds.filter((s: any) => s.day_of_week === day)
              if (dayScheds.length === 0) return ''
              const isToday = day === today
              return `
                <div id="dia-${day}" class="glass rounded-xl p-5 ${isToday ? 'ring-1 ring-[#8B5CF6]/30' : ''}">
                  <div class="flex items-center gap-3 mb-4">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl ${isToday ? 'bg-[#8B5CF6]/20' : 'bg-zinc-800'}">
                      ${Icon('calendar', isToday ? 18 : 16)}
                    </div>
                    <div>
                      <h3 class="font-heading text-base font-bold text-white">${DAYS[day]}</h3>
                      <p class="text-xs text-zinc-500">${isToday ? 'Hoy' : ''} ${dayScheds.length} clase${dayScheds.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div class="space-y-2">
                    ${dayScheds.map((s: any) => {
                      const startLocal = formatTimeWithTZ(s.start_time?.slice(0, 5), s.timezone)
                      const endLocal = formatTimeWithTZ(s.end_time?.slice(0, 5), s.timezone)
                      const showTZ = s.timezone && s.timezone !== getLocalTZ()
                      return `
                      <div class="flex items-center gap-4 rounded-lg bg-zinc-900/50 px-4 py-3 text-sm transition hover:bg-zinc-800/50">
                        <div class="flex flex-col items-center min-w-[52px]">
                          <span class="text-xs font-bold text-white">${startLocal}</span>
                          <span class="text-[10px] text-zinc-600">${endLocal}</span>
                          ${showTZ ? `<span class="text-[9px] text-zinc-700 mt-0.5">local</span>` : ''}
                        </div>
                        <div class="h-8 w-[2px] rounded-full ${isToday ? 'bg-[#8B5CF6]' : 'bg-zinc-700'}"></div>
                        <div class="flex-1 min-w-0">
                          <p class="font-medium text-white truncate">${escapeHtml(s.title)}</p>
                          <div class="flex flex-wrap gap-1.5 mt-0.5">
                            ${s.type ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${escapeHtml(s.type)}</span>` : ''}
                            ${s.location ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">📍 ${escapeHtml(s.location)}</span>` : ''}
                            ${s.week_number ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Sem ${s.week_number}</span>` : ''}
                          </div>
                        </div>
                        ${s.description ? `<span class="hidden sm:block text-xs text-zinc-600 max-w-[120px] truncate" title="${escapeHtml(s.description)}">${escapeHtml(s.description)}</span>` : ''}
                      </div>`
                    }).join('')}
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // Scroll to today on load
    document.querySelector('.scroll-to-day')?.scrollIntoView({ behavior: 'smooth', inline: 'center' })
  } catch (err) {
    console.error('Error loading schedule:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
