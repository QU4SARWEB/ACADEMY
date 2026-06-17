'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import GradeBreakdownCard from './GradeBreakdownCard'

export default function CoachGradebookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [course, setCourse] = useState<any>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: courseData } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('id, profile_id, exam_score, final_grade, promoted, profiles(full_name, avatar_url)')
        .eq('course_id', id)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: true })

      setCourse(courseData)
      setEnrollments(enrollmentsData ?? [])
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Notas · {course.name}</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Desglose: Examen 50% · Evaluaciones 35% · Asistencia 15%
      </p>

      <div className="space-y-4">
        {enrollments.length === 0 && (
          <p className="text-sm text-zinc-500">No hay alumnos activos.</p>
        )}
        {enrollments.map((enr: any) => (
          <GradeBreakdownCard key={enr.id} enrollment={enr} courseId={id} />
        ))}
      </div>
    </div>
  )
}
