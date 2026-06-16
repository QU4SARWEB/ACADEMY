import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus } from 'lucide-react'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { formatDate } from '@/lib/formatDate'
import { parseDateTime } from '@/lib/parseDateTime'

async function updateEval(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string

  const { error } = await supabase.from('evaluations').update({
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    max_score: parseFloat(formData.get('maxScore') as string) || 100,
    weight: parseFloat(formData.get('weight') as string) || 0,
    due_date: formData.get('dueDate') ? parseDateTime(formData.get('dueDate') as string) : null,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${id}`)
}

async function deleteEval(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string

  const { error } = await supabase.from('evaluations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/coaches/evaluations')
  redirect('/coaches/evaluations')
}

async function addQuestion(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const evaluationId = formData.get('evaluationId') as string
  const questionId = formData.get('questionId') as string

  const { error } = await supabase.from('evaluation_questions').insert({
    evaluation_id: evaluationId,
    question_id: questionId,
    order_num: parseInt(formData.get('orderNum') as string) || 0,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}

async function removeQuestion(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const evaluationId = formData.get('evaluationId') as string

  const { error } = await supabase.from('evaluation_questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}

async function gradeAnswer(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const answerId = formData.get('answerId') as string
  const score = parseFloat(formData.get('score') as string) || 0
  const evaluationId = formData.get('evaluationId') as string

  const { error } = await supabase.from('evaluation_answers').update({
    score,
    graded_by: (await supabase.auth.getUser()).data.user?.id,
    graded_at: new Date().toISOString(),
  }).eq('id', answerId)

  if (error) throw new Error(error.message)
  revalidatePath(`/coaches/evaluations/${evaluationId}`)
}

export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('evaluations')
    .select('*, course_modules(name, course_id, courses(name))')
    .eq('id', id)
    .maybeSingle()

  if (!ev) return <p className="text-zinc-400">Evaluación no encontrada.</p>

  const courseId = ev.course_modules?.course_id

  const { data: evalQuestions } = await supabase
    .from('evaluation_questions')
    .select('*, questions(*)')
    .eq('evaluation_id', id)
    .order('order_num')

  const questionIds = (evalQuestions ?? []).map((eq) => eq.question_id)

  const { data: allOptions } = await supabase
    .from('question_options')
    .select('*')
    .in('question_id', questionIds.length > 0 ? questionIds : ['none'])
    .order('order_num')

  const optsByQuestion: Record<string, typeof allOptions> = {}
  for (const o of allOptions ?? []) {
    if (!optsByQuestion[o.question_id]) optsByQuestion[o.question_id] = []
    optsByQuestion[o.question_id]!.push(o)
  }

  const { data: results } = await supabase
    .from('evaluation_results')
    .select('*, enrollments(profile_id, profiles(full_name, avatar_url))')
    .eq('evaluation_id', id)
    .order('created_at', { ascending: false })

  const eqIds = (evalQuestions ?? []).map((eq) => eq.id)
  const { data: answers } = await supabase
    .from('evaluation_answers')
    .select('*')
    .in('evaluation_question_id', eqIds.length > 0 ? eqIds : ['none'])

  const answersByEq: Record<string, typeof answers> = {}
  for (const a of answers ?? []) {
    if (!answersByEq[a.evaluation_question_id]) answersByEq[a.evaluation_question_id] = []
    answersByEq[a.evaluation_question_id]!.push(a)
  }

  const answersByEnrollment: Record<string, typeof answers> = {}
  for (const a of answers ?? []) {
    if (!answersByEnrollment[a.enrollment_id]) answersByEnrollment[a.enrollment_id] = []
    answersByEnrollment[a.enrollment_id]!.push(a)
  }

  const { data: availableQuestions } = await supabase
    .from('questions')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  const usedIds = new Set(questionIds)
  const unusedQuestions = (availableQuestions ?? []).filter((q) => !usedIds.has(q.id))

  return (
    <div>
      <Link href="/coaches/evaluations" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver a evaluaciones
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{ev.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {ev.course_modules?.courses?.name} / {ev.course_modules?.name}
          </p>
          <p className="text-sm text-zinc-500">
            {ev.max_score} pts · Peso: {ev.weight}%
            {ev.due_date && ` · Límite: ${formatDate(ev.due_date)}`}
          </p>
          {ev.description && <p className="mt-2 text-sm text-zinc-300">{ev.description}</p>}
        </div>
        <ConfirmDeleteForm message="¿Eliminar esta evaluación?" action={deleteEval}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10">
            <Trash2 size={14} /> Eliminar
          </button>
        </ConfirmDeleteForm>
      </div>

      <details className="glass mb-6 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">Editar evaluación</summary>
        <div className="border-t border-zinc-800 px-4 py-4">
          <form action={updateEval} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Título</label>
                <input name="title" defaultValue={ev.title} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Puntaje máximo</label>
                <input name="maxScore" type="number" defaultValue={ev.max_score} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Peso (%)</label>
                <input name="weight" type="number" defaultValue={ev.weight} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400">Fecha límite</label>
                <input name="dueDate" type="date" defaultValue={ev.due_date?.slice(0, 10)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Guardar cambios
            </button>
          </form>
        </div>
      </details>

      {/* Questions */}
      <div className="mb-6">
        <h2 className="mb-4 font-heading text-lg font-bold text-white">
          Preguntas ({evalQuestions?.length ?? 0})
        </h2>

        {(evalQuestions ?? []).length === 0 && (
          <p className="mb-4 text-sm text-zinc-500">Sin preguntas. Añade preguntas del banco de preguntas del curso.</p>
        )}

        <div className="space-y-4">
          {(evalQuestions ?? []).map((eq, i) => {
            const q = eq.questions as any
            const options = optsByQuestion[q.id] ?? []
            const eqAnswers = answersByEq[eq.id] ?? []
            return (
              <div key={eq.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">#{i + 1}</span>
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">{q.type}</span>
                      <span className="text-xs text-zinc-500">{q.points} pts</span>
                    </div>
                    <p className="mt-2 text-sm text-white">{q.stem}</p>
                    {q.explanation && <p className="mt-1 text-xs text-zinc-500">{q.explanation}</p>}
                    {options.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {options.map((o) => (
                          <div key={o.id} className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${o.is_correct ? 'bg-green-500/10 text-green-400' : 'text-zinc-400'}`}>
                            <span>{o.is_correct ? '✓' : '○'}</span>
                            <span>{o.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <form action={removeQuestion}>
                    <input type="hidden" name="id" value={eq.id} />
                    <input type="hidden" name="evaluationId" value={id} />
                    <button type="submit" className="rounded p-1 text-zinc-600 transition hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>

                {/* Per-student grading for open-ended questions */}
                {(q.type === 'open_ended' || q.type === 'short_answer') && eqAnswers.length > 0 && (
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <p className="mb-2 text-xs font-medium text-zinc-400">Respuestas de estudiantes:</p>
                    <div className="space-y-2">
                      {eqAnswers.map((a: any) => {
                        const enrollment = (results ?? []).find((r: any) => r.enrollment_id === a.enrollment_id) as any
                        return (
                          <form key={a.id} action={gradeAnswer} className="flex items-start gap-3">
                            <input type="hidden" name="answerId" value={a.id} />
                            <input type="hidden" name="evaluationId" value={id} />
                            <div className="flex-1">
                              <p className="text-xs text-zinc-500">{enrollment?.enrollments?.profiles?.full_name ?? '—'}</p>
                              <p className="mt-1 rounded bg-zinc-800/50 px-2 py-1 text-sm text-zinc-300">{a.text_answer}</p>
                            </div>
                            {a.score != null ? (
                              <div className="flex items-center gap-2">
                                <input name="score" type="number" defaultValue={a.score} step="0.01" className="w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-center text-sm text-white outline-none focus:border-[#8B5CF6]" />
                                <span className="text-xs text-zinc-500">/ {q.points}</span>
                                <button type="submit" className="rounded bg-[#8B5CF6]/20 px-2 py-1 text-xs text-[#8B5CF6] transition hover:bg-[#8B5CF6]/30">
                                  Actualizar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input name="score" type="number" defaultValue={q.points} step="0.01" className="w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-center text-sm text-white outline-none focus:border-[#8B5CF6]" />
                                <span className="text-xs text-zinc-500">/ {q.points}</span>
                                <button type="submit" className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 transition hover:bg-emerald-500/30">
                                  Calificar
                                </button>
                              </div>
                            )}
                          </form>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add question from bank */}
        {unusedQuestions.length > 0 && (
          <details className="glass mt-4 rounded-xl">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300">
              <Plus size={14} /> Añadir pregunta del banco
            </summary>
            <div className="border-t border-zinc-800 px-4 py-4">
              <form action={addQuestion} className="space-y-3">
                <input type="hidden" name="evaluationId" value={id} />
                <input type="hidden" name="orderNum" value={evalQuestions?.length ?? 0} />
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Seleccionar pregunta</label>
                  <select name="questionId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="">Seleccionar...</option>
                    {unusedQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        [{q.type}] {q.stem.slice(0, 80)}{q.stem.length > 80 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                  Añadir
                </button>
              </form>
            </div>
          </details>
        )}

        {unusedQuestions.length === 0 && (availableQuestions ?? []).length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">Todas las preguntas del curso ya están en esta evaluación.</p>
        )}

        {(availableQuestions ?? []).length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            No hay preguntas en el banco del curso.{' '}
            <Link href={`/coaches/questions/new?courseId=${courseId}`} className="text-purple-400 underline">
              Crear preguntas
            </Link>
          </p>
        )}
      </div>

      {/* Results summary */}
      <h2 className="mb-4 font-heading text-lg font-bold text-white">Resultados ({results?.length ?? 0})</h2>
      <div className="space-y-2">
        {(results ?? []).length === 0 && <p className="text-sm text-zinc-500">Sin resultados todavía.</p>}
        {(results ?? []).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                {r.enrollments?.profiles?.avatar_url ? (
                  <img src={r.enrollments.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  r.enrollments?.profiles?.full_name?.charAt(0) ?? '?'
                )}
              </div>
              <span className="text-sm text-white">{r.enrollments?.profiles?.full_name}</span>
            </div>
            <span className="text-sm font-medium text-white">{r.score}/{ev.max_score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
