'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import AttendanceGrid from './AttendanceGrid'

export default function CoachAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any[]>>({})
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()

      const { data: courseData } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()
      if (!courseData) { setLoading(false); return }

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('id, profile_id, profiles(full_name, avatar_url)')
        .eq('course_id', id)
        .eq('status', 'active')

      const enrollmentIds = (enrollmentsData ?? []).map((e: any) => e.id)

      let map: Record<string, any[]> = {}
      if (enrollmentIds.length > 0) {
        const { data: records } = await supabase
          .from('attendance')
          .select('*')
          .in('enrollment_id', enrollmentIds)
          .order('date', { ascending: false })

        for (const r of records ?? []) {
          if (!map[r.enrollment_id]) map[r.enrollment_id] = []
          map[r.enrollment_id].push(r)
        }
      }

      const dateSet = new Set<string>()
      for (const records of Object.values(map)) {
        for (const r of records) {
          dateSet.add(r.date)
        }
      }
      const sortedDates = [...dateSet].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      setCourse(courseData)
      setEnrollments(enrollmentsData ?? [])
      setAttendanceMap(map)
      setDates(sortedDates)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-xl bg-zinc-800" />
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Asistencia · {course.name}</h1>

      <AttendanceGrid
        courseId={id}
        enrollments={enrollments as any[]}
        attendanceMap={attendanceMap}
        dates={dates}
      />
    </div>
  )
}
