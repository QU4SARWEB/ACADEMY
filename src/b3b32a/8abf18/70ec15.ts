import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { renderSearchableSelect, initSearchableSelect } from '@/4725dc/forms/SearchableSelect'
import { to12h } from '@/2b3583/2938a7'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function renderCoachSchedules(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachSchedules(): Promise<void> {
  try {
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .order('week_number')
      .order('day_of_week')
      .order('start_time')

    const { data: allSeasons } = await supabase
      .from('courses')
      .select('id, name, is_active')

    const { data: activeSeason } = await supabase
      .from('courses')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    const groupedBySeason: Record<string, any[]> = {}
    for (const s of schedules ?? []) {
      const key = s.seasons?.name || 'Sin curso'
      if (!groupedBySeason[key]) groupedBySeason[key] = []
      groupedBySeason[key].push(s)
    }

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Horarios</h1>
          <p class="mt-1 text-sm text-zinc-500">Gestiona los horarios académicos</p>
        </div>
        <button id="btn-new-schedule"
          class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 14)} Nuevo horario
        </button>
      </div>

      <div id="schedule-form-container" class="hidden mb-6"></div>

      <div class="space-y-6">
        ${Object.keys(groupedBySeason).length === 0
          ? '<p class="text-sm text-zinc-500">No hay horarios configurados.</p>'
          : Object.entries(groupedBySeason).map(([seasonName, seasonSchedules]: [string, any]) => `
            <div class="glass rounded-xl p-4">
              <h2 class="mb-4 font-heading text-lg font-bold text-white">${escapeHtml(seasonName)}</h2>
              ${Array.from({ length: 7 }, (_, day) => {
                const daySchedules = seasonSchedules.filter((s: any) => s.day_of_week === day)
                if (daySchedules.length === 0) return ''
                return `
                  <div class="mb-3">
                    <h3 class="mb-2 text-sm font-semibold text-zinc-400">${DAYS[day]}</h3>
                    <div class="space-y-2">
                      ${daySchedules.map((s: any) => `
                        <div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                          <div class="flex-1">
                            <span class="text-white">${escapeHtml(s.title)}</span>
                            ${s.description ? `<span class="ml-2 text-xs text-zinc-600">${escBr(s.description)}</span>` : ''}
                            <div class="mt-0.5 text-xs text-zinc-500">
                              ${s.type ? `<span class="mr-2 rounded bg-zinc-800 px-1.5 py-0.5">${escapeHtml(s.type)}</span>` : ''}
                              ${s.location ? `<span>${escapeHtml(s.location)}</span>` : ''}
                            </div>
                          </div>
                          <div class="flex items-center gap-3 shrink-0 ml-4">
                            <span class="text-xs text-zinc-400">${to12h(s.start_time?.slice(0, 5))} - ${to12h(s.end_time?.slice(0, 5))}</span>
                            <button class="btn-delete-schedule text-red-400 hover:text-red-300" data-id="${escapeHtml(s.id)}">
                              ${Icon('trash', 14)}
                            </button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>`
              }).join('')}
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    function renderScheduleForm(): string {
      const seasonOpts = (allSeasons ?? []).map((s: any) => ({
        value: s.id,
        label: `${s.name}${s.is_active ? ' (Activa)' : ''}`
      }))
      return `
        <div class="glass rounded-xl p-4">
          <h3 class="mb-3 font-medium text-white">Nuevo horario</h3>
          <form id="schedule-create-form" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Título</label>
                <input type="text" name="title" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                ${renderSearchableSelect({
                  name: 'seasonId',
                  label: 'Curso',
                  options: seasonOpts,
                  value: activeSeason?.id || '',
                  placeholder: 'Seleccionar curso...',
                  required: true,
                })}
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Semana</label>
                <input type="number" name="weekNumber" min="1" value="1"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Día de la semana</label>
                <select name="dayOfWeek" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  ${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Hora inicio</label>
                <input type="time" name="startTime" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Hora fin</label>
                <input type="time" name="endTime" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
                <select name="type"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar...</option>
                  <option value="academic">Académico</option>
                  <option value="competitive">Competitivo</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Ubicación</label>
                <input type="text" name="location"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Descripción</label>
              <textarea name="description" rows="2"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
            </div>
            <p id="schedule-form-error" class="hidden text-xs text-red-400"></p>
            <div class="flex gap-2">
              <button type="submit"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear</button>
              <button type="button" id="btn-cancel-schedule"
                class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
          </form>
        </div>`
    }

    document.getElementById('btn-new-schedule')?.addEventListener('click', () => {
      const container = document.getElementById('schedule-form-container')!
      container.innerHTML = renderScheduleForm()
      container.classList.remove('hidden')
      initSearchableSelect(container)

      document.getElementById('btn-cancel-schedule')?.addEventListener('click', () => {
        container.classList.add('hidden')
      })

      document.getElementById('schedule-create-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
        const { error } = await supabase.from('schedules').insert({
          season_id: fd.get('seasonId') as string,
          title: fd.get('title') as string,
          week_number: parseInt(fd.get('weekNumber') as string) || 1,
          day_of_week: parseInt(fd.get('dayOfWeek') as string),
          start_time: fd.get('startTime') as string,
          end_time: fd.get('endTime') as string,
          type: (fd.get('type') as string) || null,
          timezone: tz,
          location: (fd.get('location') as string) || null,
          description: (fd.get('description') as string) || null,
        })
        if (error) {
          const errEl = document.getElementById('schedule-form-error')!
          errEl.textContent = error.message
          errEl.classList.remove('hidden')
        } else {
          toast('success', 'Horario creado')
          container.classList.add('hidden')
          initCoachSchedules()
        }
      })
    })

    document.querySelectorAll('.btn-delete-schedule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id
        if (!id || !(await confirmDialog('¿Eliminar este horario?'))) return
        const { error } = await supabase.from('schedules').delete().eq('id', id)
        if (error) toast('error', error.message)
        else initCoachSchedules()
      })
    })

    if ((window as any).__channels?.schedules) {
      supabase.removeChannel((window as any).__channels.schedules)
    }
    const channel = supabase.channel('schedules-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.schedules = channel
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => initCoachSchedules()
      )
      .subscribe()
  } catch (err) {
    console.error('Error loading schedules:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horarios</p>'
  }
}
