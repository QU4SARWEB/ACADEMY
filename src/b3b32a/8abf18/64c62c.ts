import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'
import { STATUS_LABELS, STATUS_COLORS, STATUS_ICONS, STATUSES, CYCLE_ORDER } from './attendance_utils'

export function renderCoachAttendance(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachAttendance(): Promise<void> {
  const courseId = router.getParams().id
  if (!courseId) {
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">ID de curso no encontrado</p>'
    return
  }

  try {
    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).maybeSingle()
    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-400">Curso no encontrado.</p>'
      return
    }

    const { data: enrollmentsRaw } = await supabase
      .from('enrollments')
      .select('id, profile_id, profiles(full_name, avatar_url)')
      .eq('course_id', courseId)
      .eq('status', 'active')

    const enrollments = enrollmentsRaw ?? []
    const enrollmentIds = enrollments.map((e: any) => e.id)

    let attendanceMap: Record<string, Record<string, any>> = {}
    const dateSet = new Set<string>()

    if (enrollmentIds.length > 0) {
      const { data: records } = await supabase
        .from('attendance')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .order('date', { ascending: false })

      for (const r of records ?? []) {
        if (!attendanceMap[r.enrollment_id]) attendanceMap[r.enrollment_id] = {}
        attendanceMap[r.enrollment_id][r.date] = r
        dateSet.add(r.date)
      }
    }

    const allDates = [...dateSet].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const today = now.toISOString().split('T')[0]

    const pendingChanges = new Map<string, { enrollmentId: string; date: string; newStatus: string; oldRecord: any }>()
    function getCellKey(enrollmentId: string, date: string): string { return `${enrollmentId}|${date}` }
    function getStatusAfterCycle(currentStatus: string): string {
      const idx = CYCLE_ORDER.indexOf(currentStatus)
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
    }
    function updateSaveBar(): void {
      const saveBar = document.getElementById('bulk-save-bar')
      const pendingCount = document.getElementById('pending-count')
      if (!saveBar || !pendingCount) return
      const count = pendingChanges.size
      pendingCount.textContent = String(count)
      saveBar.classList.toggle('hidden', count === 0)
    }

    function renderTable(selectedMonth: string, selectedDate: string): string {
      const filteredDates = allDates.filter(d => d.startsWith(selectedMonth))
      const colspan = Math.max(2, filteredDates.length + 2)

      return `
        <div class="overflow-x-auto rounded-xl border border-zinc-800">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-zinc-800 bg-zinc-900/50">
                <th class="sticky left-0 z-10 bg-zinc-900/50 px-4 py-3 font-medium text-zinc-400 min-w-[140px]">Alumno</th>
                ${filteredDates.map(d => `
                  <th class="min-w-[100px] px-3 py-3 text-center text-xs text-zinc-500">
                    ${formatDate(d, { day: 'numeric', month: 'short' })}
                  </th>
                `).join('')}
                <th class="min-w-[120px] px-3 py-3 text-center text-xs text-purple-400">
                  ${formatDate(selectedDate, { day: 'numeric', month: 'short' })}
                </th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.length === 0 ? `
                <tr><td colspan="${colspan}" class="px-4 py-8 text-center text-zinc-500">
                  No hay alumnos inscritos en este curso.
                </td></tr>
              ` : enrollments.map((enr: any) => {
                const profile = enr.profiles
                const name = profile?.full_name || 'Desconocido'
                const avatar = profile?.avatar_url
                const initial = name.charAt(0).toUpperCase()

                return `
                  <tr class="border-b border-zinc-800/50 transition hover:bg-zinc-800/30">
                    <td class="sticky left-0 z-10 bg-[#0A0A0A] px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                          ${avatar
                            ? `<img src="${escapeHtml(avatar)}" alt="" class="h-full w-full object-cover" />`
                            : escapeHtml(initial)}
                        </div>
                        <span class="text-white">${escapeHtml(name)}</span>
                      </div>
                    </td>
                    ${filteredDates.map(d => {
                      const record = attendanceMap[enr.id]?.[d]
                      const status = record?.status
                      const key = getCellKey(enr.id, d)
                      const pending = pendingChanges?.get(key)
                      const displayStatus = pending ? pending.newStatus : status || ''
                      const isPending = !!pending
                      return `
                        <td class="px-3 py-3 text-center">
                          ${displayStatus ? `
                            <button class="btn-attendance inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[displayStatus]} ${isPending ? 'ring-1 ring-yellow-400/50' : ''}"
                                    data-enrollment="${enr.id}" data-date="${d}" data-status="${displayStatus}">
                              ${STATUS_ICONS[displayStatus]}
                              ${STATUS_LABELS[displayStatus]}
                            </button>
                          ` : `
                            <button class="btn-attendance text-zinc-600 hover:text-zinc-400 text-xs"
                                    data-enrollment="${enr.id}" data-date="${d}" data-status="">
                              —
                            </button>
                          `}
                        </td>`
                    }).join('')}
                    <td class="px-3 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        ${STATUSES.map(s => `
                          <button class="btn-attendance-quick rounded-full p-1.5 text-xs transition hover:scale-110 ${STATUS_COLORS[s]}"
                                  data-enrollment="${enr.id}" data-status="${s}" title="${STATUS_LABELS[s]}">
                            ${STATUS_ICONS[s]}
                          </button>
                        `).join('')}
                      </div>
                    </td>
                  </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>`
    }

    const container = document.getElementById('page-content')!
    container.innerHTML = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>
        <h1 class="font-heading text-2xl font-bold text-white">Asistencia · ${escapeHtml(course.name)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Gestiona la asistencia de los estudiantes</p>
      </div>

      <div id="bulk-save-bar" class="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5">
        <span class="text-sm text-yellow-300"><span id="pending-count">0</span> cambios pendientes</span>
        <div class="ml-auto flex gap-2">
          <button id="btn-save-attendance" class="rounded-lg bg-[#8B5CF6] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 12)} Guardar</button>
          <button id="btn-discard-attendance" class="rounded-lg border border-zinc-600 px-4 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800">Descartar</button>
        </div>
      </div>

      <div class="mb-4 flex items-center gap-3 flex-wrap">
        <label class="text-xs text-zinc-500">Filtrar por mes:</label>
        <input type="month" id="attendance-month" value="${escapeHtml(currentMonth)}"
          class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" />
        <label class="text-xs text-zinc-500 ml-4">Nueva fecha:</label>
        <input type="date" id="attendance-newdate" value="${escapeHtml(today)}"
          class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" />
      </div>
      <div id="attendance-table-container">
        ${renderTable(currentMonth, today)}
      </div>`

    const monthInput = document.getElementById('attendance-month') as HTMLInputElement
    const dateInput = document.getElementById('attendance-newdate') as HTMLInputElement
    const tableContainer = document.getElementById('attendance-table-container')!

    function refreshTable() {
      tableContainer.innerHTML = renderTable(monthInput?.value || currentMonth, dateInput?.value || today)
    }

    monthInput?.addEventListener('change', refreshTable)
    dateInput?.addEventListener('change', refreshTable)

    tableContainer.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.btn-attendance, .btn-attendance-quick') as HTMLElement
      if (!target) return
      const enrollmentId = target.dataset.enrollment!
      let date: string
      let newStatus: string
      if (target.classList.contains('btn-attendance-quick')) {
        date = dateInput?.value
        if (!date) return
        newStatus = target.dataset.status!
      } else {
        date = target.dataset.date!
        const currentStatus = target.dataset.status || ''
        const idx = CYCLE_ORDER.indexOf(currentStatus)
        newStatus = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
      }
      if (!date) return
      const key = getCellKey(enrollmentId, date)
      const oldRecord = attendanceMap[enrollmentId]?.[date] || null
      const existingPending = pendingChanges.get(key)
      const dbStatus = oldRecord?.status || ''
      if (existingPending) {
        existingPending.newStatus = getStatusAfterCycle(existingPending.newStatus)
        if (existingPending.newStatus === dbStatus) { pendingChanges.delete(key) }
      } else if (newStatus !== dbStatus || !dbStatus) {
        pendingChanges.set(key, { enrollmentId, date, newStatus, oldRecord })
      }
      const cell = target.closest('td')!
      if (pendingChanges.has(key)) {
        const ps = pendingChanges.get(key)!.newStatus
        cell.innerHTML = `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[ps]} ring-1 ring-yellow-400/50">${STATUS_ICONS[ps]} ${STATUS_LABELS[ps]}</span>`
      } else {
        const ds = oldRecord?.status || ''
        cell.innerHTML = ds ? `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[ds]}">${STATUS_ICONS[ds]} ${STATUS_LABELS[ds]}</span>` : '<span class="text-zinc-600">—</span>'
      }
      updateSaveBar()
    })

    document.getElementById('btn-save-attendance')?.addEventListener('click', async () => {
      if (pendingChanges.size === 0) return
      const btn = document.getElementById('btn-save-attendance') as HTMLButtonElement
      btn.disabled = true
      btn.textContent = 'Guardando...'
      let ok = 0, fail = 0
      for (const [, change] of pendingChanges) {
        try {
          const { enrollmentId, date, newStatus, oldRecord } = change
          if (oldRecord) {
            if (newStatus === '') {
              await supabase.from('attendance').delete().eq('id', oldRecord.id)
              delete attendanceMap[enrollmentId][date]
              if (Object.keys(attendanceMap[enrollmentId]).length === 0) delete attendanceMap[enrollmentId]
            } else {
              await supabase.from('attendance').update({ status: newStatus }).eq('id', oldRecord.id)
              if (attendanceMap[enrollmentId]) attendanceMap[enrollmentId][date].status = newStatus
            }
          } else if (newStatus !== '') {
            const { data: newRec } = await supabase.from('attendance').insert({
              enrollment_id: enrollmentId, date, status: newStatus,
            }).select().single()
            if (!attendanceMap[enrollmentId]) attendanceMap[enrollmentId] = {}
            attendanceMap[enrollmentId][date] = newRec
            if (!dateSet.has(date)) {
              dateSet.add(date)
              allDates.push(date)
              allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            }
          }
          ok++
        } catch { fail++ }
      }
      pendingChanges.clear()
      updateSaveBar()
      btn.disabled = false
      btn.innerHTML = `${Icon('save', 12)} Guardar`
      refreshTable()
      if (fail > 0) toast('warning', `${ok} guardados, ${fail} errores`)
      else toast('success', `${ok} cambio${ok !== 1 ? 's' : ''} guardado${ok !== 1 ? 's' : ''}`)
    })

    document.getElementById('btn-discard-attendance')?.addEventListener('click', () => {
      pendingChanges.clear()
      updateSaveBar()
      refreshTable()
    })
  } catch (err) {
    console.error('Error loading attendance:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencia</p>'
  }
}
