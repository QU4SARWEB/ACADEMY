import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatTimeWithTZ, getLocalTZ } from '@/2b3583/2938a7'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SHORT_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function renderSchedulePage(
  schedules: any[],
  title: string,
  subtitle: string,
  iconName: string,
  accentClass: string,
  dayLabel: string,
): void {
  const jsDay = new Date().getDay()
  const today = jsDay === 0 ? 6 : jsDay - 1

  const html = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">${Icon(iconName as any, 22)} ${escapeHtml(title)}</h1>
      <p class="mt-1 text-sm text-zinc-500">${escapeHtml(subtitle)}</p>
    </div>

    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      ${DAYS.map((d, i) => {
        const hasClass = schedules.some((s: any) => Number(s.day_of_week) === i)
        const isToday = i === today
        return `
          <button class="day-btn shrink-0 rounded-xl px-4 py-3 text-center transition cursor-pointer ${isToday ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30' : 'glass'} ${hasClass ? 'hover:bg-zinc-800/50' : 'opacity-40'}"
            data-day="${i}">
            <p class="text-xs font-bold ${isToday ? 'text-[#8B5CF6]' : 'text-zinc-400'}">${SHORT_DAYS[i]}</p>
            <p class="text-lg font-bold text-white">${d.charAt(0)}</p>
            <p class="text-[10px] ${hasClass ? 'text-green-400' : 'text-zinc-600'}">${hasClass ? (schedules.filter(s => Number(s.day_of_week) === i).length) + ' ' + dayLabel : '—'}</p>
          </button>`
      }).join('')}
    </div>

    <div class="space-y-6" id="schedule-sections">
      ${Array.from({ length: 7 }, (_, day) => {
        const dayScheds = schedules.filter((s: any) => Number(s.day_of_week) === day)
        if (dayScheds.length === 0) return ''
        const isToday = day === today
        return `
          <div id="dia-${day}" class="schedule-day glass rounded-xl p-5 ${isToday ? accentClass : ''} ${isToday ? '' : 'hidden'}">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl ${isToday ? 'bg-[#8B5CF6]/20' : 'bg-zinc-800'}">
                ${Icon(iconName as any, isToday ? 18 : 16)}
              </div>
              <div>
                <h3 class="font-heading text-base font-bold text-white">${DAYS[day]}</h3>
                <p class="text-xs text-zinc-500">${isToday ? 'Hoy ' : ''}${dayScheds.length} ${dayLabel}${dayScheds.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              ${dayScheds.map((s: any) => {
                const startLocal = formatTimeWithTZ(s.start_time?.slice(0, 5), s.timezone)
                const endLocal = formatTimeWithTZ(s.end_time?.slice(0, 5), s.timezone)
                const showTZ = s.timezone && s.timezone !== getLocalTZ()
                return `
                <button class="sched-item w-full text-left glass rounded-xl p-4 flex flex-col transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer"
                  data-title="${escapeHtml(s.title)}"
                  data-start="${startLocal}"
                  data-end="${endLocal}"
                  data-type="${escapeHtml(s.type || '')}"
                  data-location="${escapeHtml(s.location || '')}"
                  data-week="${s.week_number || ''}"
                  data-desc="${escBr(s.description || '')}"
                  data-tz="${showTZ ? 'local' : ''}">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="flex flex-col items-center min-w-[56px]">
                      <span class="text-sm font-bold text-white">${startLocal}</span>
                      <span class="text-[10px] text-zinc-500">${endLocal}</span>
                      ${showTZ ? `<span class="text-[9px] text-zinc-600">local</span>` : ''}
                    </div>
                    <div class="h-10 w-[2px] rounded-full ${isToday ? 'bg-[#8B5CF6]' : 'bg-zinc-700'}"></div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-white truncate">${escapeHtml(s.title)}</p>
                      <div class="flex flex-wrap gap-1.5 mt-1">
                        ${s.type ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${escapeHtml(s.type)}</span>` : ''}
                        ${s.location ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${Icon('mapPin', 10)} ${escapeHtml(s.location)}</span>` : ''}
                        ${s.week_number ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Sem ${s.week_number}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  ${s.description ? `<p class="text-xs text-zinc-500 line-clamp-2">${escBr(s.description)}</p>` : ''}
                </button>`
              }).join('')}
            </div>
          </div>`
      }).join('')}
    </div>

    ${schedules.length === 0 ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horarios publicados.</p></div>' : ''}
  `

  document.getElementById('page-content')!.innerHTML = html

  // Schedule item overlay
  const modalHtml = `
    <div id="sched-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60" role="dialog" aria-modal="true" aria-labelledby="sched-modal-title">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="glass max-w-md w-full rounded-xl p-6">
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
      </div>
    </div>`
  document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', modalHtml)

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
}
