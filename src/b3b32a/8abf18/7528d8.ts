import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

type Question = {
  type: string
  stem: string
  points: number
  difficulty: string
  explanation: string
  options: { text: string; is_correct: boolean }[]
}

export function renderCoachNewEvaluation(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewEvaluation(): Promise<void> {
  try {
    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, name, course_id, courses(name)')
      .order('course_id')

    const questions: Question[] = []

    function renderQuestions(): string {
      return questions.map((q, i) => {
        const optsHtml = q.type === 'true_false'
          ? `<div class="mt-2 space-y-1">
              <label class="flex items-center gap-2 text-xs text-zinc-300">
                <input type="radio" name="q${i}_correct" value="0" ${q.options[0]?.is_correct ? 'checked' : ''} class="text-[#8B5CF6]" />
                Verdadero
              </label>
              <label class="flex items-center gap-2 text-xs text-zinc-300">
                <input type="radio" name="q${i}_correct" value="1" ${q.options[1]?.is_correct ? 'checked' : ''} class="text-[#8B5CF6]" />
                Falso
              </label>
            </div>`
          : q.type === 'multiple_choice'
          ? `<div class="mt-2 space-y-1">
              ${q.options.map((o, oi) => `
                <div class="flex items-center gap-2">
                  <input type="checkbox" data-qidx="${i}" data-oidx="${oi}" ${o.is_correct ? 'checked' : ''} class="option-correct-check text-[#8B5CF6]" />
                  <input type="text" value="${escapeHtml(o.text)}" data-qidx="${i}" data-oidx="${oi}" placeholder="Opción ${oi + 1}"
                    class="option-text-input flex-1 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" />
                </div>
              `).join('')}
              <button type="button" class="btn-add-mc-option text-xs text-[#8B5CF6] hover:text-[#7C3AED]" data-qidx="${i}">+ Añadir opción</button>
            </div>`
          : ''
        return `
          <div class="question-block rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-qidx="${i}">
            <div class="flex items-start justify-between">
              <div class="flex-1 space-y-2">
                <div class="flex items-center gap-2">
                  <input type="text" value="${escapeHtml(q.stem)}" placeholder="Enunciado de la pregunta"
                    class="q-stem-input flex-1 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" data-qidx="${i}" />
                  <select class="q-type-select rounded border border-zinc-700 bg-[#0A0A0A] px-1 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" data-qidx="${i}">
                    <option value="multiple_choice" ${q.type === 'multiple_choice' ? 'selected' : ''}>Opción múltiple</option>
                    <option value="true_false" ${q.type === 'true_false' ? 'selected' : ''}>Verdadero/Falso</option>
                    <option value="open_ended" ${q.type === 'open_ended' ? 'selected' : ''}>Respuesta abierta</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <input type="number" value="${q.points}" placeholder="Pts" min="0"
                    class="q-points-input w-16 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" data-qidx="${i}" />
                  <select class="q-difficulty-select rounded border border-zinc-700 bg-[#0A0A0A] px-1 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" data-qidx="${i}">
                    <option value="easy" ${q.difficulty === 'easy' ? 'selected' : ''}>Fácil</option>
                    <option value="medium" ${q.difficulty === 'medium' ? 'selected' : ''}>Medio</option>
                    <option value="hard" ${q.difficulty === 'hard' ? 'selected' : ''}>Difícil</option>
                  </select>
                  <input type="text" value="${escapeHtml(q.explanation)}" placeholder="Explicación (opcional)"
                    class="q-explanation-input flex-1 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-xs text-white outline-none focus:border-[#8B5CF6]" data-qidx="${i}" />
                </div>
                ${optsHtml}
              </div>
              <button type="button" class="btn-remove-question ml-2 text-red-400 hover:text-red-300" data-qidx="${i}">${Icon('x', 16)}</button>
            </div>
          </div>`
      }).join('')
    }

    const html = `
      <div class="max-w-3xl">
        <a href="#/coaches/evaluations" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a evaluaciones
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nueva evaluación</h1>

        <form id="eval-full-form" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Título</label>
              <input type="text" name="title" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Módulo</label>
              <select name="moduleId" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Seleccionar...</option>
                ${(modules ?? []).map((m: any) =>
                  `<option value="${escapeHtml(m.id)}">${escapeHtml(m.courses?.name || '')} / ${escapeHtml(m.name)}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Puntaje máximo</label>
              <input type="number" name="maxScore" value="100" min="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Peso (%)</label>
              <input type="number" name="weight" value="100" min="0" max="100"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Fecha límite</label>
              <input type="date" name="dueDate"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Descripción</label>
            <textarea name="description" rows="2"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"></textarea>
          </div>

          <div>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="font-medium text-white">Preguntas</h2>
              <button type="button" id="btn-add-question"
                class="flex items-center gap-1 text-xs text-[#8B5CF6] hover:text-[#7C3AED]">
                ${Icon('plus', 14)} Agregar pregunta
              </button>
            </div>
            <div id="questions-list" class="space-y-3">
              ${renderQuestions()}
            </div>
            <p class="text-xs text-zinc-500 mt-2" id="questions-empty-msg">${questions.length === 0 ? 'No hay preguntas agregadas.' : ''}</p>
          </div>

          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear evaluación
            </button>
            <a href="#/coaches/evaluations"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    function syncQuestionsFromDOM() {
      const blocks = document.querySelectorAll('.question-block')
      blocks.forEach((block, i) => {
        const stem = (block.querySelector('.q-stem-input') as HTMLInputElement)?.value || ''
        const type = (block.querySelector('.q-type-select') as HTMLSelectElement)?.value || 'multiple_choice'
        const points = parseFloat((block.querySelector('.q-points-input') as HTMLInputElement)?.value) || 10
        const difficulty = (block.querySelector('.q-difficulty-select') as HTMLSelectElement)?.value || 'medium'
        const explanation = (block.querySelector('.q-explanation-input') as HTMLInputElement)?.value || ''
        if (!questions[i]) {
          questions[i] = { type, stem, points, difficulty, explanation, options: [] }
        } else {
          questions[i].stem = stem
          questions[i].type = type
          questions[i].points = points
          questions[i].difficulty = difficulty
          questions[i].explanation = explanation
        }
        if (type === 'multiple_choice') {
          const opts: { text: string; is_correct: boolean }[] = []
          block.querySelectorAll('.option-text-input').forEach((inp) => {
            const text = (inp as HTMLInputElement).value
            const oi = parseInt((inp as HTMLElement).dataset.oidx!)
            opts[oi] = { text, is_correct: opts[oi]?.is_correct || false }
          })
          block.querySelectorAll('.option-correct-check').forEach((chk) => {
            const oi = parseInt((chk as HTMLElement).dataset.oidx!)
            if (opts[oi]) opts[oi].is_correct = (chk as HTMLInputElement).checked
          })
          questions[i].options = opts.filter(Boolean)
        } else if (type === 'true_false') {
          const selected = block.querySelector(`input[name="q${i}_correct"]:checked`) as HTMLInputElement
          const correctIdx = selected ? parseInt(selected.value) : 0
          questions[i].options = [
            { text: 'Verdadero', is_correct: correctIdx === 0 },
            { text: 'Falso', is_correct: correctIdx === 1 },
          ]
        } else {
          questions[i].options = []
        }
      })
    }

    function refreshQuestions() {
      syncQuestionsFromDOM()
      const list = document.getElementById('questions-list')!
      list.innerHTML = renderQuestions()
      document.getElementById('questions-empty-msg')!.textContent = questions.length === 0 ? 'No hay preguntas agregadas.' : ''
      bindQuestionEvents()
    }

    function bindQuestionEvents() {
      document.querySelectorAll('.btn-remove-question').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.qidx!)
          questions.splice(idx, 1)
          refreshQuestions()
        })
      })

      document.querySelectorAll('.q-type-select').forEach((sel) => {
        sel.addEventListener('change', () => {
          const idx = parseInt((sel as HTMLElement).dataset.qidx!)
          const newType = (sel as HTMLSelectElement).value
          questions[idx].type = newType
          if (newType === 'true_false') {
            questions[idx].options = [{ text: 'Verdadero', is_correct: true }, { text: 'Falso', is_correct: false }]
          } else if (newType === 'multiple_choice') {
            if (questions[idx].options.length === 0) {
              questions[idx].options = [{ text: '', is_correct: false }, { text: '', is_correct: false }]
            }
          } else {
            questions[idx].options = []
          }
          refreshQuestions()
        })
      })

      document.querySelectorAll('.btn-add-mc-option').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt((btn as HTMLElement).dataset.qidx!)
          questions[idx].options.push({ text: '', is_correct: false })
          refreshQuestions()
        })
      })

      document.querySelectorAll('.option-text-input, .option-correct-check, .q-stem-input, .q-points-input, .q-difficulty-select, .q-explanation-input').forEach((el) => {
        el.addEventListener('change', () => syncQuestionsFromDOM())
        el.addEventListener('input', () => syncQuestionsFromDOM())
      })

      document.querySelectorAll('input[type="radio"][name^="q"]').forEach((el) => {
        el.addEventListener('change', () => syncQuestionsFromDOM())
      })
    }

    document.getElementById('btn-add-question')?.addEventListener('click', () => {
      syncQuestionsFromDOM()
      questions.push({
        type: 'multiple_choice',
        stem: '',
        points: 10,
        difficulty: 'medium',
        explanation: '',
        options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
      })
      refreshQuestions()
    })

    bindQuestionEvents()

    document.getElementById('eval-full-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      syncQuestionsFromDOM()
      const fd = new FormData(e.target as HTMLFormElement)

      if (questions.length === 0) {
        toast('warning', 'Agrega al menos una pregunta')
        return
      }

      const moduleId = fd.get('moduleId') as string
      const title = fd.get('title') as string

      // 1. INSERT evaluation
      const { data: evalData, error: evalError } = await supabase
        .from('evaluations')
        .insert({
          module_id: moduleId,
          title,
          max_score: parseFloat(fd.get('maxScore') as string) || 100,
          weight: fd.get('weight') ? parseFloat(fd.get('weight') as string) : null,
          due_date: (fd.get('dueDate') as string) || null,
          description: (fd.get('description') as string) || null,
        })
        .select('id')
        .single()

      if (evalError || !evalData) {
        const errEl = document.getElementById('form-error')!
        errEl.textContent = evalError?.message || 'Error al crear evaluación'
        errEl.classList.remove('hidden')
        return
      }

      const evaluationId = evalData.id

      // 2. INSERT each question
      for (const q of questions) {
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert({
            type: q.type,
            stem: q.stem,
            points: q.points,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
          })
          .select('id')
          .single()

        if (qError || !qData) {
          toast('error', 'Error al crear pregunta')
          continue
        }

        // 3. INSERT options
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          for (const opt of q.options) {
            const { error: optError } = await supabase
              .from('question_options')
              .insert({ question_id: qData.id, text: opt.text, is_correct: opt.is_correct })
            if (optError) console.error('Error inserting option:', optError)
          }
        }

        // 4. INSERT evaluation_question link
        const { error: linkError } = await supabase
          .from('evaluation_question')
          .insert({ evaluation_id: evaluationId, question_id: qData.id })
        if (linkError) console.error('Error inserting evaluation_question link:', linkError)
      }

      toast('success', 'Evaluación creada correctamente')
      router.navigate('/coaches/evaluations')
    })
  } catch (err) {
    console.error('Error loading form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
