'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, use } from 'react'
import { submitAnswers } from './actions'
import { useSearchParams } from 'next/navigation'

export default function StudentEvalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const submitted = searchParams.get('submitted')
  const [ev, setEv] = useState<any>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [evalQuestions, setEvalQuestions] = useState<any[]>([])
  const [optsByQ, setOptsByQ] = useState<Record<string, any[]>>({})
  const [existingAnswers, setExistingAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: e } = await supabase
        .from('evaluations')
        .select('*, course_modules(name, course_id, courses(name))')
        .eq('id', id)
        .maybeSingle()
      if (!e) { setLoading(false); return }
      setEv(e)

      const courseId = e.course_modules?.course_id

      const { data: { user } } = await supabase.auth.getUser()
      let enrId: string | null = null
      if (user) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('profile_id', user.id)
          .eq('course_id', courseId)
          .eq('status', 'active')
          .maybeSingle()
        if (enrollment) enrId = enrollment.id
      }
      setEnrollmentId(enrId)

      const [{ data: eqData }, { data: optionsData }] = await Promise.all([
        supabase.from('evaluation_questions').select('*, questions(*)').eq('evaluation_id', id).order('order_num'),
        supabase.from('question_options').select('*').order('order_num'),
      ])

      const eqs = eqData ?? []
      setEvalQuestions(eqs)

      const qIds = eqs.map(eq => eq.questions?.id).filter(Boolean)
      const filteredOpts = (optionsData ?? []).filter(o => qIds.includes(o.question_id))
      const optsMap: Record<string, any[]> = {}
      for (const o of filteredOpts) {
        if (!optsMap[o.question_id]) optsMap[o.question_id] = []
        optsMap[o.question_id]!.push(o)
      }
      setOptsByQ(optsMap)

      if (enrId) {
        const eqIds = eqs.map(eq => eq.id)
        const { data: ans } = await supabase
          .from('evaluation_answers')
          .select('*')
          .in('evaluation_question_id', eqIds.length > 0 ? eqIds : ['none'])
          .eq('enrollment_id', enrId)
        setExistingAnswers(ans ?? [])
      }

      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-800/60" />)}</div>
      </div>
    )
  }

  if (!ev) return <p className="text-zinc-400">Evaluación no encontrada.</p>

  const ansByEq: Record<string, any> = {}
  for (const a of existingAnswers) {
    ansByEq[a.evaluation_question_id] = a
  }

  const allGraded = existingAnswers.length > 0 && existingAnswers.every((a) => a.score != null)
  const totalScore = existingAnswers.reduce((s, a) => s + (a.score ?? 0), 0)
  const courseId = ev.course_modules?.course_id

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

        {evalQuestions.length === 0 && (
          <p className="text-sm text-zinc-500">No hay preguntas disponibles todavía.</p>
        )}

        {evalQuestions.map((eq, i) => {
          const q = eq.questions
          const options = optsByQ[q?.id] ?? []
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
                      <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${selected ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-[#0A0A0A] hover:border-zinc-600'} ${correct ? 'border-green-500 bg-green-500/10' : ''} ${wrong ? 'border-red-500 bg-red-500/10' : ''}`}>
                        <input type="radio" name={`selectedOption-${eq.id}`} value={o.id} defaultChecked={selected} disabled={isGraded} className="sr-only" />
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
                  <textarea name={`textAnswer-${eq.id}`} defaultValue={answer?.text_answer ?? ''} readOnly={isGraded}
                    rows={q.type === 'open_ended' ? 4 : 2} placeholder={isGraded ? '' : 'Escribe tu respuesta...'}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                  />
                </div>
              )}
            </div>
          )
        })}

        {enrollmentId && evalQuestions.length > 0 && !allGraded && (
          <button type="submit" className="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
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
