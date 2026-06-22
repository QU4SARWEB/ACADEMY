import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatTimeWithTZ, getLocalTZ } from '@/2b3583/2938a7'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const SHORT_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function renderPlayerSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [{ data: seasons }, { data: schedules }] = await Promise.all([
      supabase.from('courses').select('id, name').eq('is_active', true).maybeSingle(),
      supabase.from('schedules').select('*').eq('type', 'competitive').order('day_of_week').order('start_time'),
    ])

    if (!seasons) {
      document.getElementById('page-content')!.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay temporada activa.</p></div>'
      return
    }

    const seasonScheds = (schedules ?? []).filter((s: any) => s.season_id === seasons.id)
    const today = new Date().getDay()

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('calendar', 22)} Horario competitivo</h1>
        <p class="mt-1 text-sm text-zinc-500">${escapeHtml(seasons.name)}</p>
      </div>

      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        ${DAYS.map((d, i) => {
          const hasClass = seasonScheds.some((s: any) => Number(s.day_of_week) === i)
          const isToday = i === today
          return `
            <button class="day-btn shrink-0 rounded-xl px-4 py-3 text-center transition cursor-pointer ${isToday ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30' : 'glass'} ${hasClass ? 'hover:bg-zinc-800/50' : 'opacity-40'}"
              data-day="${i}">
              <p class="text-xs font-bold ${isToday ? 'text-[#8B5CF6]' : 'text-zinc-400'}">${SHORT_DAYS[i]}</p>
              <p class="text-lg font-bold text-white">${d.charAt(0)}</p>
              <p class="text-[10px] ${hasClass ? 'text-green-400' : 'text-zinc-600'}">${hasClass ? (seasonScheds.filter(s => Number(s.day_of_week) === i).length) + ' cls' : '—'}</p>
            </button>`
        }).join('')}
      </div>

      <div class="space-y-6" id="schedule-sections">
        ${Array.from({ length: 7 }, (_, day) => {
          const dayScheds = seasonScheds.filter((s: any) => Number(s.day_of_week) === day)
          if (dayScheds.length === 0) return ''
          const isToday = day === today
          return `
            <div id="dia-${day}" class="schedule-day glass rounded-xl p-5 ${isToday ? 'ring-1 ring-green-400/30' : ''} ${isToday ? '' : 'hidden'}">
              <div class="flex items-center gap-3 mb-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl ${isToday ? 'bg-green-500/20' : 'bg-zinc-800'}">
                  ${Icon('sword', isToday ? 18 : 16)}
                </div>
                <div>
                  <h3 class="font-heading text-base font-bold text-white">${DAYS[day]}</h3>
                  <p class="text-xs text-zinc-500">${isToday ? 'Hoy' : ''} ${dayScheds.length} entrenamiento${dayScheds.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div class="space-y-2">
                ${dayScheds.map((s: any) => {
                  const startLocal = formatTimeWithTZ(s.start_time?.slice(0, 5), s.timezone)
                  const endLocal = formatTimeWithTZ(s.end_time?.slice(0, 5), s.timezone)
                  const showTZ = s.timezone && s.timezone !== getLocalTZ()
                  return `
                  <button class="sched-item w-full text-left flex items-center gap-4 rounded-lg bg-zinc-900/50 px-4 py-3 text-sm transition hover:bg-zinc-800/50 cursor-pointer"
                    data-title="${escapeHtml(s.title)}"
                    data-start="${startLocal}"
                    data-end="${endLocal}"
                    data-type="${escapeHtml(s.type || '')}"
                    data-location="${escapeHtml(s.location || '')}"
                    data-week="${s.week_number || ''}"
                    data-desc="${escBr(s.description || '')}"
                    data-tz="${showTZ ? 'local' : ''}">
                    <div class="flex flex-col items-center min-w-[52px]">
                      <span class="text-xs font-bold text-white">${startLocal}</span>
                      <span class="text-[10px] text-zinc-600">${endLocal}</span>
                      ${showTZ ? `<span class="text-[9px] text-zinc-700 mt-0.5">local</span>` : ''}
                    </div>
                    <div class="h-8 w-[2px] rounded-full ${isToday ? 'bg-green-400' : 'bg-zinc-700'}"></div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-white truncate">${escapeHtml(s.title)}</p>
                      <div class="flex flex-wrap gap-1.5 mt-0.5">
                        ${s.type ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${escapeHtml(s.type)}</span>` : ''}
                        ${s.location ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${Icon('mapPin', 10)} ${escapeHtml(s.location)}</span>` : ''}
                        ${s.week_number ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Sem ${s.week_number}</span>` : ''}
                      </div>
                    </div>
                    ${s.description ? `<span class="hidden sm:block text-xs text-zinc-600 max-w-[120px] truncate">${escBr(s.description)}</span>` : ''}
                  </button>`
                }).join('')}
              </div>
            </div>`
        }).join('')}
      </div>

      ${seasonScheds.length === 0 ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horario competitivo publicado todavía.</p></div>' : ''}
    `

    document.getElementById('page-content')!.innerHTML = html

    // Schedule item overlay
    const modalHtml = `
      <div id="sched-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-labelledby="sched-modal-title">
        <div class="glass max-w-md w-full mx-4 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 id="sched-modal-title" class="font-heading text-lg font-bold text-white"></h3>
            <button id="sched-modal-close" class="text-zinc-500 hover:text-white" aria-label="Cerrar">${Icon('x', 18)}</button>
          </div>
          <div class="space-y-3 text-sm">
            <div class="flex items-center gap-2 text-zinc-300">${Icon('clock', 16)} <span id="sched-modal-time"></span></div>
            <div id="sched-modal-type" class="flex items-center gap-2 text-zinc-300 hidden">${Icon('target', 16)} <span></span></div>
            <div id="sched-modal-location" class="flex items-center gap-2 text-zinc-300 hidden">${Icon('mapPin', 16)} <span></span></div>
            <div id="sched-modal-week" class="flex items-center gap-2 text-zinc-300 hidden">${Icon('calendar', 16)} <span></span></div>
            <div id="sched-modal-desc" class="pt-2 border-t border-zinc-700 text-zinc-400 hidden"><p class="text-sm"></p></div>
          </div>
        </div>
      </div>`
    document.getElementById('page-content')!.insertAdjacentHTML('beforeend', modalHtml)

    document.querySelectorAll('.sched-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLElement
        document.getElementById('sched-modal-title')!.textContent = el.dataset.title || ''
        document.getElementById('sched-modal-time')!.textContent = el.dataset.start + ' - ' + el.dataset.end
        const typeEl = document.getElementById('sched-modal-type')!
        if (el.dataset.type) { typeEl.classList.remove('hidden'); typeEl.querySelector('span:last-child')!.textContent = el.dataset.type }
        else typeEl.classList.add('hidden')
        const locEl = document.getElementById('sched-modal-location')!
        if (el.dataset.location) { locEl.classList.remove('hidden'); locEl.querySelector('span:last-child')!.textContent = el.dataset.location }
        else locEl.classList.add('hidden')
        const weekEl = document.getElementById('sched-modal-week')!
        if (el.dataset.week) { weekEl.classList.remove('hidden'); weekEl.querySelector('span:last-child')!.textContent = 'Semana ' + el.dataset.week }
        else weekEl.classList.add('hidden')
        const descEl = document.getElementById('sched-modal-desc')!
        if (el.dataset.desc) { descEl.classList.remove('hidden'); descEl.querySelector('p')!.textContent = el.dataset.desc }
        else descEl.classList.add('hidden')
        const modal = document.getElementById('sched-modal')!
        modal.classList.remove('hidden')
        modal.focus()
      })
    })

    // Modal controls
    const schedModal = document.getElementById('sched-modal')!
    const closeModal = () => schedModal.classList.add('hidden')
    document.getElementById('sched-modal-close')?.addEventListener('click', closeModal)
    schedModal.addEventListener('click', (e) => { if (e.target === schedModal) closeModal() })
    schedModal.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal() })
    schedModal.setAttribute('tabindex', '-1')

    document.querySelectorAll('.day-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = (btn as HTMLElement).dataset.day
        document.querySelectorAll('.schedule-day').forEach((el) => el.classList.add('hidden'))
        const target = document.getElementById('dia-' + day)
        if (target) {
          target.classList.remove('hidden')
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
        document.querySelectorAll('.day-btn').forEach((b) => {
          b.classList.remove('bg-[#8B5CF6]/20', 'border', 'border-[#8B5CF6]/30')
          b.classList.add('glass')
        })
        btn.classList.add('bg-[#8B5CF6]/20', 'border', 'border-[#8B5CF6]/30')
        btn.classList.remove('glass')
      })
    })

    const todayBtn = document.querySelector(`.day-btn[data-day="${today}"]`)
    if (todayBtn) todayBtn.scrollIntoView({ behavior: 'smooth', inline: 'center' })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
