import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { to12h } from '@/2b3583/2938a7'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachSchedules(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

let allCoursesCache: any[] = []
let allSchedulesCache: any[] = []
let currentMonth = new Date()

export async function initCoachSchedules(): Promise<void> {
  try {
    const courseFilter = new URLSearchParams(location.hash.split('?')[1] || '').get('course')
    const [{ data: schedules }, { data: allCourses }] = await Promise.all([
      supabase.from('schedules').select('*').order('start_time'),
      supabase.from('courses').select('id, name, description, duration_months, price, display_order, is_active').eq('is_active', true).order('display_order'),
    ])
    allSchedulesCache = schedules ?? []
    const { data: { session } } = await supabase.auth.getSession()
    const assignedIds = session?.user?.id ? await getAssignedCourseIds(session.user.id) : []
    let courses = allCourses ?? []
    if (assignedIds.length > 0) {
      courses = courses.filter((c: any) => assignedIds.includes(c.id))
    }
    if (courseFilter) courses = courses.filter((c: any) => c.id === courseFilter)
    allCoursesCache = courses
    allSchedulesCache = courseFilter ? allSchedulesCache.filter((schedule: any) => schedule.course_id === courseFilter) : allSchedulesCache
    renderScheduleTable()
  } catch (err) {
    console.error('Error loading schedules:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horarios</p>'
  }
}

function formatDateLocal(d: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDateFromSchedule(s: any): string {
  return s.schedule_date || (s.start_time ? s.start_time.slice(0, 10) : '')
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function renderScheduleTable(): void {
  const courseMap = new Map(allCoursesCache.map((c: any) => [c.id, c]))

  const schedCount: Record<string, number> = {}
  for (const s of allSchedulesCache) {
    const cid = s.course_id
    if (cid) { if (!schedCount[cid]) schedCount[cid] = 0; schedCount[cid]++ }
  }

  const monthKey = getMonthKey(currentMonth)
  const monthSchedules = allSchedulesCache.filter((s: any) => {
    const sd = getDateFromSchedule(s)
    if (!sd) return false
    return getMonthKey(new Date(sd)) === monthKey
  })

  // Week filtering
  const schedWeeks = [...new Set(monthSchedules.map((s: any) => s.week_number).filter((w: any) => w > 0))].sort()
  let schedCurrentWeek: number | null = null
  const savedSchedWeek = sessionStorage.getItem('coachScheduleWeek')
  if (savedSchedWeek && schedWeeks.includes(parseInt(savedSchedWeek))) schedCurrentWeek = parseInt(savedSchedWeek)
  const filteredSchedules = schedCurrentWeek ? monthSchedules.filter((s: any) => s.week_number === schedCurrentWeek) : monthSchedules

  const schedWeekHtml = schedWeeks.length > 1 ? `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-zinc-500 mr-1">Semana:</span>
      <button class="sched-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${!schedCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="all">${Icon('calendar', 12)} Todas</button>
      ${schedWeeks.map((w: number) => `
        <button class="sched-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${w === schedCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="${w}">${Icon('calendar', 12)} Semana ${w}</button>
      `).join('')}
    </div>` : ''

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

  const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
  const monthLabel = currentMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  const rows = filteredSchedules.length === 0
    ? '<tr><td colspan="6" class="py-8 text-center text-sm text-zinc-500">Sin horarios esta semana.</td></tr>'
    : filteredSchedules.map((s: any) => {
        const course = courseMap.get(s.course_id)
        return `
        <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50" data-course-id="${escapeHtml(s.course_id)}">
          <td class="py-3 px-4 text-sm text-zinc-300 whitespace-nowrap">${formatDateLocal(getDateFromSchedule(s))}</td>
          <td class="py-3 px-4 text-sm text-white">${escapeHtml(course?.name || 'Desconocido')}</td>
          <td class="py-3 px-4 text-sm text-zinc-300">${escapeHtml(s.title || '')}</td>
          <td class="py-3 px-4 text-sm text-zinc-400">${s.start_time ? to12h(s.start_time) : '—'} - ${s.end_time ? to12h(s.end_time) : '—'}</td>
          <td class="py-3 px-4 text-right">
            <button class="grade-class-btn flex items-center gap-1 ml-auto text-amber-400 hover:text-amber-300 text-xs" data-schedule-id="${escapeHtml(s.id)}" data-course-id="${escapeHtml(s.course_id)}">${Icon('edit', 12)} Notas</button>
          </td>
          <td class="py-3 px-4 text-right">
            <button class="btn-edit-schedule flex items-center gap-1 ml-auto text-zinc-400 hover:text-white text-xs mr-2" data-id="${escapeHtml(s.id)}">${Icon('edit', 12)} Editar</button>
            <button class="btn-delete-schedule text-red-400 hover:text-red-300 text-xs flex items-center gap-1 ml-auto" data-id="${escapeHtml(s.id)}">${Icon('trash', 12)} Eliminar</button>
          </td>
        </tr>`
      }).join('')

  const html = `
    <div class="mb-6 flex items-end justify-between">
      <div>
        <span class="kicker">Clases y sesiones</span>
        <h1 class="font-heading text-2xl font-bold text-white">Horarios</h1>
      </div>
      <button id="btn-new-schedule" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo horario</button>
    </div>
    <div id="schedule-form-container" class="hidden mb-6"></div>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button id="btn-prev-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
      <span class="text-sm font-semibold text-white capitalize">${monthLabel}</span>
      <button id="btn-next-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
    </div>
    ${schedWeekHtml}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      ${filterHtml}
    </div>
    <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th class="py-3 px-4 font-medium">Fecha</th>
            <th class="py-3 px-4 font-medium">Curso</th>
            <th class="py-3 px-4 font-medium">T\u00edtulo</th>
            <th class="py-3 px-4 font-medium">Horario</th>
            <th class="py-3 px-4 font-medium text-right">Notas</th>
            <th class="py-3 px-4 font-medium text-right">Acci\u00f3n</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  document.getElementById('page-content')!.innerHTML = html
  setupEvents()
  setupRealtime()
}

function setupEvents(): void {
  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    renderScheduleTable()
  })
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    renderScheduleTable()
  })

  document.querySelectorAll('.sched-week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = (btn as HTMLElement).dataset.week
      if (week === 'all') sessionStorage.removeItem('coachScheduleWeek')
      else sessionStorage.setItem('coachScheduleWeek', week!)
      renderScheduleTable()
    })
  })

  document.getElementById('btn-new-schedule')?.addEventListener('click', () => {
    const container = document.getElementById('schedule-form-container')!
    container.classList.toggle('hidden')
    if (!container.classList.contains('hidden')) {
      container.innerHTML = renderScheduleCreateForm()
      bindScheduleFormEvents(container)
    }
  })

  document.querySelectorAll('.btn-delete-schedule').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      if (!id || !(await confirmDialog('\u00bfEliminar este horario?'))) return
      const { error } = await supabase.from('schedules').delete().eq('id', id)
      if (error) { toast('error', error.message); return }
      toast('success', 'Horario eliminado')
      initCoachSchedules()
    })
  })

  document.querySelectorAll('.btn-edit-schedule').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id
      if (!id) return
      const { data: sched } = await supabase.from('schedules').select('*').eq('id', id).maybeSingle()
      if (!sched) return
      const container = document.getElementById('schedule-form-container')!
      container.classList.remove('hidden')
      const course = allCoursesCache.find((c: any) => c.id === sched.course_id)
      container.innerHTML = renderScheduleCreateForm(sched)
      bindScheduleFormEvents(container, sched.id)
    })
  })

  // Grades modal
  document.querySelectorAll('.grade-class-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const scheduleId = (btn as HTMLElement).dataset.scheduleId
      const courseId = (btn as HTMLElement).dataset.courseId
      if (!scheduleId) return
      const modal = document.getElementById('grades-modal')
      if (modal) modal.remove()
      const div = document.createElement('div')
      div.id = 'grades-modal'
      div.innerHTML = renderGradesModal(scheduleId, courseId || '')
      document.body.appendChild(div)
      bindGradesModalEvents(scheduleId)
    })
  })

  initCourseFilters()
}

function renderScheduleCreateForm(editSched?: any): string {
  const isEdit = !!editSched
  const sd = editSched?.schedule_date || ''
  const st = editSched?.start_time?.slice(0, 5) || ''
  const et = editSched?.end_time?.slice(0, 5) || ''
  return `
    <div class="glass rounded-xl p-4">
      <h3 class="mb-3 font-medium text-white">${isEdit ? 'Editar horario' : 'Nuevo horario'}</h3>
      <form id="schedule-create-form" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Curso</label>
            <select name="courseId" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              ${allCoursesCache.map((c: any) => `<option value="${escapeHtml(c.id)}" ${editSched?.course_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div><label class="mb-1 block text-xs text-zinc-400">T\u00edtulo</label><input type="text" name="title" value="${escapeHtml(editSched?.title || '')}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Fecha</label><input type="date" name="scheduleDate" value="${sd}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Hora inicio</label><input type="time" name="startTime" value="${st}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Hora fin</label><input type="time" name="endTime" value="${et}" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Tipo</label><select name="type" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="">Seleccionar...</option><option value="academic" ${editSched?.type === 'academic' ? 'selected' : ''}>Acad\u00e9mico</option><option value="competitive" ${editSched?.type === 'competitive' ? 'selected' : ''}>Competitivo</option></select></div>
          <div><label class="mb-1 block text-xs text-zinc-400">Ubicaci\u00f3n</label><input type="text" name="location" value="${escapeHtml(editSched?.location || '')}" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /></div>
        </div>
        <div><label class="mb-1 block text-xs text-zinc-400">Descripci\u00f3n</label><textarea name="description" rows="2" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(editSched?.description || '')}</textarea></div>
        <p id="schedule-form-error" class="hidden text-xs text-red-400"></p>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${isEdit ? 'Guardar cambios' : 'Crear'}</button>
          <button type="button" id="btn-cancel-schedule" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        </div>
      </form>
    </div>`
}

function bindScheduleFormEvents(container: HTMLElement, editId?: string): void {
  document.getElementById('btn-cancel-schedule')?.addEventListener('click', () => { container.classList.add('hidden') })
  document.getElementById('schedule-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const courseId = fd.get('courseId') as string
    const scheduleDate = fd.get('scheduleDate') as string
    const startTime = fd.get('startTime') as string
    const endTime = fd.get('endTime') as string
    if (!courseId || !scheduleDate || !startTime) {
      document.getElementById('schedule-form-error')!.textContent = 'Completa todos los campos obligatorios'
      document.getElementById('schedule-form-error')!.classList.remove('hidden')
      return
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
    const payload: any = {
      course_id: courseId,
      title: fd.get('title') as string || 'Clase',
      schedule_date: scheduleDate,
      start_time: startTime + ':00',
      end_time: endTime ? endTime + ':00' : null,
      type: fd.get('type') as string || 'academic',
      timezone: tz,
      location: fd.get('location') as string || '',
      description: fd.get('description') as string || '',
      week_number: 0,
      day_of_week: 0,
    }
    let error: any
    if (editId) {
      ({ error } = await supabase.from('schedules').update(payload).eq('id', editId))
    } else {
      ({ error } = await supabase.from('schedules').insert(payload))
    }
    if (error) { toast('error', error.message); return }
    toast('success', editId ? 'Horario actualizado' : 'Horario creado')
    container.classList.add('hidden')
    initCoachSchedules()
  })
}

// Grades modal
function renderGradesModal(scheduleId: string, courseId: string): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onclick="if(event.target===this)document.getElementById('grades-modal')?.remove()">
      <div class="glass max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-heading text-lg font-bold text-white">Notas de la clase</h2>
          <button id="close-grades-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
        </div>
        <div id="grades-modal-body">
          <div class="text-center py-8 text-zinc-500">${Icon('loader', 24)} Cargando...</div>
        </div>
      </div>
    </div>`
}

async function bindGradesModalEvents(scheduleId: string): Promise<void> {
  document.getElementById('close-grades-modal')?.addEventListener('click', () => {
    document.getElementById('grades-modal')?.remove()
  })

  const courseId = document.querySelector('.grade-class-btn[data-schedule-id="' + scheduleId + '"]')?.getAttribute('data-course-id')
  if (!courseId) return

  const { data: sessData } = await supabase.auth.getSession()
  const coachId = (sessData as any)?.session?.user?.id
  if (!coachId) return

  const { data: enrolls } = await supabase
    .from('enrollments')
    .select('profile_id, profiles!inner(full_name, platform)')
    .eq('course_id', courseId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: existingGrades } = await supabase
    .from('class_grades')
    .select('*')
    .eq('schedule_id', scheduleId)

  const gradeMap = new Map<string, any>()
  for (const g of existingGrades ?? []) gradeMap.set(g.student_id, g)

  const rows = (enrolls ?? []).length === 0
    ? '<tr><td colspan="5" class="py-6 text-center text-zinc-500">No hay alumnos inscritos en este curso.</td></tr>'
    : (enrolls ?? []).map((e: any) => {
        const sid = e.profile_id
        const existing = gradeMap.get(sid)
        const theory = existing?.theory_score ?? ''
        const practice = existing?.practice_score ?? ''
        const total = existing ? (parseFloat(existing.theory_score) + parseFloat(existing.practice_score)).toFixed(1) : '—'
        const platformBadge = e.profiles?.platform === 'mobile'
          ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
          : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
        return `
        <tr class="border-b border-zinc-800/50">
          <td class="py-2.5 pr-3 text-sm text-white">${escapeHtml(e.profiles?.full_name || 'Desconocido')}</td>
          <td class="py-2.5 pr-3">${platformBadge}</td>
          <td class="py-2.5 pr-3"><input type="number" class="grade-theory w-16 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="5" value="${theory}" data-student="${escapeHtml(sid)}" /></td>
          <td class="py-2.5 pr-3"><input type="number" class="grade-practice w-16 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="15" value="${practice}" data-student="${escapeHtml(sid)}" /></td>
          <td class="py-2.5 text-sm text-center grade-total ${existing ? 'text-zinc-300' : 'text-zinc-600'}">${total}</td>
        </tr>`
      }).join('')

  document.getElementById('grades-modal-body')!.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="text-zinc-500 text-xs uppercase border-b border-zinc-800">
            <th class="py-2 pr-3">Alumno</th>
            <th class="py-2 pr-3">Plataforma</th>
            <th class="py-2 pr-3">Teor\u00eda (0-5)</th>
            <th class="py-2 pr-3">Pr\u00e1ctica (0-15)</th>
            <th class="py-2 text-center">Total (0-20)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button id="save-grades-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 14)} Guardar notas</button>
    </div>`

  // Live total calculation
  document.querySelectorAll('.grade-theory, .grade-practice').forEach(input => {
    input.addEventListener('input', () => {
      const tr = (input as HTMLElement).closest('tr')!
      const theory = parseFloat((tr.querySelector('.grade-theory') as HTMLInputElement)?.value || '0') || 0
      const practice = parseFloat((tr.querySelector('.grade-practice') as HTMLInputElement)?.value || '0') || 0
      const total = Math.min(theory + practice, 20)
      const td = tr.querySelector('.grade-total')!
      td.textContent = total.toFixed(1)
      td.className = `py-2.5 text-sm text-center grade-total ${total >= 14 ? 'text-green-400' : total >= 11 ? 'text-yellow-400' : 'text-red-400'}`
    })
  })

  document.getElementById('save-grades-btn')?.addEventListener('click', async () => {
    const saveBtn = document.getElementById('save-grades-btn') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Guardando...'
    let ok = 0, fail = 0
    const rows2 = document.querySelectorAll('#grades-modal-body tbody tr')
    for (const tr of rows2) {
      const studentId = (tr.querySelector('.grade-theory') as HTMLInputElement)?.dataset.student
      const theory = parseFloat((tr.querySelector('.grade-theory') as HTMLInputElement)?.value || '0') || 0
      const practice = parseFloat((tr.querySelector('.grade-practice') as HTMLInputElement)?.value || '0') || 0
      if (!studentId) continue
      const { error } = await supabase.from('class_grades').upsert({
        schedule_id: scheduleId,
        student_id: studentId,
        theory_score: Math.min(theory, 5),
        practice_score: Math.min(practice, 15),
        coach_id: coachId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'schedule_id,student_id' })
      if (error) { fail++ } else { ok++ }
    }
    saveBtn.disabled = false
    saveBtn.innerHTML = `${Icon('save', 14)} Guardar notas`
    if (fail > 0) toast('warning', ok + ' guardadas, ' + fail + ' errores')
    else toast('success', ok + ' nota' + (ok !== 1 ? 's' : '') + ' guardada' + (ok !== 1 ? 's' : ''))
  })
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

function setupRealtime(): void {
  if ((window as any).__channels?.schedules) {
    supabase.removeChannel((window as any).__channels.schedules)
  }
  const channel = supabase.channel('schedules-realtime')
  if (!(window as any).__channels) (window as any).__channels = {}
  ;(window as any).__channels.schedules = channel
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => initCoachSchedules())
    .subscribe()
}
