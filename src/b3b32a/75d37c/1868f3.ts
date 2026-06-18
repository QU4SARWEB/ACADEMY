import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { router } from '@/f3395c'

export function renderStudentEvalDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initStudentEvalDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: ev } = await supabase
      .from('evaluations')
      .select('*, course_modules(name, course_id, courses(name))')
      .eq('id', id)
      .maybeSingle()
    if (!ev) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-400">Evaluación no encontrada.</p>'
      return
    }

    const courseId = ev.course_modules?.course_id
    let enrollmentId: string | null = null
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle()
    if (enrollment) enrollmentId = enrollment.id

    const [{ data: eqData }, { data: optionsData }] = await Promise.all([
      supabase.from('evaluation_questions').select('*, questions(*)').eq('evaluation_id', id).order('order_num'),
      supabase.from('question_options').select('*').order('order_num'),
    ])

    const evalQuestions = eqData ?? []
    const qIds = evalQuestions.map((eq: any) => eq.questions?.id).filter(Boolean)
    const filteredOpts = (optionsData ?? []).filter((o: any) => qIds.includes(o.question_id))
    const optsByQ: Record<string, any[]> = {}
    for (const o of filteredOpts) {
      if (!optsByQ[o.question_id]) optsByQ[o.question_id] = []
      optsByQ[o.question_id]!.push(o)
    }

    let existingAnswers: any[] = []
    if (enrollmentId) {
      const eqIds = evalQuestions.map((eq: any) => eq.id)
      const { data: ans } = await supabase
        .from('evaluation_answers')
        .select('*')
        .in('evaluation_question_id', eqIds.length > 0 ? eqIds : ['none'])
        .eq('enrollment_id', enrollmentId)
      existingAnswers = ans ?? []
    }

    const ansByEq: Record<string, any> = {}
    for (const a of existingAnswers) {
      ansByEq[a.evaluation_question_id] = a
    }

    const allGraded = existingAnswers.length > 0 && existingAnswers.every((a: any) => a.score != null)
    const totalScore = existingAnswers.reduce((s: number, a: any) => s + (a.score ?? 0), 0)

    const questionsHtml = evalQuestions.length === 0
      ? '<p class="text-sm text-zinc-500">No hay preguntas disponibles todavía.</p>'
      : evalQuestions.map((eq: any, i: number) => {
          const q = eq.questions
          const options = optsByQ[q?.id] ?? []
          const answer = ansByEq[eq.id]
          const isGraded = answer?.score != null

          let inputHtml = ''
          if (q.type === 'multiple_choice' || q.type === 'true_false') {
            inputHtml = `<div class="space-y-2">
              ${options.map((o: any) => {
                const selected = answer?.selected_option === o.id
                const correct = isGraded && o.is_correct
                const wrong = isGraded && selected && !o.is_correct
                const labelClass = selected ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-[#0A0A0A] hover:border-zinc-600'
                const finalClass = correct ? 'border-green-500 bg-green-500/10' : wrong ? 'border-red-500 bg-red-500/10' : labelClass
                return `<label class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${finalClass}">
                  <input type="radio" name="selectedOption-${eq.id}" value="${escapeHtml(o.id)}" ${selected ? 'checked' : ''} ${isGraded ? 'disabled' : ''} class="sr-only" />
                  <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'} ${correct ? 'border-green-500 bg-green-500' : ''} ${wrong ? 'border-red-500 bg-red-500' : ''}">
                    ${selected ? '<div class="h-2 w-2 rounded-full bg-white"></div>' : ''}
                  </div>
                  <span class="${correct ? 'text-green-400' : wrong ? 'text-red-400' : 'text-zinc-200'}">${escapeHtml(o.text)}</span>
                  ${isGraded && o.is_correct ? '<span class="ml-auto text-xs text-green-400">✓ Correcta</span>' : ''}
                  ${isGraded && selected && !o.is_correct ? '<span class="ml-auto text-xs text-red-400">✗ Incorrecta</span>' : ''}
                </label>`
              }).join('')}
            </div>`
          } else if (q.type === 'open_ended' || q.type === 'short_answer') {
            inputHtml = `<textarea name="textAnswer-${eq.id}" ${isGraded ? 'readonly' : ''} rows="${q.type === 'open_ended' ? 4 : 2}" placeholder="${isGraded ? '' : 'Escribe tu respuesta...'}"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#8B5CF6] disabled:opacity-60">${escapeHtml(answer?.text_answer ?? '')}</textarea>`
          }

          return `<div class="glass rounded-xl p-5" data-eq-id="${eq.id}">
            <div class="mb-3 flex items-center gap-2">
              <span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">Pregunta ${i + 1}</span>
              <span class="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">${escapeHtml(q.type)}</span>
              <span class="text-xs text-zinc-500">${q.points} pts</span>
              ${isGraded ? `<span class="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">${answer.score}/${q.points}</span>` : ''}
            </div>
            <p class="mb-3 text-sm text-white">${escapeHtml(q.stem)}</p>
            ${inputHtml}
          </div>`
        }).join('')

    const submittedMsg = ''
    const submitButton = enrollmentId && evalQuestions.length > 0 && !allGraded
      ? `<button id="submit-eval-btn" class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          Guardar respuestas
        </button>`
      : ''

    const scoreDisplay = allGraded
      ? `<div class="glass rounded-xl p-4 text-center">
          <p class="text-lg font-bold text-white">Calificación final: ${totalScore} pts</p>
        </div>`
      : ''

    const html = `
      <div>
        <a href="#/students/courses/${escapeHtml(courseId)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>

        <div class="mb-6">
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(ev.title)}</h1>
          <p class="mt-1 text-sm text-zinc-400">
            ${escapeHtml(ev.course_modules?.courses?.name || '')} / ${escapeHtml(ev.course_modules?.name || '')}
          </p>
          <p class="text-sm text-zinc-500">Peso: ${ev.weight}%</p>
          ${ev.description ? `<p class="mt-2 text-sm text-zinc-300">${escapeHtml(ev.description)}</p>` : ''}
        </div>

        <div id="eval-submitted-msg" class="${submittedMsg ? '' : 'hidden'}"></div>

        ${!enrollmentId ? '<p class="mb-4 text-sm text-yellow-400">No estás inscrito en este curso actualmente.</p>' : ''}

        <form id="eval-form" class="space-y-6">
          ${questionsHtml}
          ${submitButton}
          ${scoreDisplay}
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    const submitBtn = document.getElementById('submit-eval-btn')
    if (submitBtn && enrollmentId) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        const answers: any[] = []
        for (const eq of evalQuestions) {
          const eqDiv = document.querySelector(`[data-eq-id="${eq.id}"]`)
          if (!eqDiv) continue
          const selectedRadio = eqDiv.querySelector(`input[name="selectedOption-${eq.id}"]:checked`) as HTMLInputElement
          const textarea = eqDiv.querySelector(`textarea[name="textAnswer-${eq.id}"]`) as HTMLTextAreaElement
          const answer: any = {
            evaluation_question_id: eq.id,
            enrollment_id: enrollmentId,
          }
          if (selectedRadio) {
            answer.selected_option = selectedRadio.value
          } else if (textarea) {
            answer.text_answer = textarea.value
          }
          if (answer.selected_option || answer.text_answer) {
            answers.push(answer)
          }
        }
        if (answers.length === 0) {
          toast('warning', 'No hay respuestas para guardar.')
          return
        }
        const { error } = await supabase.from('evaluation_answers').insert(answers)
        if (error) {
          toast('error', 'Error al guardar respuestas: ' + error.message)
        } else {
          const msgEl = document.getElementById('eval-submitted-msg')
          if (msgEl) {
            msgEl.innerHTML = '<div class="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">Respuestas guardadas. Espera a que el coach califique las preguntas abiertas.</div>'
            msgEl.classList.remove('hidden')
          }
          submitBtn.remove()
        }
      })
    }
  } catch (err) {
    console.error('Error loading evaluation:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar evaluación</p>'
  }
}
