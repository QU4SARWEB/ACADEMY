import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderStudentExamList(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentExamList(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, courses(name)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id).filter(Boolean))]

    if (courseIds.length === 0) {
      document.getElementById('page-content')!.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p></div>'
      return
    }

    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .in('course_id', courseIds)
      .eq('published', true)
      .not('title', 'ilike', '%practico%')
      .order('created_at', { ascending: true })

    if (!exams || exams.length === 0) {
      document.getElementById('page-content')!.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay exámenes disponibles.</p></div>'
      return
    }

    const examIds = exams.map((e: any) => e.id)

    const { data: results } = await supabase
      .from('exam_results')
      .select('*')
      .in('exam_id', examIds)
      .eq('student_id', session.user.id)

    const resultMap = new Map<string, any>()
    for (const r of results ?? []) resultMap.set(r.exam_id, r)

    const courseMap = new Map<string, string>()
    for (const e of enrollments ?? []) {
      courseMap.set(e.course_id, (e as any).courses?.name || 'Curso')
    }

    function statusBadge(s: string): string {
      const m: Record<string, string> = {
        pending: 'bg-blue-500/20 text-blue-400',
        in_progress: 'bg-yellow-500/20 text-yellow-400',
        review: 'bg-orange-500/20 text-orange-400',
        graded: 'bg-green-500/20 text-green-400',
      }
      const l: Record<string, string> = {
        pending: 'Pendiente',
        in_progress: 'En progreso',
        review: 'En revisión',
        graded: 'Calificado',
      }
      return `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${m[s] || 'bg-zinc-800 text-zinc-400'}">${l[s] || escapeHtml(s)}</span>`
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('fileText', 22)} Exámenes</h1>
        <p class="mt-1 text-sm text-zinc-500">Exámenes disponibles</p>
      </div>
      <div class="space-y-4">
        ${exams.map((exam: any) => {
          const result = resultMap.get(exam.id)
          const status = result?.status || 'pending'
          const isGraded = status === 'graded'
          let btnLabel: string
          let btnIcon: string
          if (status === 'pending') { btnLabel = 'Comenzar'; btnIcon = 'play' }
          else if (status === 'in_progress') { btnLabel = 'Continuar'; btnIcon = 'arrowRight' }
          else { btnLabel = 'Ver resultado'; btnIcon = 'eye' }
          const courseName = courseMap.get(exam.course_id) || 'Curso'
          const weekLabel = exam.month ? `Sem ${exam.month}` : ''
          const isFinal = exam.eval_type === 'final'
          return `
            <div class="glass rounded-xl p-5 flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-heading text-base font-bold text-white">${escapeHtml(exam.title)}</h3>
                  ${isFinal ? `<span class="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 font-medium">Final</span>` : ''}
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${escapeHtml(courseName)}</span>
                  ${weekLabel ? `<span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${escapeHtml(weekLabel)}</span>` : ''}
                  ${statusBadge(status)}
                </div>
                ${isGraded ? `<p class="mt-2 text-sm font-bold text-green-400">${result.total_score}/20</p>` : ''}
              </div>
              <a href="#/students/exams/${escapeHtml(exam.id)}" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] shrink-0">
                ${Icon(btnIcon, 14)} ${btnLabel}
              </a>
            </div>`
        }).join('')}
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}

export function renderStudentExamDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentExamDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const examId = params.id
    if (!examId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const uid = session.user.id
    const container = document.getElementById('page-content')!
    container.innerHTML = Spinner()

    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examErr || !exam) {
      container.innerHTML = '<p class="text-red-400 text-sm">Examen no encontrado.</p>'
      return
    }

    const { data: eqs } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true })

    const questions = (eqs ?? []).map((eq: any) => {
      const q = eq.questions || {}
      return { ...q, examQuestionId: eq.id }
    })

    const { data: existingResult } = await supabase
      .from('exam_results')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', uid)
      .maybeSingle()

    let result = existingResult

    if (result && (result.status === 'review' || result.status === 'graded')) {
      const { data: ans } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('exam_result_id', result.id)
      renderReadOnlyExam(container, exam, questions, result, ans ?? [])
      return
    }

    if (!result || result.status === 'pending') {
      const maxScore = (exam as any).max_score || questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0)
      const { data: newResult, error: createErr } = await supabase
        .from('exam_results')
        .insert({
          exam_id: examId,
          student_id: uid,
          status: 'in_progress',
          total_score: 0,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (createErr) {
        container.innerHTML = '<p class="text-red-400 text-sm">Error al iniciar el examen.</p>'
        return
      }
      result = newResult
    }

    renderInteractiveExam(container, exam, questions, result, uid)
  } catch (err) {
    console.error('Error loading exam detail:', err)
    const container = document.getElementById('page-content')
    if (container) container.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el examen</p>'
  }
}

