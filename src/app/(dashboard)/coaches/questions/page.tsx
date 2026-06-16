import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileQuestion, Edit, Trash2, Loader } from 'lucide-react'
import { fetchQuestions } from '@/features/questions/actions'
import { removeQuestion } from '@/features/questions/actions'

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Opción múltiple',
  true_false: 'Verdadero/Falso',
  short_answer: 'Respuesta corta',
  open_ended: 'Desarrollo',
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const { courseId } = await searchParams
  const supabase = await createClient()
  const questions = await fetchQuestions(courseId)

  const { data: courses } = await supabase.from('courses').select('id, name').order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Banco de Preguntas</h1>
          <p className="mt-1 text-sm text-zinc-500">Crea y gestiona preguntas para los exámenes</p>
        </div>
        <Link
          href="/coaches/questions/new"
          className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} /> Nueva pregunta
        </Link>
      </div>

      <form className="mb-4 flex gap-2">
        <select
          name="courseId"
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('courseId', e.target.value)
            else url.searchParams.delete('courseId')
            window.location.href = url.toString()
          }}
          className="w-64 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
        >
          <option value="">Todos los cursos</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id} selected={c.id === courseId}>{c.name}</option>
          ))}
        </select>
      </form>

      <div className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-zinc-500">No hay preguntas creadas.</p>
        )}
        {questions.map((q: any) => (
          <div key={q.id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{
                    backgroundColor: q.type === 'multiple_choice' ? '#8B5CF6' : q.type === 'true_false' ? '#10B981' : q.type === 'short_answer' ? '#F59E0B' : '#3B82F6'
                  }} />
                  <span className="text-xs uppercase tracking-wider text-zinc-500">{TYPE_LABELS[q.type] ?? q.type}</span>
                  <span className="text-xs text-zinc-600">{q.points} pts</span>
                  {q.difficulty && (
                    <span className="text-xs text-zinc-600">Dificultad: {'★'.repeat(q.difficulty)}{'☆'.repeat(5 - q.difficulty)}</span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-white">{q.stem}</p>
                {q.question_options?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {q.question_options.map((o: any) => (
                      <div key={o.id} className={`flex items-center gap-2 text-xs ${o.is_correct ? 'text-green-400' : 'text-zinc-500'}`}>
                        <span className={`h-2 w-2 rounded-full ${o.is_correct ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        {o.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/coaches/questions/${q.id}`}
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Edit size={14} />
                </Link>
                <form action={async () => { 'use server'; await removeQuestion(q.id) }}>
                  <button type="submit" className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
