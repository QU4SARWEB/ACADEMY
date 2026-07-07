import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { to12h } from '@/2b3583/2938a7'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function renderCoachSchedules(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

let allCoursesCache: any[] = []
let allSchedulesCache: any[] = []

export async function initCoachSchedules(): Promise<void> {
  try {
    const [{ data: schedules }, { data: allCourses }] = await Promise.all([
      supabase.from('schedules').select('*').order('week_number').order('day_of_week').order('start_time'),
      supabase.from('courses').select('id, name, description, duration_months, price, display_order, is_active').eq('is_active', true).order('display_order'),
    ])
    allSchedulesCache = schedules ?? []
    allCoursesCache = allCourses ?? []
    renderScheduleTable()
  } catch (err) {
    console.error('Error loading schedules:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horarios</p>'
  }
}

function renderScheduleTable(): void {
  const courseMap = new Map(allCoursesCache.map((c: any) => [c.id, c]))

  const schedCount: Record<string, number> = {}
  for (const s of allSchedulesCache) {
    const cid = s.course_id
    if (cid) { if (!schedCount[cid]) schedCount[cid] = 0; schedCount[cid]++ }
  }

  const filterHtml = allCoursesCache.map((c: any) => {
    const total = schedCount[c.id] || 0
    return `
    <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
      bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
      data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-course-count="${total}" data-active="1">
      ${Icon('checkCircle', 14)}
      <span>${escapeHtml(c.name)}</span>
      <span class="text-zinc-500">${total}</span>
    </button>`
  }).join('')

  const rows = allSchedulesCache.length === 0
    ? '<tr><td colspan="4" class="py-8 text-center text-sm text-zinc-500">No hay horarios registrados.</td></tr>'
    : allSchedulesCache.map((s: any) => {
        const course = courseMap.get(s.course_id)
        return `
        <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50" data-course-id="${escapeHtml(s.course_id)}">
          <td class="py-3 px-4 text-sm text-zinc-300">${DAYS[s.day_of_week] || '—'}</td>
          <td class="py-3 px-4 text-sm text-white">${escapeHtml(course?.name || 'Desconocido')}</td>
          <td class="py-3 px-4 text-sm text-zinc-400">${s.start_time ? to12h(s.start_time.slice(0, 5)) : '—'} - ${s.end_time ? to12h(s.end_time.slice(0, 5)) : '—'}</td>
          <td class="py-3 px-4 text-right">
            <button class="btn-delete-schedule text-red-400 hover:text-red-300 text-xs flex items-center gap-1 ml-auto" data-id="${escapeHtml(s.id)}">${Icon('trash', 12)} Eliminar</button>
          </td>
        </tr>`
      }).join('')

  const html = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">Horarios</h1>
      <p class="mt-1 text-sm text-zinc-500">${allSchedulesCache.length} horario${allSchedulesCache.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="mb-6 flex items-center justify-end">
      <button id="btn-new-schedule" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo horario</button>
    </div>
    <div id="schedule-form-container" class="hidden mb-6"></div>
    <div class="mb-4 flex flex-wrap gap-2" id="course-filters">${filterHtml}</div>
    <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th class="py-3 px-4 font-medium">D\u00eda</th>
            <th class="py-3 px-4 font-medium">Curso</th>
            <th class="py-3 px-4 font-medium">Horario</th>
            <th class="py-3 px-4 font-medium text-right">Acci\u00f3n</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  document.getElementById('page-content')!.innerHTML = html

  document.getElementById('btn-new-schedule')?.addEventListener('click', () => {
    const container = document.getElementById('schedule-form-container')!
    container.innerHTML = renderScheduleCreateForm()
    container.classList.remove('hidden')
    bindScheduleFormEvents(container)
  })

  document.querySelectorAll('.btn-delete-schedule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      if (!id || !(await confirmDialog('¿Eliminar este horario?'))) return
      const { error } = await supabase.from('schedules').delete().eq('id', id)
      if (error) toast('error', error.message)
      else { refreshCache(); initCoachSchedules() }
    })
  })

  initCourseFilters()

  setupRealtime()
}

