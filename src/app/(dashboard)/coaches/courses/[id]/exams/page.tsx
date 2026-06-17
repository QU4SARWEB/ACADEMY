'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, FileText, CheckCircle, XCircle, Eye } from 'lucide-react'
import { fetchExams, publishExamAction } from '@/features/exams/actions'
import { formatDate } from '@/lib/formatDate'

export default function CourseExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [exams, setExams] = useState<any[]>([])
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const [examsData, { data: courseData }] = await Promise.all([
        fetchExams(id),
        supabase.from('courses').select('name').eq('id', id).maybeSingle(),
      ])
      setExams(examsData)
      setCourse(courseData)
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="mt-1 h-4 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Exámenes</h1>
          <p className="mt-1 text-sm text-zinc-500">{course?.name}</p>
        </div>
        <Link
          href={`/coaches/courses/${id}/exams/new`}
          className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} /> Nuevo examen
        </Link>
      </div>

      <div className="space-y-3">
        {exams.length === 0 && (
          <p className="text-sm text-zinc-500">No hay exámenes creados para este curso.</p>
        )}
        {exams.map((exam: any) => (
          <div key={exam.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {exam.is_published ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <XCircle size={16} className="text-zinc-500" />
                  )}
                  <h2 className="text-base font-semibold text-white">{exam.title}</h2>
                  {exam.course_modules?.name && (
                    <span className="text-xs text-zinc-500">· {exam.course_modules.name}</span>
                  )}
                </div>
                {exam.description && (
                  <p className="mt-1 text-sm text-zinc-400">{exam.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Peso: {exam.weight}%</span>
                  <span>Nota mínima: {exam.passing_score}%</span>
                  {exam.time_limit && <span>Tiempo: {exam.time_limit}min</span>}
                  <span>Intentos: {exam.max_attempts}</span>
                  {exam.due_date && (
                    <span>Vence: {formatDate(exam.due_date)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/coaches/courses/${id}/exams/${exam.id}`}
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Eye size={16} />
                </Link>
                {!exam.is_published && (
                  <form action={async () => { await publishExamAction(exam.id) }}>
                    <button type="submit" className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition hover:bg-green-500/20">
                      Publicar
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
