import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { to12h } from '@/2b3583/2938a7'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachAttendance(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

let allCoursesCache: any[] = []
let allSchedulesCache: any[] = []
let currentMonth = new Date()

export async function initCoachAttendance(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const assignedIds = await getAssignedCourseIds(session.user.id)
    let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery
    allCoursesCache = courses ?? []

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .in('course_id', idFilter)
      .order('start_time')
    allSchedulesCache = schedules ?? []

    renderAttendanceTable()
  } catch (err) {
    console.error('Error loading attendance:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencia</p>'
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

function renderAttendanceTable(): void {
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
  const attWeeks = [...new Set(monthSchedules.map((s: any) => s.week_number).filter((w: any) => w > 0))].sort()
  let attCurrentWeek: number | null = null
  const savedWeek = sessionStorage.getItem('coachAttendanceWeek')
  if (savedWeek && attWeeks.includes(parseInt(savedWeek))) attCurrentWeek = parseInt(savedWeek)
  const filteredSchedules = attCurrentWeek ? monthSchedules.filter((s: any) => s.week_number === attCurrentWeek) : monthSchedules

  const attWeekHtml = attWeeks.length > 1 ? `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-zinc-500 mr-1">Semana:</span>
      <button class="att-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${!attCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="all">${Icon('calendar', 12)} Todas</button>
      ${attWeeks.map((w: number) => `
        <button class="att-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${w === attCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="${w}">${Icon('calendar', 12)} Semana ${w}</button>
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
    ? '<tr><td colspan="4" class="py-8 text-center text-sm text-zinc-500">Sin horarios esta semana.</td></tr>'
    : filteredSchedules.map((s: any) => {
        const course = courseMap.get(s.course_id)
        return `
        <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50" data-course-id="${escapeHtml(s.course_id)}">
          <td class="py-3 px-4 text-sm text-zinc-300 whitespace-nowrap">${formatDateLocal(getDateFromSchedule(s))}</td>
          <td class="py-3 px-4 text-sm text-white">${escapeHtml(course?.name || 'Desconocido')}</td>
          <td class="py-3 px-4 text-sm text-zinc-400">${s.start_time ? to12h(s.start_time) : '—'} - ${s.end_time ? to12h(s.end_time) : '—'}</td>
          <td class="py-3 px-4 text-sm text-zinc-300">${escapeHtml(s.title || '')}</td>
          <td class="py-3 px-4 text-right">
            <button class="btn-attendance flex items-center gap-1 ml-auto text-[#8B5CF6] hover:text-[#A78BFA] text-xs" data-schedule-id="${escapeHtml(s.id)}" data-course-id="${escapeHtml(s.course_id)}">${Icon('clipboardList', 12)} Asistencia</button>
          </td>
        </tr>`
      }).join('')

  const html = `
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-heading text-2xl font-bold text-white">Asistencia</h1>
    </div>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button id="btn-prev-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
      <span class="text-sm font-semibold text-white capitalize">${monthLabel}</span>
      <button id="btn-next-month" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition">${Icon('chevronRight', 14)}</button>
    </div>
    ${attWeekHtml}
    <div class="mb-4 flex flex-wrap items-center gap-2">
      ${filterHtml}
    </div>
    <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th class="py-3 px-4 font-medium">Fecha</th>
            <th class="py-3 px-4 font-medium">Curso</th>
            <th class="py-3 px-4 font-medium">Horario</th>
            <th class="py-3 px-4 font-medium">T\u00edtulo</th>
            <th class="py-3 px-4 font-medium text-right">Acci\u00f3n</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  document.getElementById('page-content')!.innerHTML = html
  setupEvents()
}

function setupEvents(): void {
  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    renderAttendanceTable()
  })
  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    renderAttendanceTable()
  })

  document.querySelectorAll('.att-week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = (btn as HTMLElement).dataset.week
      if (week === 'all') sessionStorage.removeItem('coachAttendanceWeek')
      else sessionStorage.setItem('coachAttendanceWeek', week!)
      renderAttendanceTable()
    })
  })

  document.querySelectorAll('.btn-attendance').forEach(btn => {
    btn.addEventListener('click', async () => {
      const scheduleId = (btn as HTMLElement).dataset.scheduleId
      const courseId = (btn as HTMLElement).dataset.courseId
      if (!scheduleId) return

      const existing = document.getElementById('attendance-modal')
      if (existing) existing.remove()

      const div = document.createElement('div')
      div.id = 'attendance-modal'
      div.innerHTML = renderAttendanceModal(scheduleId, courseId || '')
      document.body.appendChild(div)
      await bindAttendanceModalEvents(scheduleId)
    })
  })

  initCourseFilters()
}

function renderAttendanceModal(scheduleId: string, courseId: string): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onclick="if(event.target===this)document.getElementById('attendance-modal')?.remove()">
      <div class="glass max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 id="attendance-modal-title" class="font-heading text-lg font-bold text-white">Asistencia</h2>
          <button id="close-attendance-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
        </div>
        <div id="attendance-modal-header" class="mb-4 text-sm text-zinc-400"></div>
        <div id="attendance-modal-body">
          <div class="text-center py-8 text-zinc-500">${Icon('loader', 24)} Cargando...</div>
        </div>
      </div>
    </div>`
}

async function bindAttendanceModalEvents(scheduleId: string): Promise<void> {
  document.getElementById('close-attendance-modal')?.addEventListener('click', () => {
    document.getElementById('attendance-modal')?.remove()
  })

  const btn = document.querySelector<HTMLElement>('.btn-attendance[data-schedule-id="' + scheduleId + '"]')
  const courseId = btn?.getAttribute('data-course-id')
  if (!courseId) return

  const { data: { session } } = await supabase.auth.getSession()
  const coachId = (session as any)?.user?.id
  if (!coachId) return

  const [{ data: schedule }, { data: enrolls }, { data: existingAttendance }] = await Promise.all([
    supabase.from('schedules').select('*').eq('id', scheduleId).maybeSingle(),
    supabase.from('enrollments').select('profile_id, profiles!inner(full_name)').eq('course_id', courseId).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('attendance').select('*').eq('schedule_id', scheduleId),
  ])

  if (!schedule) {
    document.getElementById('attendance-modal-body')!.innerHTML = '<p class="text-sm text-red-400">Horario no encontrado</p>'
    return
  }

  const attMap = new Map<string, string>()
  for (const a of existingAttendance ?? []) attMap.set(a.student_id, a.status)

  const headerEl = document.getElementById('attendance-modal-header')!
  const schedDate = formatDateLocal(getDateFromSchedule(schedule))
  const schedTime = schedule.start_time ? to12h(schedule.start_time) : '—'
  headerEl.innerHTML = `<strong class="text-white">${escapeHtml(schedule.title || '')}</strong> &middot; ${escapeHtml(schedDate)} &middot; ${escapeHtml(schedTime)}`

  const rows = (enrolls ?? []).length === 0
    ? '<tr><td colspan="2" class="py-6 text-center text-zinc-500">No hay alumnos inscritos en este curso.</td></tr>'
    : (enrolls ?? []).map((e: any) => {
        const sid = e.profile_id
        const currentStatus = attMap.get(sid) || 'present'
        const statuses = [
          { value: 'present', label: 'Presente', icon: 'checkCircle' },
          { value: 'late', label: 'Tardanza', icon: 'clock' },
          { value: 'justified', label: 'Justificado', icon: 'fileText' },
          { value: 'absent', label: 'Ausente', icon: 'xCircle' },
        ]
        const radios = statuses.map(st => `
          <label class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition
            ${currentStatus === st.value ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'text-zinc-400 hover:text-zinc-300'}">
            <input type="radio" name="att_${escapeHtml(sid)}" value="${st.value}" ${currentStatus === st.value ? 'checked' : ''} class="sr-only">
            ${Icon(st.icon, 12)}
            <span>${st.label}</span>
          </label>`).join('')
        return `
        <tr class="border-b border-zinc-800/50" data-student="${escapeHtml(sid)}">
          <td class="py-2.5 pr-3 text-sm text-white">${escapeHtml(e.profiles?.full_name || 'Desconocido')}</td>
          <td class="py-2.5"><div class="flex flex-wrap gap-1">${radios}</div></td>
        </tr>`
      }).join('')

  document.getElementById('attendance-modal-body')!.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="text-zinc-500 text-xs uppercase border-b border-zinc-800">
            <th class="py-2 pr-3">Alumno</th>
            <th class="py-2">Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button id="save-attendance-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 14)} Guardar asistencia</button>
    </div>`

  document.querySelectorAll('#attendance-modal-body input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const name = (input as HTMLInputElement).name
      document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        const label = (r as HTMLElement).closest('label')
        if (!label) return
        if ((r as HTMLInputElement).checked) {
          label.classList.add('bg-[#8B5CF6]/20', 'text-[#8B5CF6]')
          label.classList.remove('text-zinc-400', 'hover:text-zinc-300')
        } else {
          label.classList.remove('bg-[#8B5CF6]/20', 'text-[#8B5CF6]')
          label.classList.add('text-zinc-400', 'hover:text-zinc-300')
        }
      })
    })
  })

  document.getElementById('save-attendance-btn')?.addEventListener('click', async () => {
    const saveBtn = document.getElementById('save-attendance-btn') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.innerHTML = 'Guardando...'
    let ok = 0, fail = 0
    const rows2 = document.querySelectorAll('#attendance-modal-body tbody tr')
    for (const tr of rows2) {
      const studentId = (tr as HTMLElement).dataset.student
      if (!studentId) continue
      const checked = tr.querySelector<HTMLInputElement>('input[type="radio"]:checked')
      if (!checked) continue
      const status = checked.value
      const { error } = await supabase.from('attendance').upsert({
        schedule_id: scheduleId,
        student_id: studentId,
        status,
        coach_id: coachId,
      }, { onConflict: 'schedule_id,student_id' })
      if (error) { fail++ } else { ok++ }
    }
    saveBtn.disabled = false
    saveBtn.innerHTML = `${Icon('save', 14)} Guardar asistencia`
    if (fail > 0) toast('warning', ok + ' guardadas, ' + fail + ' errores')
    else toast('success', ok + ' asistencia' + (ok !== 1 ? 's' : '') + ' guardada' + (ok !== 1 ? 's' : ''))
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
