import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { to12h } from '@/2b3583/2938a7'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function renderCoachSchedules(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

let allCoursesCache: any[] = []
let allSchedulesCache: any[] = []
let currentCourseId = ''

export async function initCoachSchedules(): Promise<void> {
  try {
    const [{ data: schedules }, { data: allCourses }] = await Promise.all([
      supabase.from('schedules').select('*').order('week_number').order('day_of_week').order('start_time'),
      supabase.from('courses').select('id, name, description, duration_months, price, display_order, is_active').eq('is_active', true).order('display_order'),
    ])
    allSchedulesCache = schedules ?? []
    allCoursesCache = allCourses ?? []
    renderGrid()
  } catch (err) {
    console.error('Error loading schedules:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horarios</p>'
  }
}

function renderGrid(): void {
  const schedCount: Record<string, number> = {}
  for (const s of allSchedulesCache) {
    const cid = s.course_id
    if (cid) { if (!schedCount[cid]) schedCount[cid] = 0; schedCount[cid]++ }
  }

  const html = `
    <div class="mb-6">
      <h1 class="font-heading text-2xl font-bold text-white">Horarios</h1>
      <p class="mt-1 text-sm text-zinc-500">${allSchedulesCache.length} horarios</p>
    </div>
    ${allCoursesCache.length === 0
      ? '<p class="text-sm text-zinc-500">No hay cursos activos.</p>'
      : `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        ${allCoursesCache.map((c: any) => `
          <button class="sched-course-btn glass rounded-xl p-5 flex flex-col text-left transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 group"
            data-course-id="${escapeHtml(c.id)}">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">
                ${Icon('calendar', 24)}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-white truncate">${escapeHtml(c.name)}</h3>
                <p class="text-xs text-zinc-500">${c.duration_months || 0} meses</p>
              </div>
            </div>
            ${c.description ? `<p class="text-xs text-zinc-400 line-clamp-2 mb-3 flex-1">${escBr(c.description.substring(0, 80))}</p>` : '<div class="flex-1"></div>'}
            <div class="space-y-1 mb-3">
              <div class="flex items-center gap-2 text-xs text-zinc-400">${Icon('calendar', 12)} ${schedCount[c.id] || 0} horarios</div>
            </div>
            <div class="mt-auto pt-3 border-t border-zinc-800 text-xs text-zinc-500">${c.price && c.price > 0 ? `$${c.price}/mes` : 'Gratis'}</div>
          </button>
        `).join('')}
      </div>`
    }`

  document.getElementById('page-content')!.innerHTML = html

  document.querySelectorAll('.sched-course-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const courseId = (btn as HTMLElement).dataset.courseId || ''
      renderScheduleView(courseId)
    })
  })

  setupRealtime()
}

function renderScheduleView(courseId: string): void {
  currentCourseId = courseId
  const course = allCoursesCache.find((c: any) => c.id === courseId)
  const courseSchedules = allSchedulesCache.filter((s: any) => s.course_id === courseId)

  const groupedByDay: Record<number, any[]> = {}
  for (const s of courseSchedules) {
    const d = s.day_of_week
    if (!groupedByDay[d]) groupedByDay[d] = []
    groupedByDay[d].push(s)
  }

  document.getElementById('page-content')!.innerHTML = `
    <div class="mb-4">
      <button id="back-to-grid" class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Todos los cursos</button>
    </div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(course?.name || 'Curso')}</h1>
        <p class="mt-1 text-sm text-zinc-500">${courseSchedules.length} horario${courseSchedules.length !== 1 ? 's' : ''}</p>
      </div>
      <button id="btn-new-schedule" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo horario</button>
    </div>
    <div id="schedule-form-container" class="hidden mb-6"></div>
    ${courseSchedules.length === 0
      ? '<p class="text-sm text-zinc-500">No hay horarios para este curso.</p>'
      : `<div class="glass rounded-xl p-4">
          ${Array.from({ length: 7 }, (_, day) => {
            const daySchedules = groupedByDay[day] || []
            if (daySchedules.length === 0) return ''
            return `
              <div class="mb-3">
                <h3 class="mb-2 text-sm font-semibold text-zinc-400">${DAYS[day]}</h3>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  ${daySchedules.map((s: any) => `
                    <div class="glass rounded-xl p-4 flex flex-col">
                      <div class="flex items-center gap-3 mb-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20 shrink-0">${Icon('calendar', 16)}</div>
                        <div class="min-w-0 flex-1">
                          <p class="font-medium text-white truncate text-sm">${escapeHtml(s.title)}</p>
                          <p class="text-xs text-zinc-400">${to12h(s.start_time?.slice(0, 5))} - ${to12h(s.end_time?.slice(0, 5))}</p>
                        </div>
                      </div>
                      ${s.description ? `<p class="text-xs text-zinc-500 line-clamp-2 mb-2 flex-1">${escBr(s.description)}</p>` : '<p class="text-xs text-zinc-500 line-clamp-2 mb-2 flex-1">Sin descripción</p>'}
                      <div class="flex flex-wrap gap-1.5 mb-3">
                        ${s.type ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${escapeHtml(s.type)}</span>` : ''}
                        ${s.location ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${Icon('mapPin', 10)} ${escapeHtml(s.location)}</span>` : ''}
                        ${s.week_number ? `<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Sem ${s.week_number}</span>` : ''}
                      </div>
                      <div class="flex justify-end mt-auto pt-2 border-t border-zinc-800">
                        <button class="btn-delete-schedule text-red-400 hover:text-red-300 text-xs flex items-center gap-1" data-id="${escapeHtml(s.id)}">${Icon('trash', 12)} Eliminar</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>`
          }).join('')}
        </div>`
    }`

  document.getElementById('back-to-grid')?.addEventListener('click', () => { currentCourseId = ''; initCoachSchedules() })
  document.getElementById('btn-new-schedule')?.addEventListener('click', () => {
    const container = document.getElementById('schedule-form-container')!
    container.innerHTML = renderScheduleCreateForm(courseId)
    container.classList.remove('hidden')
    bindScheduleFormEvents(courseId, container)
  })
  document.querySelectorAll('.btn-delete-schedule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      if (!id || !(await confirmDialog('¿Eliminar este horario?'))) return
      const { error } = await supabase.from('schedules').delete().eq('id', id)
      if (error) toast('error', error.message)
      else { refreshCache(); renderScheduleView(courseId) }
    })
  })
  setupRealtime()
}



function renderScheduleCreateForm(courseId: string): string {
  return `
    <div class="glass rounded-xl p-4">
      <h3 class="mb-3 font-medium text-white">Nuevo horario</h3>
      <form id="schedule-create-form" class="space-y-3">
        <input type="hidden" name="courseId" value="${escapeHtml(courseId)}" />
        <div class="grid gap-3 sm:grid-cols-2">
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

function bindScheduleFormEvents(courseId: string, container: HTMLElement): void {
  document.getElementById('btn-cancel-schedule')?.addEventListener('click', () => { container.classList.add('hidden') })
  document.getElementById('schedule-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
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
      renderScheduleView(courseId)
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
      refreshCache().then(() => {
        if (currentCourseId) renderScheduleView(currentCourseId)
        else renderGrid()
      })
    })
    .subscribe()
}
