import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import { fetchExam, fetchExamAttempts } from '@/features/exams/actions'
import { notFound } from 'next/navigation'
import { gradeOpenQuestions } from '@/features/exams/actions'
import { formatDate } from '@/lib/formatDate'

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params
  const exam = await fetchExam(examId)
  if (!exam) notFound()

  const attempts = await fetchExamAttempts(examId)

  return (
    <div>
      <div className="mb-6">
        <Link href={`/coaches/courses/${id}/exams/${examId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver al examen
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Resultados: {exam.title}</h1>
      </div>

      <div className="space-y-4">
        {attempts.length === 0 && (
          <p className="text-sm text-zinc-500">Ningún estudiante ha realizado este examen aún.</p>
        )}
        {attempts.map((attempt: any) => (
          <div key={attempt.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">
                  {attempt.enrollments?.profiles?.avatar_url ? (
                    <img src={attempt.enrollments.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    attempt.enrollments?.profiles?.full_name?.charAt(0) ?? '?'
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{attempt.enrollments?.profiles?.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Intento #{attempt.attempt_num}</span>
                    {attempt.started_at && (
                      <>
                        <span>·</span>
                        <Clock size={12} />
                        <span>{formatDate(attempt.started_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {attempt.status === 'graded' ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-green-400">
                    <CheckCircle size={16} /> {attempt.score?.toFixed(1) ?? '-'}%
                  </span>
                ) : attempt.status === 'submitted' ? (
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Clock size={16} /> Pendiente de revisión
                  </span>
                ) : (
                  <span className="text-sm text-zinc-500">En progreso</span>
                )}
              </div>
            </div>

            {attempt.status === 'submitted' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-[#8B5CF6] hover:underline">Calificar respuestas abiertas</summary>
                <form action={gradeOpenQuestions} className="mt-3 space-y-3">
                  <input type="hidden" name="attemptId" value={attempt.id} />
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Asigna un puntaje a cada respuesta abierta (0-100)</p>
                  </div>
                  <button type="submit"
                    className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                    Publicar calificación
                  </button>
                </form>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
