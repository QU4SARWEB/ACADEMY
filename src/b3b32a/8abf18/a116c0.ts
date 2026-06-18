import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'

export function renderCoachEvaluations(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEvaluations(): Promise<void> {
  try {
    const { data } = await supabase
      .from('evaluations')
      .select('*, course_modules(name, courses(name))')
      .order('created_at', { ascending: false })

    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, name')
      .order('course_id')

    const courseFilterOptions = [...new Set((data ?? []).map((e: any) => e.course_modules?.courses?.name).filter(Boolean))]

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Evaluaciones</h1>
          <p class="mt-1 text-sm text-zinc-500">${(data ?? []).length} evaluaciones</p>
        </div>
        <button id="btn-new-eval-inline"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nueva evaluación
        </button>
      </div>

      <div id="eval-form-container" class="hidden mb-6"></div>

      <div class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay evaluaciones.</p>'
          : (data ?? []).map((e: any) => `
            <a href="#/coaches/evaluations/${escapeHtml(e.id)}"
               class="glass glass-hover flex items-center justify-between rounded-xl p-4">
              <div>
                <h3 class="font-medium text-white">${escapeHtml(e.title)}</h3>
                <p class="mt-0.5 text-sm text-zinc-500">
                  ${escapeHtml(e.course_modules?.courses?.name || 'Sin curso')} / ${escapeHtml(e.course_modules?.name || 'Sin módulo')}
                  ${e.max_score ? ` · Máx: ${e.max_score} pts` : ''}
                  ${e.weight ? ` · Peso: ${e.weight}%` : ''}
                </p>
              </div>
              <span class="text-xs ${e.is_active ? 'text-green-400' : 'text-zinc-500'}">${e.is_active ? 'Activa' : 'Inactiva'}</span>
            </a>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    function renderInlineForm(): string {
      const moduleOptions = (modules ?? []).map((m: any) =>
        `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`
      ).join('')
      return `
        <div class="glass rounded-xl p-4">
          <h3 class="mb-3 font-medium text-white">Nueva evaluación</h3>
          <form id="eval-inline-form" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Título</label>
                <input type="text" name="title" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Módulo</label>
                <select name="moduleId" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar...</option>
                  ${moduleOptions}
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Puntaje máximo</label>
                <input type="number" name="maxScore" value="100" min="0"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Peso (%)</label>
                <input type="number" name="weight" value="100" min="0" max="100"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Fecha límite</label>
                <input type="date" name="dueDate"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
                <select name="type"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="exam">Examen</option>
                  <option value="quiz">Quiz</option>
                  <option value="practical">Práctica</option>
                </select>
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Preguntas</label>
              <div id="inline-questions-container">
                <div class="inline-question-row flex items-center gap-2 mb-2">
                  <input type="text" name="question_text_0" placeholder="Texto de la pregunta"
                    class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" />
                  <select name="question_type_0"
                    class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]">
                    <option value="multiple_choice">Opción múltiple</option>
                    <option value="true_false">Verdadero/Falso</option>
                    <option value="open_ended">Respuesta abierta</option>
                  </select>
                  <input type="number" name="question_points_0" placeholder="Pts" value="10" min="0"
                    class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" />
                  <button type="button" class="btn-remove-inline-question text-red-400 hover:text-red-300">${Icon('x', 14)}</button>
                </div>
              </div>
              <button type="button" id="btn-add-inline-question" class="mt-1 text-xs text-[#8B5CF6] hover:text-[#7C3AED]">+ Agregar pregunta</button>
            </div>
            <p id="eval-form-error" class="hidden text-xs text-red-400"></p>
            <div class="flex gap-2">
              <button type="submit"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear evaluación</button>
              <button type="button" id="btn-cancel-inline-eval"
                class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
          </form>
        </div>`
    }

    let questionCounter = 1

    document.getElementById('btn-new-eval-inline')?.addEventListener('click', () => {
      const container = document.getElementById('eval-form-container')!
      container.innerHTML = renderInlineForm()
      container.classList.remove('hidden')
      questionCounter = 1

      document.getElementById('btn-cancel-inline-eval')?.addEventListener('click', () => {
        container.classList.add('hidden')
      })

      document.getElementById('btn-add-inline-question')?.addEventListener('click', () => {
        const qContainer = document.getElementById('inline-questions-container')!
        const row = document.createElement('div')
        row.className = 'inline-question-row flex items-center gap-2 mb-2'
        row.innerHTML = `
          <input type="text" name="question_text_${questionCounter}" placeholder="Texto de la pregunta"
            class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" />
          <select name="question_type_${questionCounter}"
            class="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]">
            <option value="multiple_choice">Opción múltiple</option>
            <option value="true_false">Verdadero/Falso</option>
            <option value="open_ended">Respuesta abierta</option>
          </select>
          <input type="number" name="question_points_${questionCounter}" placeholder="Pts" value="10" min="0"
            class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" />
          <button type="button" class="btn-remove-inline-question text-red-400 hover:text-red-300">${Icon('x', 14)}</button>`
        qContainer.appendChild(row)
        row.querySelector('.btn-remove-inline-question')?.addEventListener('click', () => row.remove())
        questionCounter++
      })

      document.getElementById('eval-inline-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const { error: evalError } = await supabase.from('evaluations').insert({
          module_id: fd.get('moduleId') as string,
          title: fd.get('title') as string,
          max_score: parseFloat(fd.get('maxScore') as string) || 100,
          weight: fd.get('weight') ? parseFloat(fd.get('weight') as string) : null,
          due_date: (fd.get('dueDate') as string) || null,
          eval_type: (fd.get('type') as string) || null,
        })
        if (evalError) {
          const errEl = document.getElementById('eval-form-error')!
          errEl.textContent = evalError.message
          errEl.classList.remove('hidden')
          return
        }
        toast('success', 'Evaluación creada correctamente')
        container.classList.add('hidden')
        initCoachEvaluations()
      })
    })

    if ((window as any).__channels?.evaluations) {
      supabase.removeChannel((window as any).__channels.evaluations)
    }
    const channel = supabase.channel('evaluations-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.evaluations = channel
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'evaluations' },
        () => initCoachEvaluations()
      )
      .subscribe()
  } catch (err) {
    console.error('Error loading evaluations:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar evaluaciones</p>'
  }
}
