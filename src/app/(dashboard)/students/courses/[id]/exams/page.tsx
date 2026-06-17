'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileText, ArrowLeft } from 'lucide-react'
import { fetchExams } from '@/features/exams/actions'
import { formatDate } from '@/lib/formatDate'

export default function StudentExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [exams, setExams] = useState<any[]>([])
  const [enrollment, setEnrollment] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const examsData = await fetchExams(id)
      setExams(examsData.filter((e: any) => e.is_published))

      const { data: enr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', id)
        .eq('profile_id', user?.id)
        .maybeSingle()
      setEnrollment(enr)

      const { data: c } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()
      setCourse(c)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 flex gap-3">
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/students/courses/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver al curso
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Exámenes — {course?.name}</h1>
      </div>

      <div className="space-y-3">
        {exams.length === 0 && (
          <p className="text-sm text-zinc-500">No hay exámenes disponibles.</p>
        )}
        {exams.map((exam: any) => (
          <div key={exam.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-white">{exam.title}</h2>
                {exam.description && (
                  <p className="mt-1 text-sm text-zinc-400">{exam.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  {exam.time_limit && <span>Tiempo: {exam.time_limit} min</span>}
                  <span>Nota mínima: {exam.passing_score}%</span>
                  <span>Intentos: {exam.max_attempts}</span>
                  {exam.due_date && (
                    <span>Vence: {formatDate(exam.due_date)}</span>
                  )}
                </div>
              </div>
              {enrollment && (
                <Link
                  href={`/students/courses/${id}/exams/${exam.id}`}
                  className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
                >
                  <FileText size={16} /> Iniciar
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
