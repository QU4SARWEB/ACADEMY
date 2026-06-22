import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { renderToggle } from '@/4725dc/forms/Toggle'
import { router } from '@/f3395c'

export function renderCoachExams(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachExams(): Promise<void> {
  ;(window as any)._eq = []
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

      <div class="flex gap-6 items-start">
        <div class="w-[600px] shrink-0">
        <div class="glass rounded-xl p-6">
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

            <div class="mb-4 pt-2">
              <button type="button" id="paste-full-exam-btn" class="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition">
                ${Icon('clipboardList', 12)} Pegar examen completo
              </button>
              <div id="paste-full-exam-area" class="hidden mt-2">
                <textarea rows="8" placeholder="Pega aquí el examen completo con formato:&#10;Título&#10;&#10;Objetivo: ...&#10;Duración: ...&#10;Nota mínima: ...%&#10;&#10;1. Pregunta...&#10;a) Opción A&#10;b) Opción B ✅&#10;c) Opción C"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-xs text-white outline-none focus:border-[#8B5CF6]"></textarea>
                <div class="flex gap-2 mt-1">
                  <button type="button" id="apply-full-exam-btn" class="text-xs text-[#8B5CF6] hover:text-[#7C3AED] transition">Aplicar</button>
                  <button type="button" id="cancel-full-exam-btn" class="text-xs text-zinc-500 hover:text-white transition">Cancelar</button>
                </div>
              </div>
            </div>
            <div class="mb-4 border-t border-zinc-700 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-heading text-base font-bold text-white">Preguntas del examen</h3>
                <button type="button" id="add-manual-q-btn" class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">
                  ${Icon('plus', 12)} Agregar pregunta manual
                </button>
              </div>
              <div id="manual-questions-list" class="space-y-2 mb-3"></div>
              <div id="manual-q-form" class="hidden rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
                <div class="flex flex-wrap gap-2 mb-2">
                  <input id="manual-q-text" placeholder="Texto de la pregunta"
                    class="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  <select id="manual-q-type" class="w-28 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="multiple_choice">Opción múltiple</option>
                    <option value="true_false">V/F</option>
                    <option value="open_ended">Desarrollo</option>
                    <option value="short_answer">Corta</option>
                  </select>
                  <input id="manual-q-points" type="number" step="0.5" value="5"
                    class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                  <button type="button" id="manual-q-close" class="text-zinc-600 hover:text-red-400 transition">&times;</button>
                </div>
                <div id="manual-q-options" class="space-y-1.5 pl-2">
                  <div class="manual-opt-row flex gap-2 items-center">
                    <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">A.</span>
                    <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción A" />
                    <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
                      <input type="radio" name="manual-opt-correct" value="0" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
                    </label>
                    <button type="button" class="manual-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition hidden">&times;</button>
                  </div>
                  <div class="manual-opt-row flex gap-2 items-center">
                    <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">B.</span>
                    <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción B" />
                    <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
                      <input type="radio" name="manual-opt-correct" value="1" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
                    </label>
                    <button type="button" class="manual-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition hidden">&times;</button>
                  </div>
                </div>
                <button type="button" id="manual-add-opt" class="mt-2 ml-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button>
                <p id="manual-q-error" class="mt-2 text-xs text-red-400 hidden"></p>
                <button type="button" id="manual-q-save" class="mt-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">Guardar pregunta</button>
              </div>
            </div>
            <p id="create-exam-error" class="mb-4 text-sm text-red-400 hidden"></p>
            <button type="submit"
              class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('plus', 14)} Crear examen
            </button>
          </form>
        </div>
      </div>
        <div class="w-[800px] shrink-0">
        <div class="glass rounded-xl p-6">
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
                        <button class="exam-answers-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">${Icon('users', 12)} Respuestas</button>
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
                        class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escBr(exam.description || '')}</textarea>
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
                      <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">A.</span>
                      <input type="text" name="option_text" placeholder="Opción A"
                        class="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
                        <input type="radio" name="option_correct" value="0"
                          class="correct-radio h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
                      </label>
                      <button type="button" class="q-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition">&times;</button>
                    </div>
                    <div class="q-opt-row flex gap-2 items-center">
                      <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">B.</span>
                      <input type="text" name="option_text" placeholder="Opción B"
                        class="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
                        <input type="radio" name="option_correct" value="1"
                          class="correct-radio h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
                      </label>
                      <button type="button" class="q-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition">&times;</button>
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
      </div>

      <div id="answers-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
        <div class="glass max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-heading text-lg font-bold text-white" id="answers-modal-title">Respuestas del examen</h2>
            <button id="close-answers-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
          </div>
          <input type="hidden" id="answers-exam-id">
          <div id="answers-list" class="space-y-4"></div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    // ── Manual question builder ──
    const rq = () => {
      const list = document.getElementById('manual-questions-list')!
      const d = (window as any)._eq || []
      if (!d.length) { list.innerHTML = '<p class="text-xs text-zinc-500">No hay preguntas aún. Agréguelas manualmente o use "Pegar examen completo".</p>'; return }
      list.innerHTML = d.map((q: any, qi: number) => '<div class="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900/30 px-3 py-2"><div class="min-w-0 flex-1"><span class="text-xs font-medium text-[#8B5CF6]">' + (qi + 1) + '.</span><span class="text-xs text-white">' + escapeHtml(q.stem.slice(0, 80)) + '</span><span class="ml-2 text-[10px] text-zinc-500">' + (q.type === 'multiple_choice' ? 'MC' : q.type === 'true_false' ? 'V/F' : q.type === 'open_ended' ? 'Desarrollo' : 'Corta') + ' · ' + q.points + 'pts</span></div><button type="button" class="remove-manual-q text-zinc-600 hover:text-red-400 transition shrink-0 ml-2" data-idx="' + qi + '">' + Icon('x', 12) + '</button></div>').join('')
      const btn = document.querySelector('#create-exam-form button[type="submit"]')!
      btn.textContent = 'Crear examen' + (d.length ? ' (' + d.length + ' preguntas)' : '')
    }
    rq()

    document.getElementById('add-manual-q-btn')?.addEventListener('click', () => {
      const form = document.getElementById('manual-q-form')!
      form.classList.toggle('hidden')
    })
    document.getElementById('manual-q-close')?.addEventListener('click', () => {
      document.getElementById('manual-q-form')!.classList.add('hidden')
    })
    const syncManualOpts = () => {
      const type = (document.getElementById('manual-q-type') as HTMLSelectElement).value
      const opts = document.getElementById('manual-q-options')!
      opts.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'
      document.getElementById('manual-add-opt')!.style.display = (type === 'multiple_choice') ? '' : 'none'
      if (type === 'true_false') {
        opts.innerHTML = `
          <div class="manual-opt-row flex gap-2 items-center">
            <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">V.</span>
            <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" value="Verdadero" readonly />
            <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
              <input type="radio" name="manual-opt-correct" value="0" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
            </label>
          </div>
          <div class="manual-opt-row flex gap-2 items-center">
            <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">F.</span>
            <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" value="Falso" readonly />
            <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
              <input type="radio" name="manual-opt-correct" value="1" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
            </label>
          </div>`
      } else if (type === 'multiple_choice') {
        opts.innerHTML = `
          <div class="manual-opt-row flex gap-2 items-center">
            <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">A.</span>
            <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción A" />
            <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
              <input type="radio" name="manual-opt-correct" value="0" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
            </label>
            <button type="button" class="manual-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition hidden">&times;</button>
          </div>
          <div class="manual-opt-row flex gap-2 items-center">
            <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">B.</span>
            <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción B" />
            <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
              <input type="radio" name="manual-opt-correct" value="1" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
            </label>
            <button type="button" class="manual-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition hidden">&times;</button>
          </div>`
        }
      }
    document.getElementById('manual-q-type')?.addEventListener('change', syncManualOpts)
    syncManualOpts()
    document.getElementById('manual-add-opt')?.addEventListener('click', () => {
      const opts = document.getElementById('manual-q-options')!
      const count = opts.querySelectorAll('.manual-opt-row').length
      const letter = String.fromCharCode(65 + count)
      opts.insertAdjacentHTML('beforeend', `
        <div class="manual-opt-row flex gap-2 items-center">
          <span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">${letter}.</span>
          <input type="text" class="manual-opt-text flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción ${letter}" />
          <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
            <input type="radio" name="manual-opt-correct" value="${count}" class="manual-opt-correct h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
          </label>
          <button type="button" class="manual-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition">&times;</button>
        </div>`)
    })
    document.getElementById('manual-q-options')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.manual-opt-remove') as HTMLElement
      if (!btn) return
      const row = btn.closest('.manual-opt-row') as HTMLElement
      const container = row?.closest('#manual-q-options') as HTMLElement
      if (container && container.querySelectorAll('.manual-opt-row').length > 2) row.remove()
    })
    function showError(msg: string) {
      const el = document.getElementById('manual-q-error')!
      el.textContent = msg; el.classList.remove('hidden')
    }

    document.getElementById('manual-q-save')?.addEventListener('click', () => {
      const stem = (document.getElementById('manual-q-text') as HTMLInputElement).value.trim()
      if (!stem) { showError('Escribe el texto de la pregunta'); return }
      const type = (document.getElementById('manual-q-type') as HTMLSelectElement).value
      const points = parseFloat((document.getElementById('manual-q-points') as HTMLInputElement).value) || 5
      const options: any[] = []
      if (type === 'multiple_choice' || type === 'true_false') {
        const rows = [].slice.call(document.querySelectorAll('#manual-q-options .manual-opt-row'))
        let hasCorrect = false
        for (let oi = 0; oi < rows.length; oi++) {
          const inp = (rows[oi] as HTMLElement).querySelector('.manual-opt-text') as HTMLInputElement
          if (!inp) continue
          const text = inp.value.trim()
          const radio = (rows[oi] as HTMLElement).querySelector('.manual-opt-correct') as HTMLInputElement
          if (text) {
            options.push({ text, correct: radio?.checked || false })
            if (radio?.checked) hasCorrect = true
          }
        }
        if (options.length < 2) { showError('Agrega al menos 2 opciones'); return }
        if (!hasCorrect) { showError('Selecciona una opción correcta'); return }
      }
      { const _ax = (window as any)._eq; if (Array.isArray(_ax)) _ax[_ax.length] = { stem, type, points, options } }
      // Reset form
      (document.getElementById('manual-q-text') as HTMLInputElement).value = ''
      ;(document.getElementById('manual-q-points') as HTMLInputElement).value = '5'
      const typeSelect = document.getElementById('manual-q-type') as HTMLSelectElement
      typeSelect.value = 'multiple_choice'
      typeSelect.dispatchEvent(new Event('change'))
      document.getElementById('manual-q-error')!.classList.add('hidden')
      document.getElementById('manual-q-form')!.classList.add('hidden')
      rq()
      toast('success', 'Pregunta agregada')
    })

    document.getElementById('manual-questions-list')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.remove-manual-q') as HTMLElement
      if (!btn) return
      const idx = parseInt(btn.getAttribute('data-idx') || '')
      if (idx >= 0 && idx < (window as any)._eq.length) {
        (window as any)._eq.splice(idx, 1)
        rq()
      }
    })

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

      let qErrors = 0
      for (let qi = 0; qi < (window as any)._eq.length; qi++) {
        const q = (window as any)._eq[qi]
        const { data: question, error: qErr } = await supabase.from('questions').insert({
          course_id: id, type: q.type, stem: q.stem, points: q.points,
        }).select().maybeSingle()
        if (qErr || !question) { console.error('Error creating question:', qErr); qErrors++; continue }
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          for (let oi = 0; oi < q.options.length; oi++) {
            await supabase.from('question_options').insert({
              question_id: question.id, text: q.options[oi].text,
              is_correct: q.options[oi].correct, order_num: oi,
            })
          }
        }
        await supabase.from('exam_questions').insert({
          exam_id: newExam.id, question_id: question.id, order_num: qi, points: q.points,
        })
      }

      const createdCount = (window as any)._eq.length - qErrors
      const msg = createdCount > 0
        ? `Examen creado con ${createdCount} preguntas${qErrors > 0 ? ` (${qErrors} fallaron)` : ''}`
        : 'Error: ninguna pregunta pudo crearse'
      toast(qErrors > 0 && createdCount === 0 ? 'error' : 'success', msg)
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

    // ── Paste full exam ──
    document.getElementById('paste-full-exam-btn')?.addEventListener('click', () => {
      const area = document.getElementById('paste-full-exam-area')!
      area.classList.toggle('hidden')
    })
    document.getElementById('cancel-full-exam-btn')?.addEventListener('click', () => {
      const area = document.getElementById('paste-full-exam-area')!
      area.classList.add('hidden')
      area.querySelector('textarea')!.value = ''
    })
    document.getElementById('apply-full-exam-btn')?.addEventListener('click', async () => {
      const area = document.getElementById('paste-full-exam-area')!
      const textarea = area.querySelector('textarea') as HTMLTextAreaElement
      if (!textarea?.value?.trim()) return
      const parsed = parseFullExam(textarea.value)
      if (!parsed.title) { toast('error', 'No se pudo detectar el título del examen'); return }
      const payload: Record<string, any> = {
        course_id: id, title: parsed.title, description: parsed.description,
        passing_score: parsed.passingScore || 60, time_limit: parsed.timeLimit || null,
        max_attempts: 1, weight: 0, is_published: false, shuffle: false,
        eval_type: 'exam', is_active: true,
      }
      const { data: newExam, error: examErr } = await supabase.from('exams').insert(payload).select().maybeSingle()
      if (examErr || !newExam) { toast('error', examErr?.message || 'Error al crear examen'); return }
      let qErrors = 0, qSaved = 0
      for (let qi = 0; qi < parsed.questions.length; qi++) {
        const q = parsed.questions[qi]
        const { data: question, error: qErr } = await supabase.from('questions').insert({
          course_id: id, type: q.type, stem: q.stem, points: q.points || 5,
        }).select().maybeSingle()
        if (qErr || !question) { console.error('Error creating question:', qErr, 'stem:', q.stem); qErrors++; continue }
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          for (let oi = 0; oi < q.options.length; oi++) {
            await supabase.from('question_options').insert({
              question_id: question.id, text: q.options[oi].text,
              is_correct: q.options[oi].correct, order_num: oi,
            })
          }
        }
        await supabase.from('exam_questions').insert({
          exam_id: newExam.id, question_id: question.id, order_num: qi, points: q.points || 5,
        })
        qSaved++
      }
      area.classList.add('hidden')
      textarea.value = ''
      const total = parsed.questions.length
      const msg = qSaved > 0
        ? `Examen creado con ${qSaved} preguntas${qErrors > 0 ? ` (${qErrors} fallaron)` : ''}`
        : 'Error: ninguna pregunta pudo crearse'
      toast(qErrors > 0 && qSaved === 0 ? 'error' : 'success', msg)
      if (qErrors > 0) console.warn('Paste exam: questions saved:', qSaved, 'errors:', qErrors)
      initCoachExams()
    })

    function parseFullExam(text: string): {
      title: string; description: string; passingScore: number | null; timeLimit: number | null
      questions: { stem: string; type: string; points: number; options: { text: string; correct: boolean }[] }[]
    } {
      const lines = text.split('\n')
      const result = {
        title: '', description: '', passingScore: null as number | null, timeLimit: null as number | null,
        questions: [] as { stem: string; type: string; points: number; options: { text: string; correct: boolean }[] }[]
      }
      let currentQuestion: any = null
      const descParts: string[] = []
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        if (!result.title) {
          result.title = line.replace(/^w/i, '').replace(/^Examen\s*/i, '').trim()
          if (!result.title) result.title = line
          continue
        }
        if (line.startsWith('Objetivo:') || line.startsWith('Duración:') || line.startsWith('Nota mínima')) {
          descParts.push(line)
          const scoreM = line.match(/Nota\s*m[íi]nima[^:]*:\s*(\d+)/i)
          if (scoreM) result.passingScore = parseInt(scoreM[1])
          const timeM = line.match(/Duraci[óo]n[^:]*:\s*(\d+)/i)
          if (timeM) result.timeLimit = parseInt(timeM[1])
          continue
        }
        if (/^Secci[óo]n\s+\d+/i.test(line)) { descParts.push(line); continue }
        const qMatch = line.match(/^(\d+)[\.\)]\s*(.+)/)
        if (qMatch) {
          if (currentQuestion) {
            if (currentQuestion.options.length === 0) currentQuestion.type = 'open_ended'
            if (currentQuestion.stem) result.questions.push(currentQuestion)
          }
          currentQuestion = { stem: qMatch[2].trim(), type: 'multiple_choice', points: 5, options: [] }
          continue
        }
        const optMatch = line.match(/^([a-z])[\.\)]\s*(.+?)(?:\s*✅)?$/)
        if (optMatch && currentQuestion) {
          currentQuestion.options.push({ text: optMatch[2].trim(), correct: line.includes('✅') })
          continue
        }
        if (/pregunta\s+abierta/i.test(line) && currentQuestion) {
          currentQuestion.type = 'open_ended'; continue
        }
        if (currentQuestion) {
          currentQuestion.stem += ' ' + line
        } else {
          descParts.push(line)
        }
      }
      if (currentQuestion) {
        if (currentQuestion.options.length === 0) currentQuestion.type = 'open_ended'
        if (currentQuestion.stem) result.questions.push(currentQuestion)
      }
      result.description = descParts.join('\n')
      return result
    }

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
                    <p class="text-sm text-white">${escapeHtml(q.stem || '')}</p>
                    <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">${typeLabels[q.type] || q.type}</span>
                    <span class="text-xs text-zinc-500">${eq.points} pts</span>
                  </div>
                  ${qOpts.length > 0 ? `
                    <div class="mt-2 space-y-1 pl-4">
                      ${qOpts.map((o: any, oi: number) => `
                        <div class="flex items-center gap-2 text-xs ${o.is_correct ? 'text-green-400 font-medium' : 'text-zinc-500'}">
                          <span class="w-4 text-right">${String.fromCharCode(65 + oi)}.</span>
                          <span>${escapeHtml(o.text)}</span>
                          ${o.is_correct ? `<span class="text-green-400">${Icon('checkCircle', 10)}</span>` : ''}
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
      const { data: allQuestions } = await supabase.from('questions').select('id, stem, type').order('created_at', { ascending: false })
      const existingQIds = new Set((eqs ?? []).map((eq: any) => eq.question_id))
      for (const q of allQuestions ?? []) {
        if (existingQIds.has(q.id)) continue
        const label = (q.stem || '').slice(0, 80)
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

    // ── Answers modal ──
    const aModal = document.getElementById('answers-modal')!
    const aList = document.getElementById('answers-list')!
    const aExamIdInput = document.getElementById('answers-exam-id') as HTMLInputElement

    async function loadExamAnswers(examId: string) {
      aList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
      if (!attempts || attempts.length === 0) {
        aList.innerHTML = '<p class="text-sm text-zinc-500">No hay respuestas aún.</p>'
        return
      }
      const enrollIds = [...new Set(attempts.map(a => a.enrollment_id))]
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('id, profile_id')
        .in('id', enrollIds.length > 0 ? enrollIds : ['none'])
      const profileIds = [...new Set((enrollmentsData ?? []).map(e => e.profile_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, riot_id, social_discord')
        .in('id', profileIds.length > 0 ? profileIds : ['none'])
      const profileMap: Record<string, any> = {}
      for (const p of profilesData ?? []) profileMap[p.id] = p
      const profByEnroll: Record<string, any> = {}
      for (const e of enrollmentsData ?? []) {
        profByEnroll[e.id] = profileMap[e.profile_id] || {}
      }
      const attemptIds = attempts.map(a => a.id)
      const { data: answersRaw } = await supabase
        .from('student_answers')
        .select('*')
        .in('attempt_id', attemptIds.length > 0 ? attemptIds : ['none'])
      const qIds = [...new Set((answersRaw ?? []).map(a => a.question_id))]
      const { data: questionsRaw } = await supabase
        .from('questions')
        .select('*, question_options(*)')
        .in('id', qIds.length > 0 ? qIds : ['none'])
      const answersByAtt: Record<string, any[]> = {}
      for (const a of answersRaw ?? []) {
        if (!answersByAtt[a.attempt_id]) answersByAtt[a.attempt_id] = []
        answersByAtt[a.attempt_id].push(a)
      }
      const qMap: Record<string, any> = {}
      for (const q of questionsRaw ?? []) qMap[q.id] = q
      aList.innerHTML = attempts.map((att: any) => {
        const answers = answersByAtt[att.id] || []
        const prof = profByEnroll[att.enrollment_id] || {}
        const displayName = [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Unknown'
        const attId = att.id
        return `
          <div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
            <div class="flex items-center justify-between cursor-pointer" onclick="var m=document.getElementById('answers-modal');if(m)m.classList.add('hidden');location.hash='#/coaches/courses/${escapeHtml(id)}/exams/${escapeHtml(examId)}/attempt/${escapeHtml(attId)}'">
              <div class="flex items-center gap-2">
                ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" class="h-6 w-6 rounded-full object-cover" />` : ''}
                <span class="text-sm font-medium text-white hover:text-[#8B5CF6] transition">${escapeHtml(displayName)}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-zinc-400">Intento ${att.attempt_num}</span>
                <span class="text-xs ${att.score !== null ? 'text-green-400' : 'text-yellow-400'}">${att.score !== null ? att.score + '%' : 'Pendiente'}</span>
                <span class="rounded px-2 py-0.5 text-[10px] ${att.status === 'graded' ? 'bg-green-500/20 text-green-400' : att.status === 'submitted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'}">${att.status}</span>
              </div>
            </div>
            <div id="answers-${escapeHtml(attId)}" class="space-y-2 mt-3 hidden">
              ${answers.map((sa: any, idx: number) => {
                const q = qMap[sa.question_id] || {}
                const opts = q.question_options || []
                const isMC = q.type === 'multiple_choice' || q.type === 'true_false'
                return `
                  <div class="rounded border border-zinc-800 bg-zinc-900/30 p-2">
                    <div class="flex items-start gap-2 text-xs">
                      <span class="text-[#8B5CF6] font-medium shrink-0">${idx + 1}.</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-white">${escapeHtml(q.stem || '')}</p>
                        ${isMC ? `
                          <div class="mt-1 space-y-0.5">
                            ${opts.map((o: any) => {
                              const isSelected = sa.selected_option === o.id
                              const isCorrect = o.is_correct
                              let cls = 'text-zinc-500'
                              if (isSelected && isCorrect) cls = 'text-green-400'
                              else if (isSelected && !isCorrect) cls = 'text-red-400'
                              else if (isCorrect) cls = 'text-green-400/60'
                              return `<div class="${cls} flex items-center gap-1">
                                <span>${String.fromCharCode(65 + o.order_num)}.</span>
                                <span>${escapeHtml(o.text)}</span>
                                ${isSelected ? '<span class="text-[10px]">✓</span>' : ''}
                              </div>`
                            }).join('')}
                          </div>
                        ` : `
                          <div class="mt-1">
                            <span class="text-zinc-400">Respuesta: </span>
                            <span class="text-white">${escapeHtml(sa.text_answer || '(sin respuesta)')}</span>
                          </div>
                        `}
                        ${(q.type === 'open_ended' || q.type === 'short_answer') ? `
                          <div class="mt-2 flex items-center gap-2" data-sa-id="${sa.id}">
                            <input type="number" class="grade-score w-20 rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="0-100" min="0" max="100" step="0.5" value="${sa.score !== null ? sa.score : ''}" />
                            <span class="score-hint text-xs ${sa.score !== null ? (sa.score === 0 ? 'text-red-400' : sa.score < 40 ? 'text-yellow-400' : 'text-green-400') : 'text-zinc-600'}">${sa.score !== null ? (sa.score === 0 ? 'Incorrecto' : sa.score < 40 ? 'Mediocre' : 'Correcto') : '—'}</span>
                            <button type="button" class="grade-save-btn text-[10px] text-[#8B5CF6] hover:text-[#7C3AED] transition">${sa.score !== null ? 'Actualizar' : 'Guardar'}</button>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>`
              }).join('')}
              ${att.status === 'submitted' ? `
                <div class="flex items-center gap-2 border-t border-zinc-800 pt-3">
                  <button type="button" class="mark-graded-btn rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]" data-attempt-id="${att.id}">Marcar como revisado</button>
                </div>
              ` : ''}
            </div>
          </div>`
      }).join('')
    }

    document.querySelectorAll('.exam-answers-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
        if (!examId) return
        aExamIdInput.value = examId
        const examTitle = (btn as HTMLElement).closest('.exam-item')?.querySelector('h3')?.textContent || 'Respuestas del examen'
        document.getElementById('answers-modal-title')!.textContent = `Respuestas: ${examTitle}`
        aModal.classList.remove('hidden')
        await loadExamAnswers(examId)
      })
    })

    document.getElementById('close-answers-modal')?.addEventListener('click', () => {
      aModal.classList.add('hidden')
    })

    aModal.addEventListener('click', (e) => {
      if (e.target === aModal) aModal.classList.add('hidden')
    })

    // Grade save (delegated)
    aList.addEventListener('click', async (e) => {
      const saveBtn = (e.target as HTMLElement).closest('.grade-save-btn') as HTMLElement
      if (!saveBtn) return
      const container = saveBtn.closest('[data-sa-id]') as HTMLElement
      const saId = container?.getAttribute('data-sa-id')
      const scoreInput = container?.querySelector<HTMLInputElement>('.grade-score')
      if (!saId) return
      const score = parseFloat(scoreInput?.value || '0')
      if (isNaN(score) || score < 0 || score > 100) { toast('error', 'La nota debe ser entre 0 y 100'); return }
      const isCorrect = score > 0
      const { error } = await supabase.from('student_answers').update({ is_correct: isCorrect, score }).eq('id', saId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Calificación guardada')
      await recalcExamScore(saId)
      await loadExamAnswers(aExamIdInput.value)
    })

    // Mark graded (delegated)
    aList.addEventListener('click', async (e) => {
      const gradeBtn = (e.target as HTMLElement).closest('.mark-graded-btn') as HTMLElement
      if (!gradeBtn) return
      const attemptId = gradeBtn.getAttribute('data-attempt-id')
      if (!attemptId) return
      const { error } = await supabase.from('exam_attempts').update({ status: 'graded' }).eq('id', attemptId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Intento marcado como revisado')
      await loadExamAnswers(aExamIdInput.value)
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
        const optRows: NodeListOf<HTMLElement> = document.querySelectorAll('#quick-options-list .q-opt-row')
        for (let oi = 0; oi < optRows.length; oi++) {
          const row = optRows[oi]
          const optText = row.querySelector<HTMLInputElement>('input[name="option_text"]')?.value
          const optRadio = row.querySelector<HTMLInputElement>('.correct-radio')
          const optCorrect = optRadio?.checked
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

    function createQuickOptRow(idx: number, placeholder = '', fixed = false): string {
      const readonlyAttr = fixed ? ' readonly' : ''
      const valAttr = fixed ? ` value="${escapeHtml(placeholder)}"` : ''
      const letter = !fixed ? `<span class="text-xs font-medium text-zinc-500 w-5 text-right shrink-0">${String.fromCharCode(65 + idx)}.</span>` : ''
      return `<div class="q-opt-row flex gap-2 items-center">
        ${letter}
        <input type="text" name="option_text" placeholder="${escapeHtml(placeholder)}"${valAttr}${readonlyAttr}
          class="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" />
        <label class="flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap cursor-pointer shrink-0">
          <input type="radio" name="option_correct" value="${idx}"
            class="correct-radio h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta
        </label>
        ${fixed ? '' : '<button type="button" class="q-opt-remove shrink-0 text-zinc-600 hover:text-red-400 transition">&times;</button>'}
      </div>`
    }

    function updateOptionsVisibility() {
      const type = typeSelect?.value || 'multiple_choice'
      const container = document.getElementById('quick-options-container')!
      container.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'
      if (type === 'true_false' && quickOptsList) {
        quickOptsList.innerHTML = createQuickOptRow(0, 'Verdadero', true) + createQuickOptRow(1, 'Falso', true)
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
      if (quickOptsList && quickOptsList.querySelectorAll('.q-opt-row').length > 1) {
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

export function renderCoachExamAttempt(): string {
  return `<div id="exam-attempt-content">${Spinner()}</div>`
}

export async function initCoachExamAttempt(): Promise<void> {
  const params = router.getParams()
  const courseId = params.id, examId = params.examId, attemptId = params.attemptId
  if (!examId || !attemptId) {
    document.getElementById('exam-attempt-content')!.innerHTML = '<p class="text-zinc-500">Parámetros inválidos</p>'
    return
  }
  await loadAttempt(examId, attemptId, courseId || '')
}

export async function initCoachExamAttemptStandalone(): Promise<void> {
  const params = router.getParams()
  const examId = params.examId, attemptId = params.attemptId
  if (!examId || !attemptId) { document.getElementById('exam-attempt-content')!.innerHTML = '<p class="text-zinc-500">Parámetros inválidos</p>'; return }
  await loadAttempt(examId, attemptId, '')
}

async function loadAttempt(examId: string, attemptId: string, courseId: string): Promise<void> {
  const { data: attempt } = await supabase.from('exam_attempts').select('*').eq('id', attemptId).maybeSingle()
  if (!attempt) { document.getElementById('exam-attempt-content')!.innerHTML = '<p class="text-zinc-500">Intento no encontrado</p>'; return }
  const { data: enroll } = await supabase.from('enrollments').select('profile_id').eq('id', attempt.enrollment_id).maybeSingle()
  let prof: any = {}
  if (enroll?.profile_id) {
    const { data: p } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord').eq('id', enroll.profile_id).maybeSingle()
    if (p) prof = p
  }
  const { data: answers } = await supabase.from('student_answers').select('*').eq('attempt_id', attemptId)
  const qIds = [...new Set((answers ?? []).map(a => a.question_id))]
  const { data: questions } = await supabase.from('questions').select('*, question_options(*)').in('id', qIds.length ? qIds : ['none'])
  const qMap: Record<string, any> = {}
  for (const q of questions ?? []) qMap[q.id] = q
  const html = `
    <div class="mb-6">
      <a href="${courseId ? '#/coaches/courses/' + escapeHtml(courseId) + '/exams' : '#/coaches/exams'}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Volver a exámenes</a>
      <div class="flex items-center gap-3 mb-4">
        ${prof.avatar_url ? `<img src="${escapeHtml(prof.avatar_url)}" class="h-10 w-10 rounded-full object-cover" />` : ''}
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml([prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Unknown')}</h1>
          <p class="text-sm text-zinc-500">Intento ${attempt.attempt_num} · ${attempt.score !== null ? attempt.score + '%' : 'Pendiente'} · <span class="rounded px-2 py-0.5 text-[10px] ${attempt.status === 'graded' ? 'bg-green-500/20 text-green-400' : attempt.status === 'submitted' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-500/20 text-zinc-400'}">${attempt.status}</span></p>
        </div>
      </div>
      <div class="mb-4 flex items-center gap-3">
        <label class="text-sm text-zinc-400">Nota general:</label>
        <input type="number" id="overall-score-input" class="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" min="0" max="100" step="0.01" value="${attempt.score !== null ? attempt.score : ''}" placeholder="—" />
        <span class="text-sm text-zinc-500">%</span>
        <button type="button" id="save-overall-score" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">Guardar nota</button>
      </div>
    </div>
    <div class="space-y-4">
      ${(answers ?? []).map((sa: any, idx: number) => {
        const q = qMap[sa.question_id] || {}
        const opts = q.question_options || []
        const isMC = q.type === 'multiple_choice' || q.type === 'true_false'
        return `
          <div class="glass rounded-xl p-4">
            <div class="flex items-start gap-3">
              <span class="text-sm font-bold text-[#8B5CF6] shrink-0">${idx + 1}.</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white mb-2">${escapeHtml(q.stem || '')}</p>
                ${isMC ? `
                  <div class="space-y-1">
                    ${opts.map((o: any) => {
                      const isSelected = sa.selected_option === o.id
                      const isCorrect = o.is_correct
                      let cls = 'text-sm'
                      if (isSelected && isCorrect) cls += ' text-green-400 font-medium'
                      else if (isSelected && !isCorrect) cls += ' text-red-400'
                      else if (isCorrect) cls += ' text-green-400/60'
                      else cls += ' text-zinc-500'
                      return `<div class="${cls} flex items-center gap-2">
                        <span class="w-5 text-right shrink-0">${String.fromCharCode(65 + o.order_num)}.</span>
                        <span>${escapeHtml(o.text)}</span>
                        ${isSelected ? `<span class="text-[10px]">${Icon('checkCircle', 10)}</span>` : ''}
                      </div>`
                    }).join('')}
                  </div>
                ` : `
                  <div class="rounded-lg bg-zinc-900/50 p-3 text-sm text-white">${escapeHtml(sa.text_answer || '(sin respuesta)')}</div>
                `}
                ${(q.type === 'open_ended' || q.type === 'short_answer') ? `
                  <div class="mt-3 flex items-center gap-2" data-sa-id="${sa.id}">
                    <input type="number" class="grade-score w-24 rounded border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="0-100" min="0" max="100" step="0.5" value="${sa.score !== null ? sa.score : ''}" />
                    <span class="score-hint text-xs ${sa.score !== null ? (sa.score === 0 ? 'text-red-400' : sa.score < 40 ? 'text-yellow-400' : 'text-green-400') : 'text-zinc-600'}">${sa.score !== null ? (sa.score === 0 ? 'Incorrecto' : sa.score < 40 ? 'Mediocre' : 'Correcto') : '—'}</span>
                    <button type="button" class="grade-save-btn text-xs text-[#8B5CF6] hover:text-[#7C3AED] transition">${sa.score !== null ? 'Actualizar' : 'Guardar'}</button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>`
      }).join('')}
    </div>
    ${attempt.status === 'submitted' ? `
      <div class="mt-6">
        <button type="button" id="mark-graded-page-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">Marcar como revisado</button>
      </div>
    ` : ''}`
  document.getElementById('exam-attempt-content')!.innerHTML = html

  document.getElementById('exam-attempt-content')?.addEventListener('click', async (e) => {
    const saveBtn = (e.target as HTMLElement).closest('.grade-save-btn') as HTMLElement
    if (!saveBtn) return
    const container = saveBtn.closest('[data-sa-id]') as HTMLElement
    const saId = container?.getAttribute('data-sa-id')
    const scoreInput = container?.querySelector<HTMLInputElement>('.grade-score')
    if (!saId) return
    const score = parseFloat(scoreInput?.value || '0')
    if (isNaN(score) || score < 0 || score > 100) { toast('error', 'La nota debe ser entre 0 y 100'); return }
    const isCorrect = score > 0
    const { error } = await supabase.from('student_answers').update({ is_correct: isCorrect, score }).eq('id', saId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Calificación guardada')
      await recalcExamScore(saId)
      initCoachExamAttempt()
    })

  const gradeBtn = document.getElementById('mark-graded-page-btn')
  if (gradeBtn) {
    gradeBtn.addEventListener('click', async () => {
      const { error } = await supabase.from('exam_attempts').update({ status: 'graded' }).eq('id', attemptId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Intento marcado como revisado')
      initCoachExamAttempt()
    })
  }

  const overallBtn = document.getElementById('save-overall-score')
  if (overallBtn) {
    overallBtn.addEventListener('click', async () => {
      const inp = document.getElementById('overall-score-input') as HTMLInputElement
      const val = parseFloat(inp?.value)
      if (isNaN(val) || val < 0 || val > 100) { toast('error', 'La nota debe ser entre 0 y 100'); return }
      const { error } = await supabase.from('exam_attempts').update({ score: val }).eq('id', attemptId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Nota general actualizada')
      const { data: att } = await supabase.from('exam_attempts').select('enrollment_id').eq('id', attemptId).maybeSingle()
      if (att?.enrollment_id) {
        const { recalcFinalGrade, checkAutoPromotion } = await import('@/b3b32a/8abf18/grade_utils')
        await recalcFinalGrade(att.enrollment_id)
        const { data: enr } = await supabase.from('enrollments').select('course_id, profile_id').eq('id', att.enrollment_id).maybeSingle()
        if (enr) await checkAutoPromotion(att.enrollment_id, enr.course_id, enr.profile_id)
      }
      initCoachExamAttempt()
    })
  }
}

async function recalcExamScore(saId: string): Promise<void> {
  const { data: sa } = await supabase.from('student_answers').select('attempt_id').eq('id', saId).maybeSingle()
  if (!sa) return
  const { data: answers } = await supabase
    .from('student_answers')
    .select('score')
    .eq('attempt_id', sa.attempt_id)
    .not('score', 'is', null)
  if (!answers || answers.length === 0) return
  const total = answers.reduce((s: number, a: any) => s + (a.score || 0), 0)
  const avg = Math.round(total / answers.length)
  await supabase.from('exam_attempts').update({ score: avg }).eq('id', sa.attempt_id)
  // Also recalc enrollment final grade
  const { data: attempt } = await supabase.from('exam_attempts').select('enrollment_id').eq('id', sa.attempt_id).maybeSingle()
  if (attempt?.enrollment_id) {
    const { recalcFinalGrade, checkAutoPromotion } = await import('@/b3b32a/8abf18/grade_utils')
    await recalcFinalGrade(attempt.enrollment_id)
    const { data: enr } = await supabase.from('enrollments').select('course_id, profile_id').eq('id', attempt.enrollment_id).maybeSingle()
    if (enr) await checkAutoPromotion(attempt.enrollment_id, enr.course_id, enr.profile_id)
  }
}