function initCourseFilters(): void {
  document.querySelectorAll('.course-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = (btn as HTMLElement).dataset.courseId
      const active = (btn as HTMLElement).dataset.active === '1'
      ;(btn as HTMLElement).dataset.active = active ? '0' : '1'

      btn.classList.toggle('bg-[#8B5CF6]/15', !active)
      btn.classList.toggle('text-[#8B5CF6]', !active)
      btn.classList.toggle('border-[#8B5CF6]/30', !active)
      btn.classList.toggle('bg-zinc-800/40', active)
      btn.classList.toggle('text-zinc-500', active)
      btn.classList.toggle('border-dashed', active)
      btn.classList.toggle('border-zinc-700/50', active)

      btn.innerHTML = active
        ? `${Icon('plus', 12)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`
        : `${Icon('checkCircle', 14)} <span>${escapeHtml((btn as HTMLElement).dataset.courseName || '')}</span> <span class="text-zinc-500">${(btn as HTMLElement).dataset.courseCount || ''}</span>`

      const excludedCourses = new Set<string>()
      document.querySelectorAll('.course-filter-btn').forEach(b => {
        if ((b as HTMLElement).dataset.active === '0') {
          excludedCourses.add((b as HTMLElement).dataset.courseId || '')
        }
      })

      document.querySelectorAll<HTMLTableRowElement>('#page-content table tbody tr').forEach(row => {
        const rowCourseId = row.dataset.courseId || ''
        const hidden = excludedCourses.has(rowCourseId)
        row.classList.toggle('hidden', hidden)
      })
    })
  })
}

function renderScheduleCreateForm(): string {
  return `
    <div class="glass rounded-xl p-4">
      <h3 class="mb-3 font-medium text-white">Nuevo horario</h3>
      <form id="schedule-create-form" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Curso</label>
            <select name="courseId" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              ${allCoursesCache.map((c: any) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div><label class="mb-1 block text-xs text-zinc-400">Título</label><input type="text" name="title" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Semana</label><input type="number" name="weekNumber" min="1" value="1" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Día</label><select name="dayOfWeek" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}</select></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Hora inicio</label><input type="time" name="startTime" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Hora fin</label><input type="time" name="endTime" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Tipo</label><select name="type" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="">Seleccionar...</option><option value="academic">Académico</option><option value="competitive">Competitivo</option></select></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Ubicación</label><input type="text" name="location" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
        </div>
        <div><label class="mb-1 block text-xs text-zinc-400">Descripción</label><textarea name="description" rows="2" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
        <p id="schedule-form-error" class="hidden text-xs text-red-400"></p>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear</button>
          <button type="button" id="btn-cancel-schedule" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        </div>
      </form>
    </div>`
}

function bindScheduleFormEvents(container: HTMLElement): void {
  document.getElementById('btn-cancel-schedule')?.addEventListener('click', () => { container.classList.add('hidden') })
  document.getElementById('schedule-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const courseId = fd.get('courseId') as string
    if (!courseId) return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
    const { error } = await supabase.from('schedules').insert({
      course_id: courseId,
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
      errEl.textContent = error.message; errEl.classList.remove('hidden')
    } else {
      toast('success', 'Horario creado')
      container.classList.add('hidden')
      refreshCache()
      initCoachSchedules()
    }
  })
}

async function refreshCache(): Promise<void> {
  const { data } = await supabase.from('schedules').select('*').order('week_number').order('day_of_week').order('start_time')
  allSchedulesCache = data ?? []
}

function setupRealtime(): void {
  if ((window as any).__channels?.schedules) {
    supabase.removeChannel((window as any).__channels.schedules)
  }
  const channel = supabase.channel('schedules-realtime')
  if (!(window as any).__channels) (window as any).__channels = {}
  ;(window as any).__channels.schedules = channel
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
      refreshCache().then(() => renderScheduleTable())
    })
    .subscribe()
}
