import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'

export function renderStudentExamTake(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: 'OPCIÓN MÚLTIPLE',
    true_false: 'VERDADERO/FALSO',
    short_answer: 'RESPUESTA CORTA',
    open_ended: 'DESARROLLO',
  }
  return labels[type] || type || ''
}

  function renderQuestionCard(q: any, answers: Record<string, string>): string {
    const qData = q.questions || {}
    const options = qData?.question_options ?? []
    const userAnswer = answers[q.question_id] ?? ''
    if (!qData.type) return `<p class="text-red-400 text-sm">Error: pregunta sin tipo (qData: ${JSON.stringify(Object.keys(qData))})</p>`
    console.log('Question type:', qData.type, 'options:', options.length)

    let inputHtml = ''
    if (qData.type === 'multiple_choice' || qData.type === 'true_false') {
      inputHtml = `<div class="space-y-3">
        ${options.length === 0 ? '<p class="text-xs text-yellow-400">No hay opciones configuradas para esta pregunta.</p>' : ''}
        ${options.map((o: any) => {
          const selected = userAnswer === o.id
          return `<button type="button" class="option-btn w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
            selected
              ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
          }" data-option-id="${escapeHtml(o.id)}">${escapeHtml(o.text)}</button>`
        }).join('')}
      </div>`
    } else if (qData.type === 'short_answer') {
      inputHtml = `<textarea id="text-answer" rows="3"
      class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]"
      placeholder="Escribe tu respuesta...">${escapeHtml(userAnswer)}</textarea>`
  } else if (qData.type === 'open_ended') {
    inputHtml = `<textarea id="text-answer" rows="8"
      class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white outline-none focus:border-[#8B5CF6]"
      placeholder="Desarrolla tu respuesta...">${escapeHtml(userAnswer)}</textarea>`
  }

  return `
    <div class="mb-4 flex items-center gap-2">
      <span class="text-xs font-bold text-[#8B5CF6]">${escapeHtml(typeLabel(qData?.type))}</span>
      <span class="text-xs text-zinc-500">${q.points ?? qData?.points ?? 1} pts</span>
    </div>
    <p class="mb-6 text-lg font-medium text-white">${escapeHtml(qData?.stem || '')}</p>
    ${inputHtml}`
}

function renderResultsView(attempt: any, questions: any[], courseId: string, passingScore: number): void {
  const answersByQ: Record<string, any> = {}
  for (const ans of attempt.student_answers ?? []) {
    answersByQ[ans.question_id] = ans
  }

  const total = questions.length
  const graded = questions.filter((eq: any) => {
    const a = answersByQ[eq.question_id]
    return a && (a.is_correct != null)
  })
  const correct = graded.filter((eq: any) => answersByQ[eq.question_id]?.is_correct).length
  const score = attempt.score ?? (total > 0 ? (correct / total) * 100 : 0)
  const passed = score >= (passingScore ?? 60)

  const questionsHtml = questions.map((eq: any, i: number) => {
    const q = eq.questions
    const answer = answersByQ[eq.question_id]
    const options = q?.question_options ?? []
    const isAutoGraded = answer && (answer.is_correct != null)
    const isCorrect = answer?.is_correct

    let detailHtml = ''
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      detailHtml = `<div class="space-y-2 mt-4">
        ${options.map((o: any) => {
          const selected = answer?.selected_option === o.id
          const isCorrectOpt = o.is_correct
          let cls = 'border-zinc-700 bg-[#0A0A0A]'
          let extra = ''
          if (selected && isCorrectOpt) { cls = 'border-green-500 bg-green-500/10'; extra = '<span class="ml-auto text-xs text-green-400">✓</span>' }
          else if (selected && !isCorrectOpt) { cls = 'border-red-500 bg-red-500/10'; extra = '<span class="ml-auto text-xs text-red-400">✗</span>' }
          else if (isCorrectOpt) { cls = 'border-green-500/50 bg-green-500/5'; extra = '<span class="ml-auto text-xs text-green-400/60">Correcta</span>' }
          return `<div class="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${cls}">
            <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              selected ? (isCorrectOpt ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') : isCorrectOpt ? 'border-green-500' : 'border-zinc-600'
            }">
              ${selected ? '<div class="h-2 w-2 rounded-full bg-white"></div>' : ''}
            </div>
            <span class="${selected && isCorrectOpt ? 'text-green-400' : selected && !isCorrectOpt ? 'text-red-400' : isCorrectOpt ? 'text-green-400/60' : 'text-zinc-400'}">${escapeHtml(o.text)}</span>
            ${extra}
          </div>`
        }).join('')}
      </div>`
    } else {
      const hasAnswer = answer?.text_answer
      detailHtml = `<div class="mt-4">
        <p class="text-sm text-zinc-400">Tu respuesta:</p>
        <div class="mt-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-3 text-sm text-white">${escapeHtml(hasAnswer ?? '—')}</div>
        ${isAutoGraded ? `<p class="mt-2 text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}">${isCorrect ? '✓ Correcta' : '✗ Incorrecta'}</p>` : '<p class="mt-2 text-sm text-yellow-400">Esperando calificación del coach</p>'}
      </div>`
    }

    return `<div class="glass rounded-xl p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Pregunta ${i + 1}</span>
        <span class="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">${escapeHtml(typeLabel(q?.type))}</span>
        ${isAutoGraded
          ? `<span class="text-xs ${isCorrect ? 'text-green-400' : 'text-red-400'}">${isCorrect ? '✓' : '✗'}</span>`
          : '<span class="text-xs text-yellow-400">Pendiente</span>'
        }
      </div>
      <p class="text-sm text-white">${escapeHtml(q?.stem || '')}</p>
      ${detailHtml}
    </div>`
  }).join('')

  const html = `
    <div>
      <a href="#/students/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        ${Icon('arrowLeft', 16)} Volver al curso
      </a>

      <div class="glass rounded-xl p-6 text-center mb-6">
        <div class="mb-2 ${passed ? 'text-green-400' : 'text-red-400'}">
          ${passed ? Icon('checkCircle', 40) : Icon('xCircle', 40)}
        </div>
        <h2 class="text-xl font-bold text-white">${passed ? 'Aprobado' : 'No aprobado'}</h2>
        <p class="mt-2 text-3xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}">${(typeof score === 'number' ? score : 0).toFixed(1)}%</p>
        <p class="mt-1 text-sm text-zinc-500">${correct} de ${total} correctas (mínimo ${passingScore}%)</p>
      </div>

      <div class="space-y-4">
        ${questionsHtml}
      </div>
    </div>`

  document.getElementById('page-content')!.innerHTML = html
}

export async function initStudentExamTake(): Promise<void> {
  try {
    const params = router.getParams()
    const examId = params.examId
    const courseId = params.id
    if (!examId || !courseId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: exam } = await supabase
      .from('exams')
      .select('*, course_modules(name), exam_questions(*, questions(*, question_options(*)))')
      .eq('id', examId)
      .maybeSingle()

    if (!exam) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500 py-10 text-center">Examen no encontrado.</p>'
      return
    }
    console.log('Exam loaded:', exam.title, 'questions:', exam.exam_questions?.length)

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!enrollment) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-yellow-400 text-sm py-10 text-center">No estás inscrito en este curso.</p>'
      return
    }

    const questions = (exam.exam_questions ?? []).sort((a: any, b: any) => (a.order_num ?? 0) - (b.order_num ?? 0))

    // Get ALL attempts to count them
    const { data: allAttempts } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('enrollment_id', enrollment.id)
      .order('created_at', { ascending: false })

    const submittedCount = (allAttempts ?? []).filter((a: any) => a.status === 'submitted' || a.status === 'graded').length
    const maxAttempts = exam.max_attempts ?? 1

    // Check if max attempts reached
    if (submittedCount >= maxAttempts) {
      const lastAttempt = (allAttempts ?? [])[0]
      if (lastAttempt) {
        renderResultsView(lastAttempt, questions, courseId, exam.passing_score ?? 60)
      } else {
        document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500 py-10 text-center">Has alcanzado el máximo de intentos.</p>'
      }
      return
    }

    // Check for an in_progress attempt to resume
    const inProgressAttempt = (allAttempts ?? []).find((a: any) => a.status === 'in_progress')
    let attempt = inProgressAttempt || null
    let savedAnswers: Record<string, string> = {}

    if (attempt?.id) {
      const { data: attemptWithAnswers } = await supabase
        .from('exam_attempts')
        .select('*, student_answers(*)')
        .eq('id', attempt.id)
        .maybeSingle()
      if (attemptWithAnswers?.student_answers) {
        for (const ans of attemptWithAnswers.student_answers) {
          savedAnswers[ans.question_id] = ans.selected_option || ans.text_answer || ''
        }
      }
    }

    const lsKey = `exam_answers_${examId}_${enrollment.id}`
    const lsData = localStorage.getItem(lsKey)
    if (lsData) {
      try {
        const parsed = JSON.parse(lsData)
        savedAnswers = { ...savedAnswers, ...parsed }
      } catch { /* ignore */ }
    }

    if (!attempt) {
      const nextNum = submittedCount + 1
      const { data: newAttempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          enrollment_id: enrollment.id,
          attempt_num: nextNum,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle()
      if (attemptError) {
        toast('error', 'Error al crear intento: ' + attemptError.message)
        return
      }
      attempt = newAttempt
    }

    if (!attempt) {
      toast('error', 'Error al iniciar el intento')
      return
    }

    // --- State ---
    let currentIndex = 0
    let answers: Record<string, string> = { ...savedAnswers }
    let timerInterval: number | null = null
    let timeLeft: number | null = exam.time_limit ? (exam.time_limit * 60) : null
    let submitting = false

    // --- Render initial page ---
    function renderPage(): void {
      const q = questions[currentIndex]
      const html = `
        <div>
          <a href="#/students/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            ${Icon('arrowLeft', 16)} Volver al curso
          </a>

          <div class="mb-6 flex items-center justify-between">
            <div>
              <h1 class="font-heading text-xl font-bold text-white">${escapeHtml(exam.title)}</h1>
              <p class="text-sm text-zinc-500">Pregunta <span id="q-progress">${currentIndex + 1}</span> de ${questions.length}</p>
            </div>
            ${timeLeft !== null
              ? `<div id="timer-display" class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-300">
                  ${Icon('clock', 16)} <span id="timer-text">${formatTime(timeLeft)}</span>
                </div>`
              : ''
            }
          </div>

          <div id="question-dots" class="mb-4 flex gap-1">
            ${questions.map((_: any, i: number) => `
              <button type="button" class="q-dot h-2 flex-1 rounded-full transition ${i === currentIndex ? 'bg-[#8B5CF6]' : answers[questions[i]?.question_id] ? 'bg-green-500' : 'bg-zinc-700'}"
                      data-index="${i}"></button>
            `).join('')}
          </div>

          <div id="question-card" class="glass rounded-xl p-6">
            ${q ? renderQuestionCard(q, answers) : '<p class="text-zinc-500">No hay preguntas.</p>'}
          </div>

          <div id="nav-buttons" class="mt-6 flex items-center justify-between">
            <div>
              ${currentIndex > 0
                ? `<button type="button" id="prev-btn" class="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
                    ${Icon('arrowLeft', 16)} Anterior
                  </button>`
                : ''
              }
            </div>
            <div class="flex items-center gap-3">
              ${currentIndex < questions.length - 1
                ? `<button type="button" id="next-btn" class="rounded-lg bg-zinc-800 px-6 py-2 text-sm text-white transition hover:bg-zinc-700">
                    Siguiente
                  </button>`
                : ''
              }
              <button type="button" id="submit-exam-btn" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                ${Icon('checkCircle', 16)} Finalizar examen
              </button>
            </div>
          </div>
        </div>`

      document.getElementById('page-content')!.innerHTML = html
    }

    renderPage()

    // --- Timer ---
    function startTimer(): void {
      if (timeLeft === null) return
      timerInterval = window.setInterval(() => {
        if (timeLeft === null) return
        timeLeft--

        const timerText = document.getElementById('timer-text')
        const timerDisplay = document.getElementById('timer-display')
        if (timerText) timerText.textContent = formatTime(timeLeft)
        if (timerDisplay && timeLeft < 60) {
          timerDisplay.className = 'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400'
        }

        if (timeLeft <= 0) {
          if (timerInterval !== null) clearInterval(timerInterval)
          timerInterval = null
          submitExam()
        }
      }, 1000)
    }

    if (timeLeft !== null && timeLeft > 0) startTimer()

    // --- Persist to localStorage ---
    function saveToLS(): void {
      localStorage.setItem(lsKey, JSON.stringify(answers))
    }

    // --- Navigate to question ---
    function goToQuestion(index: number): void {
      currentIndex = index

      const q = questions[currentIndex]
      const card = document.getElementById('question-card')
      if (card && q) {
        card.innerHTML = renderQuestionCard(q, answers)
      }

      document.querySelectorAll('.q-dot').forEach((dot) => {
        const idx = parseInt((dot as HTMLElement).dataset.index || '0')
        const qq = questions[idx]
        ;(dot as HTMLElement).className = `q-dot h-2 flex-1 rounded-full transition ${
          idx === currentIndex ? 'bg-[#8B5CF6]' : answers[qq?.question_id] ? 'bg-green-500' : 'bg-zinc-700'
        }`
      })

      const progress = document.getElementById('q-progress')
      if (progress) progress.textContent = String(currentIndex + 1)

      // Rebuild nav buttons
      const navContainer = document.getElementById('nav-buttons')
      if (navContainer) {
        navContainer.innerHTML = `
          <div>
            ${currentIndex > 0
              ? `<button type="button" id="prev-btn" class="flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
                  ${Icon('arrowLeft', 16)} Anterior
                </button>`
              : ''
            }
          </div>
          <div class="flex items-center gap-3">
            ${currentIndex < questions.length - 1
              ? `<button type="button" id="next-btn" class="rounded-lg bg-zinc-800 px-6 py-2 text-sm text-white transition hover:bg-zinc-700">
                  Siguiente
                </button>`
              : ''
            }
            <button type="button" id="submit-exam-btn" class="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('checkCircle', 16)} Finalizar examen
            </button>
          </div>`
      }

      attachListeners()
    }

    // --- Attach event listeners ---
    function attachListeners(): void {
      // Question dots
      document.querySelectorAll('.q-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          goToQuestion(parseInt((dot as HTMLElement).dataset.index || '0'))
        })
      })

      // Prev button
      const prevBtn = document.getElementById('prev-btn')
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentIndex > 0) goToQuestion(currentIndex - 1)
        })
      }

      // Next button
      const nextBtn = document.getElementById('next-btn')
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1)
        })
      }

      // Submit button
      const submitBtn = document.getElementById('submit-exam-btn')
      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          if (await confirmDialog('¿Estás seguro de que deseas finalizar el examen? Esta acción no se puede deshacer.')) {
            submitExam()
          }
        })
      }

      // Answer handlers
      const card = document.getElementById('question-card')
      if (!card) return

      // Option buttons (multiple_choice / true_false)
      card.querySelectorAll('.option-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const optionId = (btn as HTMLElement).dataset.optionId
          if (!optionId) return
          const qq = questions[currentIndex]
          if (!qq) return
          answers[qq.question_id] = optionId
          saveToLS()

          // Update visual state
          card.querySelectorAll('.option-btn').forEach((b) => {
            const id = (b as HTMLElement).dataset.optionId
            ;(b as HTMLElement).className = `option-btn w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
              id === optionId
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-white'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
            }`
          })

          // Update dots to show answered
          document.querySelectorAll('.q-dot').forEach((dot) => {
            const idx = parseInt((dot as HTMLElement).dataset.index || '0')
            const qqq = questions[idx]
            if (idx === currentIndex) return
            ;(dot as HTMLElement).className = `q-dot h-2 flex-1 rounded-full transition ${
              answers[qqq?.question_id] ? 'bg-green-500' : 'bg-zinc-700'
            }`
          })
        })
      })

      // Text input
      const textarea = document.getElementById('text-answer') as HTMLTextAreaElement | null
      if (textarea) {
        textarea.addEventListener('input', () => {
          const qq = questions[currentIndex]
          if (!qq) return
          answers[qq.question_id] = textarea.value
          saveToLS()

          // Update dots
          document.querySelectorAll('.q-dot').forEach((dot) => {
            const idx = parseInt((dot as HTMLElement).dataset.index || '0')
            if (idx === currentIndex) return
            const qqq = questions[idx]
            ;(dot as HTMLElement).className = `q-dot h-2 flex-1 rounded-full transition ${
              answers[qqq?.question_id] ? 'bg-green-500' : 'bg-zinc-700'
            }`
          })
        })
      }
    }

    attachListeners()

    // --- Submit exam ---
    async function submitExam(): Promise<void> {
      if (submitting || !attempt?.id) return
      submitting = true

      if (timerInterval !== null) {
        clearInterval(timerInterval)
        timerInterval = null
      }

      const submitBtn = document.getElementById('submit-exam-btn')
      if (submitBtn) {
        submitBtn.innerHTML = `<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Entregando...`
        ;(submitBtn as HTMLButtonElement).disabled = true
      }

      // Build answers array
      const answerRows = questions.map((eq: any) => {
        const qq = eq.questions
        const ans = answers[eq.question_id] ?? ''

        if (qq.type === 'multiple_choice' || qq.type === 'true_false') {
          const options = qq.question_options ?? []
          const selectedOption = options.find((o: any) => o.id === ans)
          const isCorrect = selectedOption ? selectedOption.is_correct : false
          return {
            attempt_id: attempt!.id,
            question_id: eq.question_id,
            selected_option: ans || null,
            text_answer: null,
            is_correct: ans ? isCorrect : null,
            score: ans ? (isCorrect ? 100 : 0) : null,
          }
        }

        return {
          attempt_id: attempt!.id,
          question_id: eq.question_id,
          selected_option: null,
          text_answer: ans || null,
          is_correct: null,
          score: null,
        }
      })

      // Insert new answers first, then delete old ones
      const { error: insError } = await supabase.from('student_answers').insert(answerRows)
      if (insError) {
        toast('error', 'Error al guardar respuestas: ' + insError.message)
        submitting = false
        if (submitBtn) {
          submitBtn.innerHTML = `${Icon('checkCircle', 16)} Finalizar examen`
          ;(submitBtn as HTMLButtonElement).disabled = false
        }
        return
      }

      const { error: delError } = await supabase.from('student_answers').delete().eq('attempt_id', attempt!.id)
      if (delError) {
        toast('error', 'Error al limpiar respuestas anteriores: ' + delError.message)
        submitting = false
        if (submitBtn) {
          submitBtn.innerHTML = `${Icon('checkCircle', 16)} Finalizar examen`
          ;(submitBtn as HTMLButtonElement).disabled = false
        }
        return
      }

      // Calculate score
      const autoGraded = answerRows.filter((a: any) => a.is_correct != null)
      const correctCount = autoGraded.filter((a: any) => a.is_correct).length
      const score = autoGraded.length > 0 ? (correctCount / autoGraded.length) * 100 : null

      const { error: updError } = await supabase
        .from('exam_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          score,
        })
        .eq('id', attempt!.id)
      if (updError) {
        toast('error', 'Error al finalizar intento: ' + updError.message)
        submitting = false
        if (submitBtn) {
          submitBtn.innerHTML = `${Icon('checkCircle', 16)} Finalizar examen`
          ;(submitBtn as HTMLButtonElement).disabled = false
        }
        return
      }

      localStorage.removeItem(lsKey)

      // Show results
      attempt.student_answers = answerRows
      attempt.score = score
      renderResultsView(attempt, questions, courseId, exam.passing_score ?? 60)
    }
  } catch (err) {
    console.error('Error loading exam:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm py-10 text-center">Error al cargar el examen</p>'
  }
}