function renderReadOnlyExam(
  container: HTMLElement,
  exam: any,
  questions: any[],
  result: any,
  answers: any[]
): void {
  const answerMap = new Map<string, any>()
  for (const a of answers) answerMap.set(a.question_id, a)

  const isGraded = result.status === 'graded'

  const statusLabels: Record<string, string> = {
    review: 'En revisión',
    graded: 'Calificado',
  }

  const questionHtml = questions.map((q: any, i: number) => {
    const ans = answerMap.get(q.id)
    const userAnswer = ans?.answer || ''
    let answerHtml = ''

    if (q.type === 'multiple' || q.type === 'boolean' || q.type === 'true_false') {
      let opts: string[] = []
      if (q.type === 'multiple') {
        opts = parseOptions((q as any).options)
      } else {
        opts = ['Verdadero', 'Falso']
      }
      const correctAnswer = (q as any).correct_answer || ''
      answerHtml = opts.map((opt: string) => {
        const isSelected = userAnswer === opt
        const isRight = correctAnswer === opt
        let cls = 'border-zinc-700 text-zinc-400'
        let extra = ''
        if (isGraded) {
          if (isRight) {
            cls = 'border-green-500/50 text-green-400 bg-green-500/10'
            extra = Icon('checkCircle', 14)
          } else if (isSelected && !isRight) {
            cls = 'border-red-500/50 text-red-400 bg-red-500/10'
            extra = Icon('xCircle', 14)
          }
        } else if (isSelected) {
          cls = 'border-[#8B5CF6]/50 text-white bg-[#8B5CF6]/10'
        }
        return `<div class="flex items-center gap-2 rounded-lg border ${cls} px-3 py-2 text-sm"><span>${escapeHtml(opt)}</span>${extra ? `<span class="ml-auto">${extra}</span>` : ''}</div>`
      }).join('')
    } else if (q.type === 'detail') {
      if (userAnswer) {
        const scoreDisplay = isGraded && ans?.score != null
          ? `<span class="text-sm font-bold ${ans.score > 0 ? 'text-green-400' : 'text-red-400'}">${ans.score}/${q.points || '?'}</span>`
          : '<span class="text-xs text-zinc-600">Por calificar</span>'
        answerHtml = `<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">${escapeHtml(userAnswer)}</div><div class="mt-1">${scoreDisplay}</div>`
      } else {
        answerHtml = '<p class="text-xs text-zinc-600">Sin respuesta</p>'
      }
    }

    return `<div class="glass rounded-xl p-5"><div class="flex items-start gap-2 mb-3"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${i + 1}</span><div class="min-w-0 flex-1"><p class="text-sm font-medium text-white">${escapeHtml(q.text)}</p>${q.explanation ? `<p class="mt-1 text-xs text-zinc-600">${escapeHtml(q.explanation)}</p>` : ''}</div></div><div class="space-y-2">${answerHtml}</div></div>`
  }).join('')

  let totalScoreHtml = ''
  if (isGraded && result.total_score != null) {
    const score = result.total_score
    const color = score >= 14 ? 'text-green-400' : score >= 11 ? 'text-yellow-400' : 'text-red-400'
    totalScoreHtml = `<div class="glass rounded-xl p-5 text-center"><p class="text-sm text-zinc-500">Calificación total</p><p class="text-3xl font-bold ${color}">${score}/20</p><p class="text-xs text-zinc-600 mt-1">${Math.round(score / 20 * 100)}%</p></div>`
  }

  container.innerHTML = `
    <div>
      <div class="mb-6">
        <a href="#/students/exams" class="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition mb-2">${Icon('arrowLeft', 14)} Volver a exámenes</a>
        <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(exam.title)}</h1>
        <p class="mt-1 text-sm text-zinc-500">${statusLabels[result.status] || result.status}${isGraded && result.total_score != null ? ` · ${result.total_score}/20 pts` : ''}</p>
      </div>
      ${totalScoreHtml}
      <div class="space-y-4 mt-6">${questionHtml}</div>
      <div class="mt-6">
        <a href="#/students/exams" class="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:text-white transition">${Icon('arrowLeft', 14)} Volver a exámenes</a>
      </div>
    </div>`
}

