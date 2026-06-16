import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

async function submitAnswers(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const evaluationId = formData.get('evaluationId') as string
  const enrollmentId = formData.get('enrollmentId') as string
  const eqIds = formData.getAll('eqId') as string[]
  const selectedOptions = formData.getAll('selectedOption') as string[]
  const textAnswers = formData.getAll('textAnswer') as string[]
  const types = formData.getAll('type') as string[]

  for (let i = 0; i < eqIds.length; i++) {
    const type = types[i]
    let payload: any = {
      evaluation_question_id: eqIds[i],
      enrollment_id: enrollmentId,
    }

    if (type === 'multiple_choice' || type === 'true_false') {
      const optionId = selectedOptions[i]
      if (!optionId) continue

      const { data: option } = await supabase
        .from('question_options')
        .select('is_correct')
        .eq('id', optionId)
        .maybeSingle()

      payload.selected_option = optionId
      payload.is_correct = option?.is_correct ?? false
      payload.score = option?.is_correct ? 100 : 0
    } else {
      const text = textAnswers[i] || ''
      payload.text_answer = text
    }

    const { error } = await supabase.from('evaluation_answers').upsert(payload, {
      onConflict: 'evaluation_question_id, enrollment_id',
    })
    if (error) console.error(error)
  }

  revalidatePath(`/students/evaluations/${evaluationId}`)
  redirect(`/students/evaluations/${evaluationId}?submitted=true`)
}

export default async function StudentEvalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ submitted?: string }>
}) {
  const { id } = await params
  const { submitted } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ev } = await supabase
    .from('evaluations')
    .select('*, course_modules(name, course_id, courses(name))')
    .eq('id', id)
    .maybeSingle()

  if (!ev) return <p className="text-zinc-400">Evaluación no encontrada.</p>

  const courseId = ev.course_modules?.course_id

  let enrollmentId: string | null = null
  if (user) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle()
    if (enrollment) enrollmentId = enrollment.id
  }

  const { data: evalQuestions } = await supabase
    .from('evaluation_questions')
    .select('*, questions(*)')
    .eq('evaluation_id', id)
    .order('order_num')

  const questionIds = (evalQuestions ?? []).map((eq) => eq.questions?.id).filter(Boolean)
  const eqIds = (evalQuestions ?? []).map((eq) => eq.id)

  const { data: allOptions } = await supabase
    .from('question_options')
    .select('*')
    .in('question_id', questionIds.length > 0 ? questionIds : ['none'])
    .order('order_num')

  const optsByQ: Record<string, typeof allOptions> = {}
  for (const o of allOptions ?? []) {
    if (!optsByQ[o.question_id]) optsByQ[o.question_id] = []
    optsByQ[o.question_id]!.push(o)
  }

  let existingAnswers: any[] = []
  if (enrollmentId) {
    const { data } = await supabase
      .from('evaluation_answers')
      .select('*')
      .in('evaluation_question_id', eqIds.length > 0 ? eqIds : ['none'])
      .eq('enrollment_id', enrollmentId)
    existingAnswers = data ?? []
  }

  const ansByEq: Record<string, any> = {}
  for (const a of existingAnswers) {
    ansByEq[a.evaluation_question_id] = a
  }

  const allGraded = existingAnswers.length > 0 && existingAnswers.every((a) => a.score != null)
  const totalScore = existingAnswers.reduce((s, a) => s + (a.score ?? 0), 0)

  return (
    <div>
      <Link href={`/students/courses/${courseId}`} className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al curso
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{ev.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {ev.course_modules?.courses?.name} / {ev.course_modules?.name}
        </p>
        <p className="text-sm text-zinc-500">Peso: {ev.weight}%</p>
        {ev.description && <p className="mt-2 text-sm text-zinc-300">{ev.description}</p>}
      </div>

      {submitted === 'true' && (
        <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          Respuestas guardadas. Espera a que el coach califique las preguntas abiertas.
        </div>
      )}

      {!enrollmentId && (
        <p className="text-sm text-yellow-400">No estás inscrito en este curso actualmente.</p>
      )}

      <form action={submitAnswers} className="space-y-6">
        <input type="hidden" name="evaluationId" value={id} />
        <input type="hidden" name="enrollmentId" value={enrollmentId ?? ''} />

        {(evalQuestions ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay preguntas disponibles todavía.</p>
        )}

        {(evalQuestions ?? []).map((eq, i) => {
          const q = eq.questions as any
          const options = optsByQ[q.id] ?? []
          const answer = ansByEq[eq.id]
          const isGraded = answer?.score != null

          return (
            <div key={eq.id} className="glass rounded-xl p-5">
              <input type="hidden" name="eqId" value={eq.id} />
              <input type="hidden" name="type" value={q.type} />

              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Pregunta {i + 1}</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">{q.type}</span>
                <span className="text-xs text-zinc-500">{q.points} pts</span>
                {isGraded && (
                  <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                    {answer.score}/{q.points}
                  </span>
                )}
              </div>

              <p className="mb-3 text-sm text-white">{q.stem}</p>

              {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                <div className="space-y-2">
                  {options.map((o) => {
                    const selected = answer?.selected_option === o.id
                    const correct = isGraded && o.is_correct
                    const wrong = isGraded && selected && !o.is_correct
                    return (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition
                          ${selected ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-[#0A0A0A] hover:border-zinc-600'}
                          ${correct ? 'border-green-500 bg-green-500/10' : ''}
                          ${wrong ? 'border-red-500 bg-red-500/10' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          name={`selectedOption-${eq.id}`}
                          value={o.id}
                          defaultChecked={selected}
                          disabled={isGraded}
                          className="sr-only"
                        />
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'} ${correct ? 'border-green-500 bg-green-500' : ''} ${wrong ? 'border-red-500 bg-red-500' : ''}`}>
                          {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <span className={correct ? 'text-green-400' : wrong ? 'text-red-400' : 'text-zinc-200'}>{o.text}</span>
                        {isGraded && o.is_correct && <span className="ml-auto text-xs text-green-400">✓ Correcta</span>}
                        {isGraded && selected && !o.is_correct && <span className="ml-auto text-xs text-red-400">✗ Incorrecta</span>}
                      </label>
                    )
                  })}
                </div>
              )}

              {(q.type === 'open_ended' || q.type === 'short_answer') && (
                <div>
                  <textarea
                    name={`textAnswer-${eq.id}`}
                    defaultValue={answer?.text_answer ?? ''}
                    readOnly={isGraded}
                    rows={q.type === 'open_ended' ? 4 : 2}
                    placeholder={isGraded ? '' : 'Escribe tu respuesta...'}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                  />
                </div>
              )}
            </div>
          )
        })}

        {enrollmentId && (evalQuestions ?? []).length > 0 && !allGraded && (
          <button
            type="submit"
            className="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
          >
            Guardar respuestas
          </button>
        )}

        {allGraded && (
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-white">Calificación final: {totalScore} pts</p>
          </div>
        )}
      </form>
    </div>
  )
}
