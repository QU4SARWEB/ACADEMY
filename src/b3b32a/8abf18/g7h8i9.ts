import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'

const STATUS_LABELS: Record<string, string> = { present: 'Presente', absent: 'Ausente', late: 'Tardanza', excused: 'Justificado' }
const STATUS_COLORS: Record<string, string> = { present: 'bg-green-500/20 text-green-400', absent: 'bg-red-500/20 text-red-400', late: 'bg-yellow-500/20 text-yellow-400', excused: 'bg-blue-500/20 text-blue-400' }
const STATUS_ICONS: Record<string, string> = { present: Icon('checkCircle', 14), absent: Icon('x', 14), late: Icon('alertTriangle', 14), excused: Icon('info', 14) }
const STATUSES = ['present', 'absent', 'late', 'excused'] as const
const CYCLE_ORDER = ['', 'present', 'absent', 'late', 'excused']

export function renderCoachAttendanceOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachAttendanceOverview(): Promise<void> {
  try {
    const { data: allCourses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courses = allCourses ?? []
    let selectedCourseId = courses.length > 0 ? courses[0].id : ''

    async function render(courseId: string) {
      const course = courses.find((c: any) => c.id === courseId)
      const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Asistencias</h1>
        <p class="mt-1 text-sm text-zinc-500">${course ? escapeHtml(course.name) : 'Selecciona un curso'}</p>
      </div>
      <div class="mb-4">
        <select id="att-course-filter" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
          <option value="">Seleccionar curso...</option>
          ${courses.map((c: any) => '<option value="' + c.id + '" ' + (c.id === courseId ? 'selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('')}
        </select>
      </div>
      <div id="attendance-content">${courseId ? Spinner() : '<p class="text-sm text-zinc-500">Selecciona un curso para ver sus asistencias.</p>'}</div>`

      document.getElementById('page-content')!.innerHTML = html

      if (courseId) await loadAttendance(courseId)

      document.getElementById('att-course-filter')?.addEventListener('change', (e) => {
        selectedCourseId = (e.target as HTMLSelectElement).value
        render(selectedCourseId)
      })
    }

    async function loadAttendance(courseId: string) {
      const el = document.getElementById('attendance-content')
      if (!el) return

      const { data: enrollmentsRaw } = await supabase
        .from('enrollments')
        .select('id, profile_id, profiles!profile_id(full_name, avatar_url, riot_id, social_discord)')
        .eq('course_id', courseId)
        .eq('status', 'active')

      const enrollments = enrollmentsRaw ?? []
      const enrollmentIds = enrollments.map((e: any) => e.id)
      let attendanceMap: Record<string, Record<string, any>> = {}
      const dateSet = new Set<string>()

      if (enrollmentIds.length > 0) {
        const { data: records } = await supabase.from('attendance').select('*').in('enrollment_id', enrollmentIds).order('date', { ascending: false })
        for (const r of records ?? []) {
          if (!attendanceMap[r.enrollment_id]) attendanceMap[r.enrollment_id] = {}
          attendanceMap[r.enrollment_id][r.date] = r
          dateSet.add(r.date)
        }
      }

      const allDates = [...dateSet].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      const now = new Date()

      let tblHtml = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-zinc-800 text-left text-xs text-zinc-500"><th class="pb-2 pr-3 font-medium">Alumno</th>'
      for (const d of allDates) {
        const dObj = new Date(d + 'T00:00:00')
        const isFuture = dObj > now
        tblHtml += '<th class="pb-2 pr-2 font-medium text-center ' + (isFuture ? 'text-zinc-600' : '') + '">' + formatDate(d) + '</th>'
      }
      tblHtml += '</tr></thead><tbody>'

      for (const enrollment of enrollments) {
        const prof: any = (enrollment as any).profiles || {}
        const displayName = [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || prof.full_name || 'Unknown'
        tblHtml += '<tr class="border-b border-zinc-800/50"><td class="py-2 pr-3"><div class="flex items-center gap-2">' + (prof.avatar_url ? '<img src="' + escapeHtml(prof.avatar_url) + '" class="h-6 w-6 rounded-full object-cover" />' : '') + '<span class="text-white text-xs truncate max-w-[150px]" title="' + escapeHtml(displayName) + '">' + escapeHtml(displayName) + '</span></div></td>'
        for (const d of allDates) {
          const record = attendanceMap[enrollment.id]?.[d]
          const dObj = new Date(d + 'T00:00:00')
          const isFuture = dObj > now
          if (isFuture) {
            tblHtml += '<td class="py-2 pr-2 text-center text-zinc-700">—</td>'
          } else if (record) {
            const color = STATUS_COLORS[record.status] || 'text-zinc-500'
            tblHtml += '<td class="py-2 pr-2 text-center"><span data-att-id="' + record.id + '" data-eid="' + enrollment.id + '" data-date="' + d + '" class="att-status inline-flex cursor-pointer items-center justify-center rounded px-2 py-1 text-xs ' + color + '" title="' + (STATUS_LABELS[record.status] || record.status) + '">' + (STATUS_ICONS[record.status] || '?') + '</span></td>'
          } else {
            tblHtml += '<td class="py-2 pr-2 text-center"><span data-eid="' + enrollment.id + '" data-date="' + d + '" class="att-status inline-flex cursor-pointer items-center justify-center rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-800" title="Sin registro">' + Icon('helpCircle', 14) + '</span></td>'
          }
        }
        tblHtml += '</tr>'
      }
      tblHtml += '</tbody></table></div>'
      tblHtml += '<p class="mt-3 text-xs text-zinc-500">Click en un status para cambiarlo: Presente → Ausente → Tardanza → Justificado → Sin registro</p>'

      el.innerHTML = tblHtml

      el.querySelectorAll('.att-status').forEach(span => {
        span.addEventListener('click', async () => {
          const s = span as HTMLElement
          const attId = s.dataset.attId
          const eid = s.dataset.eid
          const date = s.dataset.date
          if (!eid || !date) return
          if (!attId) {
            await supabase.from('attendance').insert({ enrollment_id: eid, date, status: 'present' })
          } else {
            const currentStatus = s.title || ''
            const idx = CYCLE_ORDER.indexOf(currentStatus)
            const nextStatus = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
            if (!nextStatus) {
              await supabase.from('attendance').delete().eq('id', attId)
            } else {
              await supabase.from('attendance').update({ status: nextStatus }).eq('id', attId)
            }
          }
          toast('success', 'Asistencia actualizada')
          await loadAttendance(courseId)
        })
      })
    }

    await render(selectedCourseId)
  } catch (err) {
    console.error('Error loading attendance:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar asistencias</p>'
  }
}
