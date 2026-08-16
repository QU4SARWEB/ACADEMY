import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { renderSchedulePage } from '@/b3b32a/shared/schedule'
import { getStudentCourseIds } from '@/2b3583/student_view'

export function renderStudentSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const courseFilter = new URLSearchParams(location.hash.split('?')[1] || '').get('course')
    const enrolledCourseIds = await getStudentCourseIds(session.user.id)
    const scheduleCourseIds = courseFilter ? enrolledCourseIds.filter(id => id === courseFilter) : enrolledCourseIds
    let schedules: any[] = []
    if (scheduleCourseIds.length > 0) {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .in('course_id', scheduleCourseIds)
        .order('schedule_date')
        .order('start_time')
      schedules = data ?? []
    }

    renderSchedulePage(schedules, 'Horarios', `${schedules.length} horario${schedules.length !== 1 ? 's' : ''} publicados`, 'calendar', 'ring-1 ring-[#8B5CF6]/30', 'cls')
  } catch (err) {
    console.error('Error loading schedule:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar horario</p>'
  }
}
