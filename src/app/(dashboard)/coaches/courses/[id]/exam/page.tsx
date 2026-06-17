'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import ExamGradingForm from './ExamGradingForm'

export default function CoachExamPage({
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
        .select('id, profile_id, exam_score, final_grade, profiles(full_name, avatar_url)')
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
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-4 w-96 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!course) return <p className="text-zinc-400">Curso no encontrado.</p>

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Examen Final · {course.name}</h1>
      <p className="mb-6 text-sm text-zinc-400">Registra la nota del examen final (0–100). Peso: 50% de la nota final.</p>

      <ExamGradingForm courseId={id} enrollments={enrollments as any[]} />
    </div>
  )
}
