'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { fetchExam, startStudentExam, submitStudentExam } from '@/features/exams/actions'
import { createClient } from '@/lib/supabase/client'

export default function TakeExamPage({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const router = useRouter()
  const [exam, setExam] = useState<any>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [paramsReady, setParamsReady] = useState(false)

  useEffect(() => {
    params.then((p) => {
      const { id, examId } = p
      setParamsReady(true)

      async function init() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: enr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', id)
          .eq('profile_id', user.id)
          .maybeSingle()

        if (enr) setEnrollmentId(enr.id)

        const examData = await fetchExam(examId)
        setExam(examData)

        if (enr && examData) {
          const result = await startStudentExam(examId, enr.id)
          if (result.success) {
            setAttempt(result.attempt)
            if (examData.time_limit) {
              setTimeLeft(examData.time_limit * 60)
            }
          }
        }
        setLoading(false)
      }
      init()
    })
  }, [])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, submitted])

  const questions = exam?.exam_questions?.sort((a: any, b: any) => a.order_num - b.order_num) ?? []
  const currentQuestion = questions[currentQ]

  function handleSelect(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  function handleTextAnswer(questionId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }

  async function handleSubmit() {
    if (submitting || submitted || !attempt) return
    setSubmitting(true)

    const formData = new FormData()
    formData.set('attemptId', attempt.id)

    for (const eq of questions) {
      formData.append('questionId', eq.question_id)
      formData.append('questionType', eq.questions?.type ?? '')
      const answer = answers[eq.question_id]
      if (eq.questions?.type === 'multiple_choice' || eq.questions?.type === 'true_false') {
        formData.append('selectedOption', answer ?? '')
        formData.append('textAnswer', '')
      } else {
        formData.append('selectedOption', '')
        formData.append('textAnswer', answer ?? '')
      }
    }

    const result = await submitStudentExam({ error: '' }, formData)
    setSubmitted(true)
    setResult(result)
    setSubmitting(false)
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={24} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="glass rounded-xl p-8 text-center">
          {result?.success ? (
            <>
              <CheckCircle size={48} className="mx-auto text-green-400" />
              <h2 className="mt-4 text-xl font-bold text-white">Examen entregado</h2>
              {result.score !== null && result.score !== undefined ? (
                <p className="mt-2 text-lg text-zinc-300">
                  Puntaje: <span className="font-bold text-[#8B5CF6]">{result.score.toFixed(1)}%</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">Tus respuestas están siendo revisadas.</p>
              )}
              <button
                onClick={() => router.push(`/students/courses/${params.then(p => p.id)}`)}
                className="mt-6 rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
              >
                Volver al curso
              </button>
            </>
          ) : (
            <>
              <AlertCircle size={48} className="mx-auto text-red-400" />
              <h2 className="mt-4 text-xl font-bold text-white">Error al entregar</h2>
              <p className="mt-2 text-sm text-zinc-400">{result?.error ?? 'Intenta de nuevo.'}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!exam) {
    return <p className="text-sm text-zinc-500 py-10 text-center">Examen no encontrado.</p>
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-white">{exam.title}</h1>
          <p className="text-sm text-zinc-500">Pregunta {currentQ + 1} de {questions.length}</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${timeLeft < 60 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-300'}`}>
            <Clock size={16} />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-1">
        {questions.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`h-2 flex-1 rounded-full transition ${
              i === currentQ ? 'bg-[#8B5CF6]' : answers[questions[i]?.question_id] ? 'bg-green-500' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>

      {currentQuestion && (
        <div className="glass rounded-xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-[#8B5CF6]">
              {currentQuestion.questions?.type === 'multiple_choice' ? 'OPCIÓN MÚLTIPLE' :
               currentQuestion.questions?.type === 'true_false' ? 'VERDADERO/FALSO' :
               currentQuestion.questions?.type === 'short_answer' ? 'RESPUESTA CORTA' : 'DESARROLLO'}
            </span>
            <span className="text-xs text-zinc-500">{currentQuestion.points ?? currentQuestion.questions?.points} pts</span>
          </div>

          <p className="mb-6 text-lg font-medium text-white">{currentQuestion.questions?.stem}</p>

          {(currentQuestion.questions?.type === 'multiple_choice' || currentQuestion.questions?.type === 'true_false') && (
            <div className="space-y-3">
              {(currentQuestion.questions?.question_options ?? []).map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(currentQuestion.question_id, opt.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    answers[currentQuestion.question_id] === opt.id
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {(currentQuestion.questions?.type === 'short_answer' || currentQuestion.questions?.type === 'open_ended') && (
            <textarea
              value={answers[currentQuestion.question_id] ?? ''}
              onChange={(e) => handleTextAnswer(currentQuestion.question_id, e.target.value)}
              rows={currentQuestion.questions?.type === 'open_ended' ? 8 : 3}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]"
              placeholder={currentQuestion.questions?.type === 'open_ended' ? 'Desarrolla tu respuesta...' : 'Escribe tu respuesta...'}
            />
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div>
          {currentQ > 0 && (
            <button
              onClick={() => setCurrentQ((p) => p - 1)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentQ < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQ((p) => p + 1)}
              className="rounded-lg bg-zinc-800 px-6 py-2 text-sm text-white transition hover:bg-zinc-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : null}
              Entregar examen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
