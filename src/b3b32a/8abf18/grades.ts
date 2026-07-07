import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachGrades(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachGrades(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const assignedIds = await getAssignedCourseIds(session.user.id)
    let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('id, course_id, title, schedule_date, start_time')
      .in('course_id', idFilter)
      .order('schedule_date', { ascending: true })

    const schedulesByCourse: Record<string, any[]> = {}
    for (const s of allSchedules ?? []) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = []
      schedulesByCourse[s.course_id].push(s)
    }

    const { data: enrolls } = await supabase
      .from('enrollments')
      .select('id, profile_id, course_id, profiles(full_name)')
      .in('course_id', idFilter)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    const enrollsByCourse: Record<string, any[]> = {}
    for (const e of enrolls ?? []) {
      if (!enrollsByCourse[e.course_id]) enrollsByCourse[e.course_id] = []
      enrollsByCourse[e.course_id].push(e)
    }

    const allScheduleIds = (allSchedules ?? []).map((s: any) => s.id)
    const schedFilter = allScheduleIds.length > 0 ? allScheduleIds : ['00000000-0000-0000-0000-000000000000']
    const { data: allGrades } = await supabase
      .from('class_grades')
      .select('*')
      .in('schedule_id', schedFilter)

    const gradesMap = new Map<string, any>()
    for (const g of allGrades ?? []) {
      gradesMap.set(g.schedule_id + '_' + g.student_id, g)
    }

    const fmtDate = (d: string) => {
      if (!d) return '—'
      const dt = new Date(d + 'T12:00:00')
      return dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
    }

    const fmtTime = (d: string) => {
      if (!d) return ''
      return d.slice(0, 5)
    }

    const courseTabs = (courses ?? []).map((c: any) => {
      const schedules = schedulesByCourse[c.id] || []
      const enrollments = enrollsByCourse[c.id] || []
      const hasSchedules = schedules.length > 0
      const hasStudents = enrollments.length > 0

      if (!hasSchedules || !hasStudents) return ''

      const headerCells = schedules.map((s: any) =>
        `<th class="py-2 px-2 text-xs font-medium text-zinc-400 min-w-[90px] text-center" title="${escapeHtml(s.title || '')}">${fmtDate(s.schedule_date)}<br><span class="text-zinc-600">${fmtTime(s.start_time)}</span></th>`
      ).join('')

      const rows = enrollments.map((e: any) => {
        const studentName = e.profiles?.full_name || 'Desconocido'
        const cells = schedules.map((s: any) => {
          const g = gradesMap.get(s.id + '_' + e.profile_id)
          const theory = g?.theory_score ?? null
          const practice = g?.practice_score ?? null
          const total = theory !== null && practice !== null ? (parseFloat(theory) + parseFloat(practice)).toFixed(1) : '—'
          const color = total !== '—' ? (parseFloat(total) >= 14 ? 'text-green-400' : parseFloat(total) >= 11 ? 'text-yellow-400' : 'text-red-400') : ''
          return `<td class="py-2 px-2 text-center text-xs ${color}">${total}</td>`
        }).join('')

        const grades: number[] = schedules.map((s: any) => {
          const g = gradesMap.get(s.id + '_' + e.profile_id)
          return g ? (parseFloat(g.theory_score) + parseFloat(g.practice_score)) : null
        }).filter((x: any): x is number => x !== null)
        const avg = grades.length > 0 ? (grades.reduce((a: number, b: number) => a + b, 0) / grades.length).toFixed(1) : '—'
        const avgColor = avg !== '—' ? (parseFloat(avg) >= 14 ? 'text-green-400 font-bold' : parseFloat(avg) >= 11 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold') : ''

        return `<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30">
          <td class="py-2.5 px-3 text-sm text-white whitespace-nowrap">${escapeHtml(studentName)}</td>
          ${cells}
          <td class="py-2.5 px-3 text-center text-sm ${avgColor}">${avg}</td>
        </tr>`
      }).join('')

      return `
      <div class="rounded-xl border border-zinc-800 bg-[#111] overflow-hidden mb-6">
        <div class="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800">
          <h3 class="font-heading text-base font-bold text-white">${escapeHtml(c.name)}</h3>
          <p class="text-xs text-zinc-500 mt-0.5">${enrollments.length} alumno${enrollments.length !== 1 ? 's' : ''} · ${schedules.length} clase${schedules.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th class="py-2.5 px-3 font-medium sticky left-0 bg-[#111] z-10 min-w-[160px]">Alumno</th>
                ${headerCells}
                <th class="py-2.5 px-3 font-medium text-center min-w-[60px]">Promedio</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`
    }).filter(Boolean).join('')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Notas</h1>
        <p class="mt-1 text-sm text-zinc-500">Planilla de notas por curso — Teor\u00eda (0-5) + Pr\u00e1ctica (0-15) = Total (0-20)</p>
      </div>
      ${courseTabs || '<p class="text-sm text-zinc-500">No hay cursos con clases y alumnos asignados.</p>'}
      <p class="text-xs text-zinc-600">Las notas se ingresan desde <a href="#/coaches/schedules" class="text-[#8B5CF6] hover:underline">Horarios</a> &gt; bot\u00f3n "Notas" en cada clase.</p>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notas</p>'
  }
}