function renderInteractiveExam(
  container: HTMLElement,
  exam: any,
  questions: any[],
  result: any,
  userId: string
): void {
  const localAnswers = new Map<string, string>()
  let currentIndex = 0

  container.innerHTML = `
    <div>
      <div class="mb-6">
        <a href="#/students/exams" class="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition mb-2">${Icon('arrowLeft', 14)} Volver a exámenes</a>
        <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(exam.title)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Responde todas las preguntas</p>
      </div>
      <div class="mb-6">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-zinc-500" id="progress-text">Pregunta 1 de ${questions.length}</span>
        </div>
        <div class="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div id="progress-bar" class="h-full rounded-full bg-[#8B5CF6] transition-all duration-300" style="width:${questions.length > 0 ? (1 / questions.length) * 100 : 0}%"></div>
        </div>
      </div>
      <div id="exam-question-area"></div>
      <div id="exam-nav-area" class="mt-4"></div>
    </div>`

  function renderQuestion(): void {
    const q = questions[currentIndex]
    if (!q) return

    const total = questions.length
    const pct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0
    const progressBar = document.getElementById('progress-bar')
    const progressText = document.getElementById('progress-text')
    if (progressBar) progressBar.style.width = `${pct}%`
    if (progressText) progressText.textContent = `Pregunta ${currentIndex + 1} de ${total}`

    let optionsHtml = ''
    if (q.type === 'multiple') {
      const opts = parseOptions((q as any).options)
      const selected = localAnswers.get(q.id) || ''
      optionsHtml = opts.map((opt: string) =>
        `<label class="flex items-center gap-3 rounded-lg border ${selected === opt ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10' : 'border-zinc-700'} px-4 py-3 cursor-pointer transition hover:border-zinc-500">
          <input type="radio" name="q-${q.id}" value="${escapeHtml(opt)}" ${selected === opt ? 'checked' : ''} class="text-[#8B5CF6] focus:ring-[#8B5CF6]">
          <span class="text-sm text-zinc-300">${escapeHtml(opt)}</span>
        </label>`
      ).join('')
    } else if (q.type === 'boolean' || q.type === 'true_false') {
      const selected = localAnswers.get(q.id) || ''
      const opts = ['Verdadero', 'Falso']
      optionsHtml = opts.map((opt: string) =>
        `<label class="flex items-center gap-3 rounded-lg border ${selected === opt ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10' : 'border-zinc-700'} px-4 py-3 cursor-pointer transition hover:border-zinc-500">
          <input type="radio" name="q-${q.id}" value="${escapeHtml(opt)}" ${selected === opt ? 'checked' : ''} class="text-[#8B5CF6] focus:ring-[#8B5CF6]">
          <span class="text-sm text-zinc-300">${escapeHtml(opt)}</span>
        </label>`
      ).join('')
    } else if (q.type === 'detail') {
      const val = localAnswers.get(q.id) || ''
      optionsHtml = `<textarea id="ta-${q.id}" rows="5" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] resize-y">${escapeHtml(val)}</textarea>`
    }

    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < total - 1

    const questionArea = document.getElementById('exam-question-area')
    const navArea = document.getElementById('exam-nav-area')
    if (!questionArea || !navArea) return

    questionArea.innerHTML = `
      <div class="glass rounded-xl p-5">
        <div class="flex items-start gap-3 mb-4">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${currentIndex + 1}</span>
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="text-sm font-medium text-white">${escapeHtml(q.text)}</p>
            ${(q as any).points ? `<p class="text-xs text-zinc-600 mt-0.5">${(q as any).points} pts</p>` : ''}
          </div>
        </div>
        <div class="space-y-2">${optionsHtml}</div>
      </div>`

    navArea.innerHTML = `
      <div class="flex items-center justify-between">
        <div>${hasPrev ? `<button id="prev-btn" class="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:text-white transition">${Icon('arrowLeft', 14)} Anterior</button>` : '<div></div>'}</div>
        <span class="text-xs text-zinc-500">${currentIndex + 1} de ${total}</span>
        <div>${hasNext
          ? `<button id="next-btn" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Siguiente ${Icon('arrowRight', 14)}</button>`
          : `<button id="submit-exam-btn" class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500">${Icon('checkCircle', 14)} Finalizar examen</button>`}</div>
      </div>`

    questionArea.querySelectorAll<HTMLInputElement>(`input[name="q-${q.id}"]`).forEach(input => {
      input.addEventListener('change', () => { localAnswers.set(q.id, input.value) })
    })

    const textarea = questionArea.querySelector<HTMLTextAreaElement>(`#ta-${q.id}`)
    if (textarea) {
      textarea.addEventListener('input', () => { localAnswers.set(q.id, textarea.value) })
    }

    document.getElementById('prev-btn')?.addEventListener('click', () => { currentIndex--; renderQuestion() })
    document.getElementById('next-btn')?.addEventListener('click', () => { currentIndex++; renderQuestion() })
    document.getElementById('submit-exam-btn')?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas finalizar el examen?')) {
        submitExam(exam, questions, result, localAnswers, userId, container)
      }
    })
  }

  renderQuestion()
}

