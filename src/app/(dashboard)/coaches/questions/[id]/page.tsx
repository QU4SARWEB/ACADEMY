import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { fetchQuestion } from '@/features/questions/actions'
import { editQuestion } from '@/features/questions/actions'
import { notFound } from 'next/navigation'

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const question = await fetchQuestion(id)
  if (!question) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/coaches/questions" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Volver a preguntas
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-white">Editar Pregunta</h1>
      </div>

      <form action={editQuestion} className="glass max-w-2xl rounded-xl p-6 space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo</label>
          <input type="text" value={question.type} disabled
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Enunciado</label>
          <textarea name="stem" required rows={3} defaultValue={question.stem}
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Puntos</label>
            <input name="points" type="number" defaultValue={question.points} min={0.5} step={0.5}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Dificultad (1-5)</label>
            <input name="difficulty" type="number" defaultValue={question.difficulty} min={1} max={5}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Explicación</label>
          <textarea name="explanation" rows={2} defaultValue={question.explanation ?? ''}
            className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        </div>

        {(question.type === 'multiple_choice' || question.type === 'true_false') && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Opciones</label>
            <div className="space-y-2">
              {(question.question_options ?? []).map((opt: any, i: number) => (
                <div key={opt.id} className="flex items-center gap-2 option-row">
                  <input type="hidden" name="optionCorrect" value={opt.is_correct ? 'true' : 'false'} />
                  <input type="radio" name="correctOption" defaultChecked={opt.is_correct} className="accent-[#8B5CF6]"
                    onChange={(e) => {
                      e.currentTarget.closest('.option-row')?.querySelectorAll('input[type=hidden]').forEach(h => (h as HTMLInputElement).value = 'false')
                      e.currentTarget.previousElementSibling && ((e.currentTarget.previousElementSibling as HTMLInputElement).value = 'true')
                    }} />
                  <input name="optionText" defaultValue={opt.text}
                    className="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="submit"
            className="rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            Guardar cambios
          </button>
          <Link href="/coaches/questions"
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
