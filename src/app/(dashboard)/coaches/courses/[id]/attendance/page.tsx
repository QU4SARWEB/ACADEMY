import { createClient } from '@/lib/supabase/server'
import AttendanceGrid from './AttendanceGrid'

export default async function CoachAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()
  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, profile_id, profiles(full_name, avatar_url)')
    .eq('course_id', id)
    .eq('status', 'active')

  const enrollmentIds = (enrollments ?? []).map((e: any) => e.id)

  let attendanceMap: Record<string, any[]> = {}
  if (enrollmentIds.length > 0) {
    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .in('enrollment_id', enrollmentIds)
      .order('date', { ascending: false })

    for (const r of records ?? []) {
      if (!attendanceMap[r.enrollment_id]) attendanceMap[r.enrollment_id] = []
      attendanceMap[r.enrollment_id].push(r)
    }
  }

  const dates = new Set<string>()
  for (const records of Object.values(attendanceMap)) {
    for (const r of records) {
      dates.add(r.date)
    }
  }
  const sortedDates = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Asistencia · {course.name}</h1>

      <AttendanceGrid
        courseId={id}
        enrollments={enrollments as any[]}
        attendanceMap={attendanceMap}
        dates={sortedDates}
      />
    </div>
  )
}