async function submitExam(
  exam: any,
  questions: any[],
  result: any,
  answers: Map<string, string>,
  userId: string,
  container: HTMLElement
): Promise<void> {
  const submitBtn = document.getElementById('submit-exam-btn') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Enviando...'
  }

  try {
    const maxScore = (exam as any).max_score || questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0)
    let totalScore = 0
    let hasDetail = false
    const answersToInsert: any[] = []

    for (const q of questions) {
      const userAnswer = answers.get(q.id) || ''
      const points = (q as any).points || 0

      if (q.type === 'multiple' || q.type === 'boolean' || q.type === 'true_false') {
        const correctAnswer = (q as any).correct_answer
        let isCorrect = false
        if (q.type === 'boolean' || q.type === 'true_false') {
          const boolMap: Record<string, string> = { Verdadero: 'true', Falso: 'false' }
          isCorrect = (boolMap[userAnswer] || userAnswer) === correctAnswer
        } else {
          isCorrect = userAnswer === correctAnswer
        }
        const score = isCorrect ? points : 0
        if (isCorrect) totalScore += points
        answersToInsert.push({
          exam_result_id: result.id,
          question_id: q.id,
          answer: userAnswer || null,
          is_correct: isCorrect,
          score: score,
          graded: true,
        })
      } else if (q.type === 'detail') {
        hasDetail = true
        answersToInsert.push({
          exam_result_id: result.id,
          question_id: q.id,
          answer: userAnswer || null,
          is_correct: null,
          score: 0,
          graded: false,
        })
      }
    }

    if (answersToInsert.length > 0) {
      const { error: ansErr } = await supabase.from('exam_answers').insert(answersToInsert)
      if (ansErr) throw ansErr
    }

    const finalStatus = hasDetail ? 'review' : 'graded'
    const { error: updateErr } = await supabase
      .from('exam_results')
      .update({
        status: finalStatus,
        total_score: totalScore,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', result.id)

    if (updateErr) throw updateErr

    toast('success', hasDetail
      ? 'Examen enviado correctamente. Algunas preguntas serán calificadas por un coach.'
      : 'Examen calificado. Revisa tu resultado.')

    location.hash = `#/students/exams/${(exam as any).id}`
    location.reload()
  } catch (err: any) {
    console.error('Error submitting exam:', err)
    toast('error', err?.message || 'Error al enviar el examen')
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.innerHTML = `${Icon('checkCircle', 14)} Finalizar examen`
    }
  }
}

function parseOptions(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return raw.split(',').map((s: string) => s.trim()) }
  }
  return []
}
