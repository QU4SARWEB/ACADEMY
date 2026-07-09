import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatTimeWithTZ, getLocalTZ } from '@/2b3583/2938a7'

function formatDateLocal(d: string): string {
  if (!d) return '—'
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDateLabel(d: string): string {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getMonthKey(d: string): string {
  const dt = new Date(d + 'T12:00:00')
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function getDateFromSchedule(s: any): string {
  return s.schedule_date || ''
}

export function renderSchedulePage(
  schedules: any[],
  title: string,
  subtitle: string,
  iconName: string,
  accentClass: string,
  dayLabel: string,
): void {
  const now = new Date()
  let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  function render(): void {
    const monthKey = getMonthKey(currentMonth.toISOString().slice(0, 10))
    const monthSchedules = schedules.filter((s: any) => {
      const sd = getDateFromSchedule(s)
      return sd && getMonthKey(sd) === monthKey
    })

    // Week filtering
    const scheduleWeeks = [...new Set(monthSchedules.map((s: any) => s.week_number).filter((w: any) => w > 0))].sort()
    let currentWeek: number | null = scheduleWeeks.length > 0 ? scheduleWeeks[0] : null
    const savedWeek = sessionStorage.getItem('studentScheduleWeek')
    if (savedWeek && scheduleWeeks.includes(parseInt(savedWeek))) currentWeek = parseInt(savedWeek)
    const filteredSchedules = currentWeek ? monthSchedules.filter((s: any) => s.week_number === currentWeek) : monthSchedules

    const schedWeekHtml = scheduleWeeks.length > 1 ? `
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-zinc-500 mr-1">Semana:</span>
        <button class="sched-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300" data-week="all">${Icon('calendar', 12)} Todas</button>
        ${scheduleWeeks.map((w: number) => `
          <button class="sched-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${w === currentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="${w}">${Icon('calendar', 12)} Semana ${w}</button>
        `).join('')}
      </div>` : ''

    const schedByDate: Record<string, any[]> = {}
    for (const s of filteredSchedules) {
      const sd = getDateFromSchedule(s)
      if (!sd) continue
      if (!schedByDate[sd]) schedByDate[sd] = []
      schedByDate[sd].push(s)
    }

    const sortedDates = Object.keys(schedByDate).sort()

    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      const dayScheds = schedByDate[date]
      return `
      <div class="glass rounded-xl p-5 mb-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/20">
            ${Icon(iconName as any, 18)}
          </div>
          <div>
            <h3 class="font-heading text-base font-bold text-white">${escapeHtml(getDateLabel(date))}</h3>
            <p class="text-xs text-zinc-500">${dayScheds.length} ${dayLabel}${dayScheds.length !== 1 ? 's' : ''}</p>
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
                <div class="h-10 w-[2px] rounded-full bg-[#8B5CF6]"></div>
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
    }).join('')

    const monthLabel = currentMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${Icon(iconName as any, 22)} ${escapeHtml(title)}</h1>
        <p class="mt-1 text-sm text-zinc-500">${escapeHtml(subtitle)}</p>
      </div>
      <div class="mb-4 flex items-center gap-3">
        <button id="btn-prev-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
        <span class="text-sm font-semibold text-white capitalize">${monthLabel}</span>
        <button id="btn-next-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
      </div>
      ${schedWeekHtml}
      ${dateSections || '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horarios este mes.</p></div>'}
      ${schedules.length === 0 ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay horarios publicados.</p></div>' : ''}`

    document.getElementById('page-content')!.innerHTML = html
    bindEvents()
  }

  function bindEvents(): void {
    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
      render()
    })
    document.getElementById('btn-next-month')?.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      render()
    })

    document.querySelectorAll('.sched-week-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const week = (btn as HTMLElement).dataset.week
        if (week === 'all') sessionStorage.removeItem('studentScheduleWeek')
        else sessionStorage.setItem('studentScheduleWeek', week!)
        render()
      })
    })

    // Schedule item modal
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
  }

  render()
}
