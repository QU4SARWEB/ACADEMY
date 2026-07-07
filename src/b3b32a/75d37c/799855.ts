import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { renderSchedulePage } from '@/b3b32a/shared/schedule'

export function renderStudentSchedule(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentSchedule(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const enrolledCourseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]
    let schedules: any[] = []
    if (enrolledCourseIds.length > 0) {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .in('course_id', enrolledCourseIds)
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
