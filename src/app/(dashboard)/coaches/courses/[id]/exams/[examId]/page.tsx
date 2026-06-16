import Link from 'next/link'
import { ArrowLeft, Trash2, Users } from 'lucide-react'
import { fetchExam, detachQuestionFromExam } from '@/features/exams/actions'

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params
  const exam = await fetchExam(examId)
  if (!exam) return <p className="text-sm text-zinc-500">Examen no encontrado.</p>

  const examQuestions = exam.exam_questions ?? []

  return (
    <div>
      <div className="mb-6">
        <Link href={`/coaches/courses/${id}/exams`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver a exámenes
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="font-heading text-2xl font-bold text-white">{exam.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {examQuestions.length} preguntas · Peso: {exam.weight}% · Nota mínima: {exam.passing_score}%
              {exam.time_limit && ` · ${exam.time_limit}min`}
            </p>
          </div>
          <Link
            href={`/coaches/courses/${id}/exams/${examId}/results`}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            <Users size={16} /> Resultados
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {examQuestions.length === 0 && (
          <p className="text-sm text-zinc-500">Este examen no tiene preguntas asignadas.</p>
        )}
        {examQuestions.map((eq: any, i: number) => (
          <div key={eq.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                  <span className="text-xs text-zinc-500">{eq.questions?.type === 'multiple_choice' ? 'Opción múltiple' : eq.questions?.type === 'true_false' ? 'V/F' : eq.questions?.type === 'short_answer' ? 'Resp. corta' : 'Desarrollo'}</span>
                  <span className="text-xs text-zinc-600">{eq.points ?? eq.questions?.points} pts</span>
                </div>
                <p className="mt-1 text-sm text-white">{eq.questions?.stem}</p>
              </div>
              <form action={async () => { 'use server'; await detachQuestionFromExam(examId, eq.question_id) }}>
                <button type="submit" className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
