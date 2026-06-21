import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { STATUS_LABELS, STATUS_COLORS, STATUS_ICONS, STATUSES, CYCLE_ORDER } from './attendance_utils'

export function renderCoachAttendanceOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachAttendanceOverview(): Promise<void> {
  try {
    const { data: allCourses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courses = allCourses ?? []

    async function renderGrid() {
      const courseIds = courses.map(c => c.id)
      const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', courseIds.length ? courseIds : ['none'])
      const studentCount: Record<string, number> = {}
      for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }
      document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Asistencias</h1><p class="mt-1 text-sm text-zinc-500">${courses.length} cursos · ${(enrolls ?? []).length} inscripciones</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${courses.map(c => '<button class="course-att-btn glass rounded-xl p-5 text-left transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5" data-course-id="' + c.id + '" data-course-name="' + escapeHtml(c.name) + '"><div class="flex items-center justify-between"><div><h3 class="font-medium text-white">' + escapeHtml(c.name) + '</h3><p class="mt-1 text-sm text-zinc-500">' + (studentCount[c.id] || 0) + ' estudiantes</p></div>' + Icon('chevronRight', 20) + '</div></button>').join('')}
      </div>`
      document.querySelectorAll('.course-att-btn').forEach(btn => { btn.addEventListener('click', () => { renderAttendance((btn as HTMLElement).dataset.courseId || '', (btn as HTMLElement).dataset.courseName || '') }) })
    }

    async function renderAttendance(courseId: string, courseName: string) {
      const { data: enrollmentsRaw } = await supabase.from('enrollments').select('id, profile_id, profiles!profile_id(full_name, avatar_url, riot_id, social_discord)').eq('course_id', courseId).eq('status', 'active')
      const enrollments = enrollmentsRaw ?? []
      const enrollmentIds = enrollments.map((e: any) => e.id)
      let attendanceMap: Record<string, Record<string, any>> = {}
      const dateSet = new Set<string>()
      if (enrollmentIds.length > 0) {
        const { data: records } = await supabase.from('attendance').select('*').in('enrollment_id', enrollmentIds).order('date', { ascending: false })
        for (const r of records ?? []) { if (!attendanceMap[r.enrollment_id]) attendanceMap[r.enrollment_id] = {}; attendanceMap[r.enrollment_id][r.date] = r; dateSet.add(r.date) }
      }
      const allDates = [...dateSet].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      const now = new Date()
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
      const today = now.toISOString().split('T')[0]

      function renderTable(selectedMonth: string, selectedDate: string): string {
        const filteredDates = allDates.filter(d => d.startsWith(selectedMonth))
        const colspan = Math.max(2, filteredDates.length + 2)
        return '<div class="overflow-x-auto rounded-xl border border-zinc-800"><table class="w-full text-left text-sm"><thead><tr class="border-b border-zinc-800 bg-zinc-900/50"><th class="sticky left-0 z-10 bg-zinc-900/50 px-4 py-3 font-medium text-zinc-400 min-w-[140px]">Alumno</th>' + filteredDates.map(d => '<th class="min-w-[100px] px-3 py-3 text-center text-xs text-zinc-500">' + formatDate(d, { day: 'numeric', month: 'short' }) + '</th>').join('') + '<th class="min-w-[120px] px-3 py-3 text-center text-xs text-purple-400">' + formatDate(selectedDate, { day: 'numeric', month: 'short' }) + '</th></tr></thead><tbody>' + (enrollments.length === 0 ? '<tr><td colspan="' + colspan + '" class="px-4 py-8 text-center text-zinc-500">No hay alumnos inscritos.</td></tr>' : enrollments.map((enr: any) => { const p: any = enr.profiles || {}; const dn = [p.riot_id || p.full_name, p.social_discord].filter(Boolean).join(' | ') || p.full_name || 'Desconocido'; const avatar = p.avatar_url; const initial = dn.charAt(0).toUpperCase(); return '<tr class="border-b border-zinc-800/50 hover:bg-zinc-800/30"><td class="sticky left-0 z-10 bg-[#0A0A0A] px-4 py-3"><div class="flex items-center gap-2"><div class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">' + (avatar ? '<img src="' + escapeHtml(avatar) + '" class="h-full w-full object-cover" />' : escapeHtml(initial)) + '</div><span class="text-white text-sm">' + escapeHtml(dn) + '</span></div></td>' + filteredDates.map(d => { const record = attendanceMap[enr.id]?.[d]; const status = record?.status; return '<td class="px-3 py-3 text-center">' + (status ? '<button class="btn-attendance inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ' + STATUS_COLORS[status] + '" data-enrollment="' + enr.id + '" data-date="' + d + '" data-status="' + status + '">' + STATUS_ICONS[status] + ' ' + STATUS_LABELS[status] + '</button>' : '<button class="btn-attendance text-zinc-600 hover:text-zinc-400 text-xs" data-enrollment="' + enr.id + '" data-date="' + d + '" data-status="">—</button>') + '</td>' }).join('') + '<td class="px-3 py-3 text-center"><div class="flex items-center justify-center gap-1">' + STATUSES.map(s => '<button class="btn-attendance-quick rounded-full p-1.5 text-xs hover:scale-110 ' + STATUS_COLORS[s] + '" data-enrollment="' + enr.id + '" data-status="' + s + '" title="' + STATUS_LABELS[s] + '">' + STATUS_ICONS[s] + '</button>').join('') + '</div></td></tr>' }).join('')) + '</tbody></table></div>'
      }

      document.getElementById('page-content')!.innerHTML = `
      <div class="mb-4"><button id="back-to-grid" class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Todos los cursos</button></div>
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Asistencia · ${escapeHtml(courseName)}</h1><p class="mt-1 text-sm text-zinc-500">Gestiona la asistencia de los estudiantes</p></div>
      <div class="mb-4 flex items-center gap-3 flex-wrap"><label class="text-xs text-zinc-500">Filtrar por mes:</label><input type="month" id="attendance-month" value="${escapeHtml(currentMonth)}" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" /><label class="text-xs text-zinc-500 ml-4">Nueva fecha:</label><input type="date" id="attendance-newdate" value="${escapeHtml(today)}" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" /></div>
      <div id="attendance-table-container">${renderTable(currentMonth, today)}</div>`

      document.getElementById('back-to-grid')?.addEventListener('click', () => renderGrid())

      const monthInput = document.getElementById('attendance-month') as HTMLInputElement
      const dateInput = document.getElementById('attendance-newdate') as HTMLInputElement
      const tableContainer = document.getElementById('attendance-table-container')!

      function refreshTable() { tableContainer.innerHTML = renderTable(monthInput?.value || currentMonth, dateInput?.value || today) }
      monthInput?.addEventListener('change', refreshTable)
      dateInput?.addEventListener('change', refreshTable)

      async function saveAttendance(enrollmentId: string, date: string, newStatus: string) {
        const record = attendanceMap[enrollmentId]?.[date]
        if (record) {
          if (newStatus === '') { await supabase.from('attendance').delete().eq('id', record.id); delete attendanceMap[enrollmentId][date]; if (Object.keys(attendanceMap[enrollmentId]).length === 0) delete attendanceMap[enrollmentId] }
          else { await supabase.from('attendance').update({ status: newStatus }).eq('id', record.id); record.status = newStatus }
        } else if (newStatus !== '') {
          const { data: enrData } = await supabase.from('enrollments').select('season_id').eq('id', enrollmentId).maybeSingle()
          if (!enrData?.season_id) return
          const { data: newRecord } = await supabase.from('attendance').insert({ enrollment_id: enrollmentId, season_id: enrData.season_id, date, status: newStatus }).select().single()
          if (newRecord) { if (!attendanceMap[enrollmentId]) attendanceMap[enrollmentId] = {}; attendanceMap[enrollmentId][date] = newRecord; if (!dateSet.has(date)) { dateSet.add(date); allDates.push(date); allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) } }
        }
      }

      tableContainer.addEventListener('click', async (e) => {
        const target = (e.target as HTMLElement).closest('.btn-attendance, .btn-attendance-quick') as HTMLElement
        if (!target) return
        const enrollmentId = target.dataset.enrollment!
        let date: string; let newStatus: string
        if (target.classList.contains('btn-attendance-quick')) { date = dateInput?.value; if (!date) return; newStatus = target.dataset.status! }
        else { date = target.dataset.date!; const currentStatus = target.dataset.status || ''; newStatus = CYCLE_ORDER[(CYCLE_ORDER.indexOf(currentStatus) + 1) % CYCLE_ORDER.length] }
        if (!date) return
        try { await saveAttendance(enrollmentId, date, newStatus); refreshTable() } catch (err: any) { toast('error', err?.message || 'Error') }
      })
    }

    await renderGrid()
  } catch (err) {
    console.error('Error loading attendance:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencias</p>'
  }
}
