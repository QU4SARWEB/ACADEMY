import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { to12h } from '@/2b3583/2938a7'
import { getAssignedCourseIds } from '@/2b3583/assignments'
import { formatDate } from '@/2b3583/6b239c'

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
    const { data: { session } } = await supabase.auth.getSession()
    const assignedIds = session?.user?.id ? await getAssignedCourseIds(session.user.id) : []
    let courses = allCourses ?? []
    if (assignedIds.length > 0) {
      courses = courses.filter((c: any) => assignedIds.includes(c.id))
    }
    allCoursesCache = courses
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
    ? '<tr><td colspan="5" class="py-8 text-center text-sm text-zinc-500">No hay horarios registrados.</td></tr>'
    : allSchedulesCache.map((s: any) => {
        const course = courseMap.get(s.course_id)
        return `
        <tr class="border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50" data-course-id="${escapeHtml(s.course_id)}">
          <td class="py-3 px-4 text-sm text-zinc-300">${DAYS[s.day_of_week] || '—'}</td>
          <td class="py-3 px-4 text-sm text-white">${escapeHtml(course?.name || 'Desconocido')}</td>
          <td class="py-3 px-4 text-sm text-zinc-400">${s.start_time ? to12h(s.start_time.slice(0, 5)) : '—'} - ${s.end_time ? to12h(s.end_time.slice(0, 5)) : '—'}</td>
          <td class="py-3 px-4 text-right">
            <button class="grade-class-btn text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 ml-auto mr-2" data-schedule-id="${escapeHtml(s.id)}" data-course-id="${escapeHtml(s.course_id)}">${Icon('edit', 12)} Notas</button>
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
            <th class="py-3 px-4 font-medium text-right">Notas</th>
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

  document.querySelectorAll('.grade-class-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scheduleId = (btn as HTMLElement).dataset.scheduleId!
      const courseId = (btn as HTMLElement).dataset.courseId!
      const container = document.getElementById('schedule-form-container')!
      container.innerHTML = ''
      container.classList.remove('hidden')
      renderGradesModal(scheduleId, courseId)
    })
  })

  document.getElementById('close-grades-modal')?.addEventListener('click', () => {
    document.getElementById('grades-modal')?.remove()
    document.getElementById('grades-modal-overlay')?.remove()
  })

  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement
    if (target.id === 'save-grades-btn') {
      const scheduleId = target.dataset.scheduleId!
      const { data: { session } } = await supabase.auth.getSession()
      const coachId = session?.user?.id
      if (!coachId) { toast('error', 'Sesión no encontrada'); return }
      const studentIds = new Set<string>()
      document.querySelectorAll<HTMLInputElement>('#grades-modal-table input[data-student-id]').forEach((input) => {
        studentIds.add(input.dataset.studentId!)
      })
      const grades: any[] = []
      studentIds.forEach((sid) => {
        const theoryInput = document.querySelector<HTMLInputElement>(`input[data-student-id="${sid}"][data-type="theory"]`)
        const practiceInput = document.querySelector<HTMLInputElement>(`input[data-student-id="${sid}"][data-type="practice"]`)
        if (theoryInput && practiceInput) {
          const theory = parseFloat(theoryInput.value)
          const practice = parseFloat(practiceInput.value)
          if (!isNaN(theory) || !isNaN(practice)) {
            grades.push({
              student_id: sid,
              schedule_id: scheduleId,
              coach_id: coachId,
              theory_score: isNaN(theory) ? null : theory,
              practice_score: isNaN(practice) ? null : practice,
            })
          }
        }
      })
      if (grades.length === 0) { toast('error', 'No hay notas para guardar'); return }
      await saveGrades(grades)
    }
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

async function renderGradesModal(scheduleId: string, courseId: string): Promise<void> {
  const [{ data: enrollments }, { data: existingGrades }] = await Promise.all([
    supabase.from('enrollments').select('*, profiles!inner(*)').eq('course_id', courseId).eq('status', 'active'),
    supabase.from('class_grades').select('*').eq('schedule_id', scheduleId),
  ])
  const gradeMap = new Map((existingGrades ?? []).map((g: any) => [g.student_id, g]))
  const rowsHtml = (enrollments ?? []).map((e: any) => {
    const g = gradeMap.get(e.student_id)
    const theoryVal = g?.theory_score != null ? g.theory_score : ''
    const practiceVal = g?.practice_score != null ? g.practice_score : ''
    return `
      <tr class="border-b border-zinc-800">
        <td class="py-2 px-3 text-sm text-zinc-300">${escapeHtml(e.profiles?.full_name || '—')}</td>
        <td class="py-2 px-3"><input type="number" min="0" max="5" step="0.1" value="${theoryVal}" data-student-id="${escapeHtml(e.student_id)}" data-type="theory" class="w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" /></td>
        <td class="py-2 px-3"><input type="number" min="0" max="15" step="0.1" value="${practiceVal}" data-student-id="${escapeHtml(e.student_id)}" data-type="practice" class="w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" /></td>
        <td class="py-2 px-3 text-sm text-zinc-300 text-center total-cell" data-student-id="${escapeHtml(e.student_id)}">—</td>
      </tr>`
  }).join('')
  const overlay = document.createElement('div')
  overlay.id = 'grades-modal-overlay'
  overlay.className = 'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
  overlay.addEventListener('click', () => {
    document.getElementById('grades-modal')?.remove()
    overlay.remove()
  })
  document.body.appendChild(overlay)
  const wrapper = document.createElement('div')
  wrapper.id = 'grades-modal'
  wrapper.className = 'fixed inset-0 z-50 flex items-center justify-center p-4'
  wrapper.innerHTML = `
    <div class="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-700 bg-[#1a1a1a] p-6 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">Notas — ${escapeHtml(allCoursesCache.find((c: any) => c.id === courseId)?.name || '')}</h3>
        <button id="close-grades-modal" class="text-zinc-400 hover:text-white transition">${Icon('x', 18)}</button>
      </div>
      <table id="grades-modal-table" class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-700 text-left text-xs text-zinc-500">
            <th class="py-2 px-3 font-medium">Estudiante</th>
            <th class="py-2 px-3 font-medium">Teoría (0-5)</th>
            <th class="py-2 px-3 font-medium">Práctica (0-15)</th>
            <th class="py-2 px-3 font-medium text-center">Total (0-20)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="mt-4 flex justify-end gap-2">
        <button id="close-grades-modal-btn" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        <button id="save-grades-btn" data-schedule-id="${escapeHtml(scheduleId)}" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Guardar notas</button>
      </div>
    </div>`
  document.body.appendChild(wrapper)
  document.getElementById('close-grades-modal')?.addEventListener('click', () => { wrapper.remove(); overlay.remove() })
  document.getElementById('close-grades-modal-btn')?.addEventListener('click', () => { wrapper.remove(); overlay.remove() })
  const inputs = wrapper.querySelectorAll<HTMLInputElement>('input[data-student-id]')
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      const sid = input.dataset.studentId!
      const theory = parseFloat(document.querySelector<HTMLInputElement>(`input[data-student-id="${sid}"][data-type="theory"]`)?.value || '')
      const practice = parseFloat(document.querySelector<HTMLInputElement>(`input[data-student-id="${sid}"][data-type="practice"]`)?.value || '')
      const cell = wrapper.querySelector<HTMLElement>(`.total-cell[data-student-id="${sid}"]`)
      if (!isNaN(theory) && !isNaN(practice) && theory >= 0 && practice >= 0) {
        const total = Math.min(theory + practice, 20)
        cell!.textContent = total.toFixed(1)
      } else {
        cell!.textContent = '—'
      }
    })
    input.addEventListener('change', () => {
      let val = parseFloat(input.value)
      if (isNaN(val)) return
      const max = input.dataset.type === 'theory' ? 5 : 15
      if (val < 0) val = 0
      if (val > max) val = max
      input.value = val.toString()
    })
  })
}

async function saveGrades(grades: any[]): Promise<void> {
  for (const g of grades) {
    const { error } = await supabase.from('class_grades').upsert(g, {
      onConflict: 'student_id,schedule_id',
    })
    if (error) { toast('error', error.message); return }
  }
  toast('success', 'Notas guardadas')
  document.getElementById('grades-modal')?.remove()
  document.getElementById('grades-modal-overlay')?.remove()
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
