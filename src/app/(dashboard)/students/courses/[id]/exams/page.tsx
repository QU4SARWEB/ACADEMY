import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'
import { fetchExams } from '@/features/exams/actions'
import { formatDate } from '@/lib/formatDate'

export default async function StudentExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const exams = await fetchExams(id)
  const publishedExams = exams.filter((e: any) => e.is_published)

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', id)
    .eq('profile_id', user?.id)
    .maybeSingle()

  const { data: course } = await supabase.from('courses').select('name').eq('id', id).maybeSingle()

  return (
    <div>
      <div className="mb-6">
        <Link href={`/students/courses/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver al curso
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Exámenes — {course?.name}</h1>
      </div>

      <div className="space-y-3">
        {publishedExams.length === 0 && (
          <p className="text-sm text-zinc-500">No hay exámenes disponibles.</p>
        )}
        {publishedExams.map((exam: any) => (
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
