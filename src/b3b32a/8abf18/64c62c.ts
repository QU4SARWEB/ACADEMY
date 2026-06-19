import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

const STATUS_LABELS: Record<string, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tardanza',
  excused: 'Justificado',
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500/20 text-green-400',
  absent: 'bg-red-500/20 text-red-400',
  late: 'bg-yellow-500/20 text-yellow-400',
  excused: 'bg-blue-500/20 text-blue-400',
}

const STATUS_ICONS: Record<string, string> = {
  present: Icon('checkCircle', 14),
  absent: Icon('x', 14),
  late: Icon('alertTriangle', 14),
  excused: Icon('info', 14),
}

const STATUSES = ['present', 'absent', 'late', 'excused'] as const
const CYCLE_ORDER = ['', 'present', 'absent', 'late', 'excused']

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
                      return `
                        <td class="px-3 py-3 text-center">
                          ${status ? `
                            <button class="btn-attendance inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[status]}"
                                    data-enrollment="${enr.id}" data-date="${d}" data-status="${status}">
                              ${STATUS_ICONS[status]}
                              ${STATUS_LABELS[status]}
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

    async function saveAttendance(enrollmentId: string, date: string, newStatus: string) {
      const record = attendanceMap[enrollmentId]?.[date]
      if (record) {
        if (newStatus === '') {
          const { error } = await supabase.from('attendance').delete().eq('id', record.id)
          if (error) throw error
          delete attendanceMap[enrollmentId][date]
          if (Object.keys(attendanceMap[enrollmentId]).length === 0) {
            delete attendanceMap[enrollmentId]
          }
        } else {
          const { error } = await supabase.from('attendance').update({ status: newStatus }).eq('id', record.id)
          if (error) throw error
          record.status = newStatus
        }
      } else if (newStatus !== '') {
        const { data: enrData } = await supabase
          .from('enrollments')
          .select('season_id')
          .eq('id', enrollmentId)
          .maybeSingle()

        if (!enrData?.season_id) throw new Error('Enrollment missing season_id')
        const { data: newRecord, error } = await supabase.from('attendance').insert({
          enrollment_id: enrollmentId,
          season_id: enrData.season_id,
          date,
          status: newStatus,
        }).select().single()

        if (error) throw error
        if (!attendanceMap[enrollmentId]) attendanceMap[enrollmentId] = {}
        attendanceMap[enrollmentId][date] = newRecord
        if (!dateSet.has(date)) {
          dateSet.add(date)
          allDates.push(date)
          allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        }
      }
    }

    tableContainer.addEventListener('click', async (e) => {
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

      try {
        await saveAttendance(enrollmentId, date, newStatus)
        refreshTable()
      } catch (err: any) {
        toast('error', err?.message || 'Error al guardar asistencia')
      }
    })
  } catch (err) {
    console.error('Error loading attendance:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencia</p>'
  }
}
