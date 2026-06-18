import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { renderToggle } from '@/4725dc/forms/Toggle'
import { router } from '@/f3395c'

export function renderCoachExams(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachExams(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
      return
    }

    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, name')
      .eq('course_id', id)
      .order('display_order')

    const { data: exams } = await supabase
      .from('exams')
      .select('*, course_modules(name)')
      .eq('course_id', id)
      .order('created_at', { ascending: false })

    const html = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(id)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>
        <div class="flex items-center justify-between">
          <h1 class="font-heading text-2xl font-bold text-white">Exámenes — ${escapeHtml(course.name)}</h1>
        </div>
      </div>

      <div class="mb-8">
        <div class="glass max-w-2xl rounded-xl p-6">
          <h2 class="mb-4 font-heading text-lg font-bold text-white">Crear nuevo examen</h2>
          <form id="create-exam-form">
            <div class="mb-4">
              <label class="mb-1 block text-sm text-zinc-400">Título</label>
              <input name="title" required maxlength="200"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            </div>
            <div class="mb-4">
              <label class="mb-1 block text-sm text-zinc-400">Descripción</label>
              <textarea name="description" rows="2"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
            </div>
            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Módulo</label>
                <select name="module_id"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">— Sin módulo —</option>
                  ${(modules ?? []).map((m: any) => `
                    <option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Nota mínima %</label>
                <input name="passing_score" type="number" min="0" max="100" value="60"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
            </div>
            <div class="mb-4 grid grid-cols-3 gap-4">
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Tiempo límite (min)</label>
                <input name="time_limit" type="number" min="0" placeholder="Sin límite"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Intentos máximos</label>
                <input name="max_attempts" type="number" min="1" value="1"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Peso %</label>
                <input name="weight" type="number" min="0" max="100" step="0.01" value="0"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
            </div>
            <div class="mb-4">
              <label class="mb-1 block text-sm text-zinc-400">Fecha límite</label>
              <input name="due_date" type="datetime-local"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            </div>
            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Tipo de evaluación</label>
                <select name="eval_type"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="exam">Examen</option>
                  <option value="quiz">Quiz</option>
                  <option value="practical">Práctica</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Mes</label>
                <select name="month"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">— Sin mes —</option>
                  ${Array.from({ length: 12 }, (_, i) => {
                    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
                    return `<option value="${i + 1}">${names[i]}</option>`
                  }).join('')}
                </select>
              </div>
            </div>
            <div class="mb-4 flex items-center gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input name="is_published" type="checkbox"
                  class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                <span class="text-sm text-zinc-400">Publicado</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input name="shuffle" type="checkbox"
                  class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                <span class="text-sm text-zinc-400">Aleatorio</span>
              </label>
              ${renderToggle({ name: 'is_active', label: 'Activo', checked: true })}
            </div>

            <div class="mb-4 border-t border-zinc-700 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-heading text-base font-bold text-white">Preguntas del examen</h3>
                <button type="button" id="add-question-btn" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  ${Icon('plus', 12)} Agregar pregunta
                </button>
              </div>
              <div id="new-exam-questions" class="space-y-4">
                <div class="new-question-item rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-qidx="0">
                  <div class="flex gap-2 mb-2">
                    <input name="q_text" required placeholder="Texto de la pregunta 1"
                      class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                    <select name="q_type" class="q-type-select w-28 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      <option value="multiple_choice">Opción múltiple</option>
                      <option value="true_false">V/F</option>
                      <option value="open_ended">Desarrollo</option>
                      <option value="short_answer">Corta</option>
                    </select>
                    <input name="q_points" type="number" step="0.5" value="1" required
                      class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                    <button type="button" class="remove-new-q-btn text-zinc-600 hover:text-red-400 transition">&times;</button>
                  </div>
                  <div class="new-q-options space-y-1.5 pl-2">
                    <div class="q-opt-row flex gap-2 items-center">
                      <input type="text" name="q_opt_text" placeholder="Opción A"
                        class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
                        <input type="checkbox" name="q_opt_correct" value="0" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
                      </label>
                      <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
                    </div>
                    <div class="q-opt-row flex gap-2 items-center">
                      <input type="text" name="q_opt_text" placeholder="Opción B"
                        class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
                        <input type="checkbox" name="q_opt_correct" value="1" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
                      </label>
                      <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
                    </div>
                  </div>
                  <button type="button" class="q-add-opt-btn mt-2 ml-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button>
                </div>
              </div>
            </div>

            <p id="create-exam-error" class="mb-4 text-sm text-red-400 hidden"></p>
            <button type="submit"
              class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('plus', 14)} Crear examen con preguntas
            </button>
          </form>
        </div>
      </div>

      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Exámenes (${(exams ?? []).length})</h2>
        <div class="space-y-3">
          ${(exams ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">No hay exámenes aún.</p>'
            : (exams ?? []).map((exam: any) => `
              <div class="exam-item glass rounded-xl p-4" data-exam-id="${escapeHtml(exam.id)}">
                <div class="flex items-start justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h3 class="font-medium text-white">${escapeHtml(exam.title)}</h3>
                      ${exam.is_published
                        ? '<span class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Publicado</span>'
                        : '<span class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Borrador</span>'
                      }
                    </div>
                    <p class="mt-1 text-xs text-zinc-500">
                      ${exam.course_modules?.name ? escapeHtml(exam.course_modules.name) + ' · ' : ''}
                      Nota mín: ${exam.passing_score}%${exam.time_limit ? ` · Tiempo: ${exam.time_limit}min` : ''}${exam.max_attempts ? ` · Intentos: ${exam.max_attempts}` : ''}
                      ${exam.due_date ? ` · Vence: ${formatDate(exam.due_date)}` : ''}
                    </p>
                  </div>
                      <div class="flex gap-2">
                        <button class="exam-questions-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">${Icon('bookOpen', 12)} Preguntas</button>
                        <button class="edit-exam-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 12)} Editar</button>
                        <button class="delete-exam-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-900/30">${Icon('trash', 12)}</button>
                      </div>
                </div>

                <div class="edit-exam-form mt-4 hidden border-t border-zinc-700 pt-4">
                  <form class="update-exam-form">
                    <input type="hidden" name="exam_id" value="${escapeHtml(exam.id)}">
                    <div class="mb-3">
                      <label class="mb-1 block text-xs text-zinc-400">Título</label>
                      <input name="title" required maxlength="200" value="${escapeHtml(exam.title)}"
                        class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    </div>
                    <div class="mb-3">
                      <label class="mb-1 block text-xs text-zinc-400">Descripción</label>
                      <textarea name="description" rows="2"
                        class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(exam.description || '')}</textarea>
                    </div>
                    <div class="mb-3 grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Módulo</label>
                        <select name="module_id"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                          <option value="">— Sin módulo —</option>
                          ${(modules ?? []).map((m: any) => `
                            <option value="${escapeHtml(m.id)}" ${m.id === exam.module_id ? 'selected' : ''}>${escapeHtml(m.name)}</option>
                          `).join('')}
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Nota mínima %</label>
                        <input name="passing_score" type="number" min="0" max="100" value="${exam.passing_score}"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      </div>
                    </div>
                    <div class="mb-3 grid grid-cols-3 gap-3">
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Tiempo (min)</label>
                        <input name="time_limit" type="number" min="0" value="${exam.time_limit || ''}"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Intentos</label>
                        <input name="max_attempts" type="number" min="1" value="${exam.max_attempts}"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Peso %</label>
                        <input name="weight" type="number" min="0" max="100" step="0.01" value="${exam.weight || 0}"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="mb-1 block text-xs text-zinc-400">Fecha límite</label>
                      <input name="due_date" type="datetime-local" value="${exam.due_date ? exam.due_date.slice(0, 16) : ''}"
                        class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    </div>
                    <div class="mb-3 grid grid-cols-2 gap-3">
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
                        <select name="eval_type"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                          <option value="exam" ${exam.eval_type === 'exam' ? 'selected' : ''}>Examen</option>
                          <option value="quiz" ${exam.eval_type === 'quiz' ? 'selected' : ''}>Quiz</option>
                          <option value="practical" ${exam.eval_type === 'practical' ? 'selected' : ''}>Práctica</option>
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs text-zinc-400">Mes</label>
                        <select name="month"
                          class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                          <option value="">— Sin mes —</option>
                          ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((n, i) =>
                            `<option value="${i + 1}" ${exam.month === i + 1 ? 'selected' : ''}>${n}</option>`
                          ).join('')}
                        </select>
                      </div>
                    </div>
                    <div class="mb-3 flex items-center gap-6">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input name="is_published" type="checkbox" ${exam.is_published ? 'checked' : ''}
                          class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                        <span class="text-xs text-zinc-400">Publicado</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input name="shuffle" type="checkbox" ${exam.shuffle ? 'checked' : ''}
                          class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                        <span class="text-xs text-zinc-400">Aleatorio</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input name="is_active" type="checkbox" ${exam.is_active !== false ? 'checked' : ''}
                          class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                        <span class="text-xs text-zinc-400">Activo</span>
                      </label>
                    </div>
                    <p class="edit-exam-error mb-3 text-sm text-red-400 hidden"></p>
                    <div class="flex gap-2">
                      <button type="submit"
                        class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">Guardar</button>
                      <button type="button" class="cancel-edit-exam rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">Cancelar</button>
                    </div>
                  </form>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>

      <div id="questions-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
        <div class="glass max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-heading text-lg font-bold text-white" id="questions-modal-title">Preguntas del examen</h2>
            <button id="close-questions-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
          </div>
          <input type="hidden" id="questions-exam-id">
          <div id="questions-list" class="space-y-3 mb-6"></div>
          <div class="border-t border-zinc-700 pt-4">
            <h3 class="mb-3 font-medium text-white text-sm">Agregar pregunta existente</h3>
            <div class="flex gap-2">
              <select id="add-existing-question" class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></select>
              <button id="btn-add-existing-question" class="rounded-lg bg-[#8B5CF6] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#7C3AED]">Agregar</button>
            </div>
          </div>
          <div class="border-t border-zinc-700 pt-4 mt-4">
            <h3 class="mb-3 font-medium text-white text-sm">O crear nueva pregunta</h3>
            <form id="quick-question-form" class="space-y-3">
              <input type="hidden" name="examId">
              <div>
                <textarea name="text" rows="2" required placeholder="Texto de la pregunta..."
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
              </div>
              <div class="flex gap-2">
                <select name="type" required
                  class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="multiple_choice">Opción múltiple</option>
                  <option value="true_false">Verdadero/Falso</option>
                  <option value="open_ended">Desarrollo</option>
                  <option value="short_answer">Respuesta corta</option>
                </select>
                <input name="points" type="number" step="0.5" value="1" required
                  class="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div id="quick-options-container">
                <p class="text-xs text-zinc-500 mb-2">Opciones</p>
                <div class="space-y-2" id="quick-options-list">
                  <div class="q-opt-row flex gap-2 items-center">
                    <input type="text" name="option_text" placeholder="Opción A"
                      class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                    <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
                      <input type="checkbox" name="option_correct" value="0" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
                    </label>
                    <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
                  </div>
                  <div class="q-opt-row flex gap-2 items-center">
                    <input type="text" name="option_text" placeholder="Opción B"
                      class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                    <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
                      <input type="checkbox" name="option_correct" value="1" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
                    </label>
                    <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
                  </div>
                </div>
                <button type="button" id="quick-add-opt" class="mt-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button>
              </div>
              <p id="quick-question-error" class="hidden text-xs text-red-400"></p>
              <button type="submit"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Crear y agregar</button>
            </form>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('create-exam-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const payload: Record<string, any> = {
        course_id: id,
        title: fd.get('title'),
        description: fd.get('description'),
        module_id: fd.get('module_id') || null,
        passing_score: parseFloat(fd.get('passing_score') as string) || 60,
        time_limit: parseInt(fd.get('time_limit') as string) || null,
        max_attempts: parseInt(fd.get('max_attempts') as string) || 1,
        weight: parseFloat(fd.get('weight') as string) || 0,
        due_date: fd.get('due_date') || null,
        is_published: fd.get('is_published') === 'on',
        shuffle: fd.get('shuffle') === 'on',
        eval_type: (fd.get('eval_type') as string) || 'exam',
        month: fd.get('month') ? parseInt(fd.get('month') as string) : null,
        is_active: fd.get('is_active') === 'on',
      }

      const { data: newExam, error } = await supabase.from('exams').insert(payload).select().maybeSingle()
      if (error || !newExam) {
        const errEl = document.getElementById('create-exam-error')!
        errEl.textContent = error?.message || 'Error al crear examen'
        errEl.classList.remove('hidden')
        return
      }

      const questionItems = document.querySelectorAll('.new-question-item')
      for (let i = 0; i < questionItems.length; i++) {
        const item = questionItems[i] as HTMLElement
        const qText = (item.querySelector<HTMLInputElement>('input[name="q_text"]'))?.value
        const qType = (item.querySelector<HTMLSelectElement>('select[name="q_type"]'))?.value
        const qPoints = parseFloat((item.querySelector<HTMLInputElement>('input[name="q_points"]'))?.value || '1')

        if (!qText?.trim()) continue

        const { data: question } = await supabase
          .from('questions')
          .insert({ course_id: id, type: qType, stem: qText, points: qPoints })
          .select()
          .maybeSingle()

        if (!question) continue

        if (qType === 'multiple_choice' || qType === 'true_false') {
          const optRows = item.querySelectorAll<HTMLElement>('.q-opt-row')
          for (let j = 0; j < optRows.length; j++) {
            const row = optRows[j]
            const optText = row.querySelector<HTMLInputElement>('input[name="q_opt_text"]')?.value
            const optCheck = row.querySelector<HTMLInputElement>('input[name="q_opt_correct"]')
            const optCorrect = optCheck?.checked
            if (!optText?.trim()) continue
            const { error: optErr } = await supabase.from('question_options').insert({
              question_id: question.id,
              text: optText,
              is_correct: optCorrect || false,
              order_num: j,
            })
            if (optErr) console.error('Error saving option:', optErr)
          }
        }

        await supabase.from('exam_questions').insert({
          exam_id: newExam.id,
          question_id: question.id,
          order_num: i,
          points: qPoints,
        })
      }

      toast('success', 'Examen creado correctamente')
      initCoachExams()
    })

    document.querySelectorAll('.edit-exam-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = (btn as HTMLElement).closest('.exam-item')!
        const form = item.querySelector('.edit-exam-form') as HTMLElement
        form.classList.toggle('hidden')
      })
    })

    document.querySelectorAll('.cancel-edit-exam').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = (btn as HTMLElement).closest('.edit-exam-form') as HTMLElement
        form.classList.add('hidden')
      })
    })

    document.querySelectorAll('.update-exam-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const examId = fd.get('exam_id') as string
        const payload: Record<string, any> = {
          title: fd.get('title'),
          description: fd.get('description'),
          module_id: fd.get('module_id') || null,
          passing_score: parseFloat(fd.get('passing_score') as string) || 60,
          time_limit: parseInt(fd.get('time_limit') as string) || null,
          max_attempts: parseInt(fd.get('max_attempts') as string) || 1,
          weight: parseFloat(fd.get('weight') as string) || 0,
          due_date: fd.get('due_date') || null,
        is_published: fd.get('is_published') === 'on',
        shuffle: fd.get('shuffle') === 'on',
        eval_type: (fd.get('eval_type') as string) || 'exam',
        month: fd.get('month') ? parseInt(fd.get('month') as string) : null,
        is_active: fd.get('is_active') === 'on',
      }

        const { error } = await supabase.from('exams').update(payload).eq('id', examId)
        if (error) {
          const errEl = (e.target as HTMLElement).querySelector('.edit-exam-error')!
          errEl.textContent = error.message
          errEl.classList.remove('hidden')
          return
        }
        toast('success', 'Examen actualizado')
        initCoachExams()
      })
    })

    document.querySelectorAll('.delete-exam-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
        if (!examId || !(await confirmDialog('¿Eliminar este examen? Se eliminarán también todos los intentos asociados.'))) return
        const { error } = await supabase.from('exams').delete().eq('id', examId)
        if (error) {
          toast('error', error.message)
          return
        }
        toast('success', 'Examen eliminado')
        initCoachExams()
      })
    })

    // ── Inline question builder for new exam ──
    let qIdx = document.querySelectorAll('.new-question-item').length

    function createQOptRow(idx: number, placeholder = '', correctVal = ''): string {
      return `<div class="q-opt-row flex gap-2 items-center">
        <input type="text" name="q_opt_text" placeholder="${escapeHtml(placeholder)}"
          class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
          <input type="checkbox" name="q_opt_correct" value="${correctVal}" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
        </label>
        <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
      </div>`
    }

    function createQuestionItem(index: number, qText = ''): string {
      return `
        <div class="new-question-item rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-qidx="${index}">
          <div class="flex gap-2 mb-2">
            <input name="q_text" required placeholder="Texto de la pregunta ${index + 1}" value="${escapeHtml(qText)}"
              class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            <select name="q_type" class="q-type-select w-28 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="multiple_choice">Opción múltiple</option>
              <option value="true_false">V/F</option>
              <option value="open_ended">Desarrollo</option>
              <option value="short_answer">Corta</option>
            </select>
            <input name="q_points" type="number" step="0.5" value="1" required
              class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            <button type="button" class="remove-new-q-btn text-zinc-600 hover:text-red-400 transition">&times;</button>
          </div>
          <div class="new-q-options space-y-1.5 pl-2">
            ${createQOptRow(index, 'Opción A', '0')}
            ${createQOptRow(index, 'Opción B', '1')}
          </div>
          <button type="button" class="q-add-opt-btn mt-2 ml-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button>
        </div>`
    }

    document.getElementById('add-question-btn')?.addEventListener('click', () => {
      const container = document.getElementById('new-exam-questions')!
      container.insertAdjacentHTML('beforeend', createQuestionItem(qIdx))
      qIdx++
    })

    document.getElementById('new-exam-questions')?.addEventListener('change', (e) => {
      const target = e.target as HTMLElement
      if (target.matches('.q-type-select')) {
        const item = target.closest('.new-question-item') as HTMLElement
        const type = (target as HTMLSelectElement).value
        const opts = item.querySelector('.new-q-options') as HTMLElement
        const addBtn = item.querySelector('.q-add-opt-btn') as HTMLElement
        const show = type === 'multiple_choice' || type === 'true_false'
        opts.style.display = show ? '' : 'none'
        if (addBtn) addBtn.style.display = show ? '' : 'none'
        if (type === 'true_false') {
          opts.innerHTML = createQOptRow(parseInt(item.dataset.qidx || '0'), 'Verdadero', '0') +
            createQOptRow(parseInt(item.dataset.qidx || '0'), 'Falso', '1')
          if (addBtn) addBtn.style.display = 'none'
        }
      }
    })

    document.getElementById('new-exam-questions')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.remove-new-q-btn') as HTMLElement
      if (btn) {
        const item = btn.closest('.new-question-item') as HTMLElement
        if (item && document.querySelectorAll('.new-question-item').length > 1) {
          item.remove()
        }
        return
      }
      const addOpt = (e.target as HTMLElement).closest('.q-add-opt-btn') as HTMLElement
      if (addOpt) {
        const item = addOpt.closest('.new-question-item') as HTMLElement
        const idx = parseInt(item?.dataset.qidx || '0')
        const opts = item?.querySelector('.new-q-options')
        const count = opts?.querySelectorAll('.q-opt-row').length || 0
        addOpt.insertAdjacentHTML('beforebegin', createQOptRow(idx, `Opción ${String.fromCharCode(65 + count)}`, String(count)))
        return
      }
      const remOpt = (e.target as HTMLElement).closest('.q-opt-remove') as HTMLElement
      if (remOpt) {
        const row = remOpt.closest('.q-opt-row') as HTMLElement
        const opts = row?.closest('.new-q-options') as HTMLElement
        if (opts && opts.querySelectorAll('.q-opt-row').length > 2) {
          row.remove()
        }
        return
      }
    })

    // ── Question management modal ──
    const qModal = document.getElementById('questions-modal')!
    const qList = document.getElementById('questions-list')!
    const qExamIdInput = document.getElementById('questions-exam-id') as HTMLInputElement
    const qSelect = document.getElementById('add-existing-question') as HTMLSelectElement

    async function loadExamQuestions(examId: string) {
      qList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'

      const { data: eqs } = await supabase
        .from('exam_questions')
        .select('*, questions(*)')
        .eq('exam_id', examId)
        .order('order_num')

      const { data: options } = await supabase
        .from('question_options')
        .select('*')
        .in('question_id', [...new Set((eqs ?? []).map((eq: any) => eq.question_id))].length > 0
          ? [...new Set((eqs ?? []).map((eq: any) => eq.question_id))]
          : ['none'])

      const optsByQ: Record<string, any[]> = {}
      for (const o of options ?? []) {
        if (!optsByQ[o.question_id]) optsByQ[o.question_id] = []
        optsByQ[o.question_id].push(o)
      }

      if ((eqs ?? []).length === 0) {
        qList.innerHTML = '<p class="text-sm text-zinc-500">No hay preguntas en este examen.</p>'
      } else {
        qList.innerHTML = (eqs ?? []).map((eq: any) => {
          const q = eq.questions
          const qOpts = optsByQ[q.id] || []
          const typeLabels: Record<string, string> = { multiple_choice: 'Opción múltiple', true_false: 'V/F', short_answer: 'Corta', open_ended: 'Desarrollo' }
          return `
            <div class="exam-q-item rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-eq-id="${escapeHtml(eq.id)}">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-[#8B5CF6]">${eq.order_num + 1}.</span>
                    <p class="text-sm text-white">${escapeHtml(q.stem || q.text || '')}</p>
                    <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${typeLabels[q.type] || q.type}</span>
                    <span class="text-xs text-zinc-500">${eq.points} pts</span>
                  </div>
                  ${qOpts.length > 0 ? `
                    <div class="mt-2 space-y-1 pl-4">
                      ${qOpts.map((o: any) => `
                        <div class="flex items-center gap-2 text-xs ${o.is_correct ? 'text-green-400' : 'text-zinc-500'}">
                          <span>${o.is_correct ? Icon('checkCircle', 10) : '○'}</span>
                          <span>${escapeHtml(o.text)}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                <button class="remove-exam-q-btn text-zinc-600 hover:text-red-400 transition" data-eq-id="${escapeHtml(eq.id)}">${Icon('x', 14)}</button>
              </div>
            </div>`
        }).join('')
      }

      qSelect.innerHTML = '<option value="">— Seleccionar pregunta —</option>'
      const { data: allQuestions } = await supabase.from('questions').select('id, stem, text, type').order('created_at', { ascending: false })
      const existingQIds = new Set((eqs ?? []).map((eq: any) => eq.question_id))
      for (const q of allQuestions ?? []) {
        if (existingQIds.has(q.id)) continue
        const label = (q.stem || q.text || '').slice(0, 80)
        qSelect.innerHTML += `<option value="${escapeHtml(q.id)}">${escapeHtml(label)}</option>`
      }
    }

    document.querySelectorAll('.exam-questions-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
        if (!examId) return
        qExamIdInput.value = examId
        document.getElementById('questions-modal-title')!.textContent = 'Preguntas del examen'
        qModal.classList.remove('hidden')
        await loadExamQuestions(examId)
      })
    })

    document.getElementById('close-questions-modal')?.addEventListener('click', () => {
      qModal.classList.add('hidden')
    })

    qModal.addEventListener('click', (e) => {
      if (e.target === qModal) qModal.classList.add('hidden')
    })

    document.getElementById('btn-add-existing-question')?.addEventListener('click', async () => {
      const examId = qExamIdInput.value
      const questionId = qSelect.value
      if (!examId || !questionId) return

      const { data: maxOrderRaw } = await supabase
        .from('exam_questions')
        .select('order_num')
        .eq('exam_id', examId)
        .order('order_num', { ascending: false })
        .limit(1)
      const maxOrder = (maxOrderRaw ?? []) as any[]

      const nextOrder = maxOrder.length > 0 ? maxOrder[0].order_num + 1 : 0

      const { error } = await supabase.from('exam_questions').insert({
        exam_id: examId,
        question_id: questionId,
        order_num: nextOrder,
        points: 1,
      })

      if (error) {
        toast('error', error.message)
      } else {
        toast('success', 'Pregunta agregada al examen')
        await loadExamQuestions(examId)
      }
    })

    document.getElementById('quick-question-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const examId = fd.get('examId') as string || qExamIdInput.value
      if (!examId) return

      const type = fd.get('type') as string
      const text = fd.get('text') as string
      const points = parseFloat(fd.get('points') as string) || 1

      const { data: newQ, error: qErr } = await supabase
        .from('questions')
        .insert({ course_id: id, type, stem: text, points })
        .select()
        .maybeSingle()

      if (qErr || !newQ) {
        document.getElementById('quick-question-error')!.textContent = qErr?.message || 'Error al crear pregunta'
        document.getElementById('quick-question-error')!.classList.remove('hidden')
        return
      }

      if (type === 'multiple_choice' || type === 'true_false') {
        const optRows = document.querySelectorAll('#quick-options-list .q-opt-row')
        for (let oi = 0; oi < optRows.length; oi++) {
          const row = optRows[oi]
          const optText = row.querySelector<HTMLInputElement>('input[name="option_text"]')?.value
          const optCheck = row.querySelector<HTMLInputElement>('input[name="option_correct"]')
          const optCorrect = optCheck?.checked
          if (!optText?.trim()) continue
          await supabase.from('question_options').insert({
            question_id: newQ.id,
            text: optText,
            is_correct: optCorrect || false,
            order_num: oi,
          })
        }
      }

      const { data: maxOrder2Raw } = await supabase
        .from('exam_questions')
        .select('order_num')
        .eq('exam_id', examId)
        .order('order_num', { ascending: false })
        .limit(1)
      const maxOrder2 = (maxOrder2Raw ?? []) as any[]

      const nextOrder2 = maxOrder2.length > 0 ? maxOrder2[0].order_num + 1 : 0

      await supabase.from('exam_questions').insert({
        exam_id: examId,
        question_id: newQ.id,
        order_num: nextOrder2,
        points,
      })

      toast('success', 'Pregunta creada y agregada al examen')
      document.getElementById('quick-question-form')!.querySelector<HTMLTextAreaElement>('textarea[name="text"]')!.value = ''
      document.getElementById('quick-question-error')!.classList.add('hidden')
      await loadExamQuestions(examId)
    })

    const typeSelect = document.getElementById('quick-question-form')?.querySelector('select[name="type"]') as HTMLSelectElement
    const quickOptsList = document.getElementById('quick-options-list')
    const quickAddBtn = document.getElementById('quick-add-opt')

    function createQuickOptRow(idx: number, placeholder = ''): string {
      return `<div class="q-opt-row flex gap-2 items-center">
        <input type="text" name="option_text" placeholder="${escapeHtml(placeholder)}"
          class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
          <input type="checkbox" name="option_correct" value="${idx}" class="h-3 w-3 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> Correcta
        </label>
        <button type="button" class="q-opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button>
      </div>`
    }

    function updateOptionsVisibility() {
      const type = typeSelect?.value || 'multiple_choice'
      const container = document.getElementById('quick-options-container')!
      container.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'
      if (type === 'true_false' && quickOptsList) {
        quickOptsList.innerHTML = createQuickOptRow(0, 'Verdadero') + createQuickOptRow(1, 'Falso')
        if (quickAddBtn) quickAddBtn.style.display = 'none'
      } else if (type === 'multiple_choice' && quickOptsList) {
        quickOptsList.innerHTML = createQuickOptRow(0, 'Opción A') + createQuickOptRow(1, 'Opción B')
        if (quickAddBtn) quickAddBtn.style.display = ''
      }
    }
    typeSelect?.addEventListener('change', updateOptionsVisibility)
    updateOptionsVisibility()

    quickAddBtn?.addEventListener('click', () => {
      const count = quickOptsList?.querySelectorAll('.q-opt-row').length || 0
      quickOptsList?.insertAdjacentHTML('beforeend', createQuickOptRow(count, `Opción ${String.fromCharCode(65 + count)}`))
    })

    quickOptsList?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.q-opt-remove') as HTMLElement
      if (!btn) return
      const row = btn.closest('.q-opt-row') as HTMLElement
      if (quickOptsList && quickOptsList.querySelectorAll('.q-opt-row').length > 2) {
        row.remove()
      }
    })

    qList.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('.remove-exam-q-btn') as HTMLElement
      if (!btn) return
      const eqId = btn.getAttribute('data-eq-id')
      if (!eqId || !(await confirmDialog('¿Quitar esta pregunta del examen?'))) return
      const { error } = await supabase.from('exam_questions').delete().eq('id', eqId)
      if (error) {
        toast('error', error.message)
      } else {
        toast('success', 'Pregunta quitada del examen')
        await loadExamQuestions(qExamIdInput.value)
      }
    })
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}
