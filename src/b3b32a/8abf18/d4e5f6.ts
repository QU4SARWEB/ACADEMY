import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachExamsOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

export async function initCoachExamsOverview(): Promise<void> {
  try {
    const { data: allCourses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courses = allCourses ?? []
    let selectedCourseId = ''

    async function render(courseId: string) {
      const { data: exams } = courseId
        ? await supabase.from('exams').select('*, course_modules(name)').eq('course_id', courseId).order('created_at', { ascending: false })
        : await supabase.from('exams').select('*, course_modules(name), courses!inner(name)').order('created_at', { ascending: false })

      const { data: modules } = courseId
        ? await supabase.from('course_modules').select('id, name').eq('course_id', courseId).order('display_order')
        : { data: [] }

      const { data: allQ } = await supabase.from('exam_questions').select('exam_id, question_id')
      const qCountByExam: Record<string, number> = {}
      for (const eq of allQ ?? []) {
        if (!qCountByExam[eq.exam_id]) qCountByExam[eq.exam_id] = 0
        qCountByExam[eq.exam_id]++
      }

      const modalsHtml = `
      <div id="qs-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
        <div class="glass max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-xl p-6">
          <div class="flex items-center justify-between mb-4"><h2 class="font-heading text-lg font-bold text-white" id="qs-modal-title">Preguntas</h2><button id="close-qs-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button></div>
          <input type="hidden" id="qs-exam-id">
          <div id="qs-list" class="space-y-3 mb-6"></div>
          <div class="border-t border-zinc-700 pt-4">
            <h3 class="mb-3 font-medium text-white text-sm">Agregar pregunta existente</h3>
            <div class="flex gap-2"><select id="qs-add-select" class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></select><button id="qs-add-btn" class="rounded-lg bg-[#8B5CF6] px-3 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Agregar</button></div>
          </div>
          <div class="border-t border-zinc-700 pt-4 mt-4">
            <h3 class="mb-3 font-medium text-white text-sm">Crear nueva pregunta</h3>
            <form id="qs-form" class="space-y-3">
              <input type="hidden" name="examId">
              <div><textarea name="text" rows="2" required placeholder="Texto de la pregunta..." class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
              <div class="flex gap-2">
                <select name="type" required class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="multiple_choice">Opción múltiple</option><option value="true_false">V/F</option><option value="open_ended">Desarrollo</option><option value="short_answer">Corta</option>
                </select>
                <input name="points" type="number" step="0.5" value="5" class="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              </div>
              <div id="qs-opts-container">
                <p class="text-xs text-zinc-500 mb-2">Opciones</p>
                <div id="qs-opts-list" class="space-y-2">
                  <div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">A.</span><input type="text" name="opt_text" placeholder="Opción A" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div>
                  <div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">B.</span><input type="text" name="opt_text" placeholder="Opción B" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div>
                </div>
                <button type="button" id="qs-add-opt" class="mt-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button>
              </div>
              <p id="qs-error" class="hidden text-xs text-red-400"></p>
              <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Crear y agregar</button>
            </form>
          </div>
        </div>
      </div>

      <div id="ans-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
        <div class="glass max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
          <div class="flex items-center justify-between mb-4"><h2 class="font-heading text-lg font-bold text-white" id="ans-modal-title">Respuestas</h2><button id="close-ans-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button></div>
          <input type="hidden" id="ans-exam-id">
          <div id="ans-list" class="space-y-4"></div>
        </div>
      </div>`

      let html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Exámenes</h1>
          <p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes${courseId ? ' en ' + (courses.find((c: any) => c.id === courseId)?.name || '') : ' en todos los cursos'}</p>
        </div>
        <div class="flex items-center gap-3">
          <select id="exam-course-filter" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Todos los cursos</option>
            ${courses.map((c: any) => '<option value="' + c.id + '" ' + (c.id === courseId ? 'selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('')}
          </select>
          <button id="add-exam-btn" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nuevo examen</button>
        </div>
      </div>

      <div id="new-exam-form" class="hidden mb-6 glass rounded-xl p-6">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Crear nuevo examen</h2>
        <form id="create-exam-form" class="space-y-3">
          <div><label class="mb-1 block text-sm text-zinc-400">Curso</label>
            <select name="course_id" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              ${courses.map((c: any) => '<option value="' + c.id + '" ' + (c.id === (courseId || courses[0]?.id) ? 'selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('')}
            </select>
          </div>
          <div><label class="mb-1 block text-sm text-zinc-400">Título</label><input name="title" required maxlength="200" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          <div><label class="mb-1 block text-sm text-zinc-400">Descripción</label><textarea name="description" rows="2" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="mb-1 block text-sm text-zinc-400">Módulo</label>
              <select name="module_id" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">— Sin módulo —</option>
                ${(modules ?? []).map((m: any) => '<option value="' + m.id + '">' + escapeHtml(m.name) + '</option>').join('')}
              </select>
            </div>
            <div><label class="mb-1 block text-sm text-zinc-400">Nota mínima %</label><input name="passing_score" type="number" min="0" max="100" value="60" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="mb-1 block text-sm text-zinc-400">Tiempo (min)</label><input name="time_limit" type="number" min="0" placeholder="Sin límite" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
            <div><label class="mb-1 block text-sm text-zinc-400">Intentos</label><input name="max_attempts" type="number" min="1" value="1" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
            <div><label class="mb-1 block text-sm text-zinc-400">Peso %</label><input name="weight" type="number" min="0" max="100" step="0.01" value="0" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          </div>
          <div><label class="mb-1 block text-sm text-zinc-400">Fecha límite</label><input name="due_date" type="datetime-local" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="mb-1 block text-sm text-zinc-400">Tipo</label>
              <select name="eval_type" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="exam">Examen</option><option value="quiz">Quiz</option><option value="practical">Práctica</option>
              </select>
            </div>
            <div><label class="mb-1 block text-sm text-zinc-400">Mes</label>
              <select name="month" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">— Sin mes —</option>
                ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((n, i) => '<option value="' + (i+1) + '">' + n + '</option>').join('')}
              </select>
            </div>
          </div>
          <div class="border-t border-zinc-700 pt-3">
            <label class="mb-2 block text-sm text-zinc-400">Asignar a</label>
            <div class="flex gap-4 mb-2">
              <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="assign_type" value="course" checked class="h-4 w-4 border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none" onchange="document.getElementById('assign-students').classList.add('hidden')"> <span class="text-sm text-zinc-300">Todo el curso</span></label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="assign_type" value="individual" class="h-4 w-4 border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none" onchange="document.getElementById('assign-students').classList.remove('hidden')"> <span class="text-sm text-zinc-300">Alumnos específicos</span></label>
            </div>
            <div id="assign-students" class="hidden">
              <select name="assigned_students" multiple class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" size="4"></select>
              <p class="mt-1 text-xs text-zinc-500">Ctrl+click para seleccionar varios</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer"><input name="is_published" type="checkbox" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none"> <span class="text-sm text-zinc-400">Publicado</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input name="shuffle" type="checkbox" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none"> <span class="text-sm text-zinc-400">Aleatorio</span></label>
            <label class="flex items-center gap-2 cursor-pointer"><input name="is_active" type="checkbox" checked class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none"> <span class="text-sm text-zinc-400">Activo</span></label>
          </div>
          <p id="exam-error" class="hidden text-sm text-red-400"></p>
          <button type="submit" class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 14)} Crear examen</button>
        </form>
      </div>

      <div class="space-y-3">
        ${(exams ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay exámenes' + (courseId ? ' en este curso' : '') + '.</p>' : (exams ?? []).map((exam: any) => {
          const courseName = exam.courses?.name || courses.find((c: any) => c.id === exam.course_id)?.name || ''
          return '<div class="exam-item glass rounded-xl p-4" data-exam-id="' + exam.id + '"><div class="flex items-start justify-between"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h3 class="font-medium text-white">' + escapeHtml(exam.title) + '</h3>' + (courseId ? '' : '<span class="text-xs text-zinc-500">' + escapeHtml(courseName) + '</span>') + (exam.is_published ? '<span class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Publicado</span>' : '<span class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Borrador</span>') + '</div><p class="mt-1 text-xs text-zinc-500">' + (exam.course_modules?.name ? escapeHtml(exam.course_modules.name) + ' · ' : '') + 'Nota mín: ' + exam.passing_score + '%' + (exam.time_limit ? ' · Tiempo: ' + exam.time_limit + 'min' : '') + (exam.max_attempts ? ' · Intentos: ' + exam.max_attempts : '') + (exam.due_date ? ' · Vence: ' + formatDate(exam.due_date) : '') + '</p></div><div class="flex gap-2 shrink-0 ml-3"><button class="exam-qs-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('bookOpen', 12) + ' Preguntas (' + (qCountByExam[exam.id] || 0) + ')</button><button class="exam-answers-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('users', 12) + ' Respuestas</button><button class="edit-exam-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('edit', 12) + '</button><button class="del-exam-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30">' + Icon('trash', 12) + '</button></div></div><div class="edit-exam-form mt-3 hidden border-t border-zinc-700 pt-3"><form data-exam-id="' + exam.id + '"><div class="grid grid-cols-2 gap-3 mb-3"><div><label class="text-xs text-zinc-400">Título</label><input name="title" value="' + escapeHtml(exam.title) + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Módulo</label><select name="module_id" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"><option value="">— Sin módulo —</option>' + (modules ?? []).map((m: any) => '<option value="' + m.id + '" ' + (m.id === exam.module_id ? 'selected' : '') + '>' + escapeHtml(m.name) + '</option>').join('') + '</select></div></div><div class="grid grid-cols-3 gap-3 mb-3"><div><label class="text-xs text-zinc-400">Nota mín %</label><input name="passing_score" type="number" value="' + (exam.passing_score) + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Tiempo (min)</label><input name="time_limit" type="number" value="' + (exam.time_limit || '') + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Intentos</label><input name="max_attempts" type="number" value="' + (exam.max_attempts) + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div></div><div class="mb-3"><label class="text-xs text-zinc-400">Descripción</label><textarea name="description" rows="2" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]">' + escapeHtml(exam.description || '') + '</textarea></div><div class="flex gap-2"><button type="submit" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white">Guardar</button><button type="button" class="cancel-edit-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancelar</button></div></form></div></div>'
        }).join('')}
      </div>`

      document.getElementById('page-content')!.innerHTML = html + modalsHtml
      bindEvents(courseId)
    }

    async function bindEvents(courseId: string) {
      document.getElementById('exam-course-filter')?.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value
        selectedCourseId = val
        render(val)
      })

      document.getElementById('add-exam-btn')?.addEventListener('click', () => {
        document.getElementById('new-exam-form')?.classList.remove('hidden')
        document.getElementById('assign-students')?.classList.add('hidden')
        document.querySelector<HTMLInputElement>('input[name="assign_type"][value="course"]')!.checked = true
        const courseIdVal = document.querySelector<HTMLSelectElement>('select[name="course_id"]')?.value || selectedCourseId
        loadStudentsForCourse(courseIdVal)
        // Re-fetch modules
        if (courseIdVal) {
          supabase.from('course_modules').select('id, name').eq('course_id', courseIdVal).order('display_order').then(({ data: mods }) => {
            const sel = document.querySelector<HTMLSelectElement>('#create-exam-form select[name="module_id"]')
            if (sel) {
              sel.innerHTML = '<option value="">— Sin módulo —</option>' + (mods ?? []).map((m: any) => '<option value="' + m.id + '">' + escapeHtml(m.name) + '</option>').join('')
            }
          })
        }
      })

      document.querySelector<HTMLSelectElement>('select[name="course_id"]')?.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value
        if (val) loadStudentsForCourse(val)
      })

      document.getElementById('create-exam-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const course_id = fd.get('course_id') as string
        if (!course_id) { showError('Selecciona un curso'); return }
        const payload: Record<string, any> = {
          course_id, title: fd.get('title'), description: fd.get('description'),
          module_id: fd.get('module_id') || null, passing_score: parseFloat(fd.get('passing_score') as string) || 60,
          time_limit: parseInt(fd.get('time_limit') as string) || null, max_attempts: parseInt(fd.get('max_attempts') as string) || 1,
          weight: parseFloat(fd.get('weight') as string) || 0, due_date: fd.get('due_date') || null,
          is_published: fd.get('is_published') === 'on', shuffle: fd.get('shuffle') === 'on',
          eval_type: (fd.get('eval_type') as string) || 'exam', month: fd.get('month') ? parseInt(fd.get('month') as string) : null,
          is_active: fd.get('is_active') === 'on',
        }
        const { data: newExam, error } = await supabase.from('exams').insert(payload).select().maybeSingle()
        if (error || !newExam) { showError(error?.message || 'Error'); return }

        // Handle individual assignments
        if (fd.get('assign_type') === 'individual') {
          const sel = document.querySelector<HTMLSelectElement>('select[name="assigned_students"]')
          if (sel) {
            const ids = Array.from(sel.selectedOptions).map(o => o.value)
            if (ids.length > 0) {
              const rows = ids.map(pid => ({ exam_id: newExam.id, profile_id: pid }))
              await supabase.from('exam_assignments').insert(rows)
            }
          }
        }

        toast('success', 'Examen creado')
        document.getElementById('new-exam-form')?.classList.add('hidden')
        render(selectedCourseId)
      })

      // Edit exam toggle
      document.querySelectorAll('.edit-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const form = (btn as HTMLElement).closest('.exam-item')?.querySelector('.edit-exam-form') as HTMLElement
          if (form) form.classList.toggle('hidden')
        })
      })

      document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const form = (btn as HTMLElement).closest('.edit-exam-form') as HTMLElement
          if (form) form.classList.add('hidden')
        })
      })

      // Update exam
      document.querySelectorAll('.edit-exam-form form').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault()
          const fd = new FormData(e.target as HTMLFormElement)
          const examId = (e.target as HTMLElement).dataset.examId
          if (!examId) return
          const payload: Record<string, any> = {
            title: fd.get('title'), description: fd.get('description'),
            module_id: fd.get('module_id') || null, passing_score: parseFloat(fd.get('passing_score') as string) || 60,
            time_limit: parseInt(fd.get('time_limit') as string) || null, max_attempts: parseInt(fd.get('max_attempts') as string) || 1,
            is_published: fd.get('is_published') === 'on', shuffle: fd.get('shuffle') === 'on',
            is_active: fd.get('is_active') === 'on',
          }
          const { error } = await supabase.from('exams').update(payload).eq('id', examId)
          if (error) { toast('error', error.message); return }
          toast('success', 'Examen actualizado')
          render(selectedCourseId)
        })
      })

      // Delete exam
      document.querySelectorAll('.del-exam-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
          if (!examId || !(await confirmDialog('¿Eliminar este examen? Se eliminarán también los intentos asociados.'))) return
          const { error } = await supabase.from('exams').delete().eq('id', examId)
          if (error) { toast('error', error.message); return }
          toast('success', 'Examen eliminado')
          render(selectedCourseId)
        })
      })

      // Questions modal
      const qsModal = document.getElementById('qs-modal')!
      const qsList = document.getElementById('qs-list')!
      const qsExamId = document.getElementById('qs-exam-id') as HTMLInputElement
      const qsAddSelect = document.getElementById('qs-add-select') as HTMLSelectElement

      async function loadQuestions(examId: string) {
        qsList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'
        const { data: eqs } = await supabase.from('exam_questions').select('*, questions(*)').eq('exam_id', examId).order('order_num')
        const qIds = [...new Set((eqs ?? []).map((eq: any) => eq.question_id))]
        const { data: opts } = await supabase.from('question_options').select('*').in('question_id', qIds.length ? qIds : ['none'])
        const optsByQ: Record<string, any[]> = {}
        for (const o of opts ?? []) { if (!optsByQ[o.question_id]) optsByQ[o.question_id] = []; optsByQ[o.question_id].push(o) }
        if ((eqs ?? []).length === 0) { qsList.innerHTML = '<p class="text-sm text-zinc-500">No hay preguntas.</p>' } else {
          qsList.innerHTML = (eqs ?? []).map((eq: any) => {
            const q = eq.questions; const qOpts = optsByQ[q.id] || []
            return '<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-eq-id="' + eq.id + '"><div class="flex items-start justify-between gap-2"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-xs font-medium text-[#8B5CF6]">' + (eq.order_num + 1) + '.</span><p class="text-sm text-white">' + escapeHtml(q.stem || '') + '</p><span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">' + (q.type || '') + '</span><span class="text-xs text-zinc-500">' + eq.points + ' pts</span></div>' + (qOpts.length > 0 ? '<div class="mt-2 space-y-1 pl-4">' + qOpts.map((o: any) => '<div class="flex items-center gap-2 text-xs ' + (o.is_correct ? 'text-green-400' : 'text-zinc-500') + '"><span class="w-4 text-right">' + String.fromCharCode(65 + o.order_num) + '.</span><span>' + escapeHtml(o.text) + '</span>' + (o.is_correct ? '<span class="text-green-400">' + Icon('checkCircle', 10) + '</span>' : '') + '</div>').join('') + '</div>' : '') + '</div><button class="remove-eq-btn text-zinc-600 hover:text-red-400" data-eq-id="' + eq.id + '">' + Icon('x', 14) + '</button></div></div>'
          }).join('')
        }
        // Load available questions for adding
        qsAddSelect.innerHTML = '<option value="">— Seleccionar —</option>'
        const { data: allQ } = await supabase.from('questions').select('id, stem, type').order('created_at', { ascending: false })
        const existing = new Set((eqs ?? []).map((eq: any) => eq.question_id))
        for (const q of allQ ?? []) { if (!existing.has(q.id)) qsAddSelect.innerHTML += '<option value="' + q.id + '">' + escapeHtml((q.stem || '').slice(0, 80)) + '</option>' }
      }

      document.querySelectorAll('.exam-qs-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
          if (!examId) return; qsExamId.value = examId; qsModal.classList.remove('hidden'); await loadQuestions(examId)
        })
      })

      document.getElementById('close-qs-modal')?.addEventListener('click', () => qsModal.classList.add('hidden'))
      qsModal.addEventListener('click', (e) => { if (e.target === qsModal) qsModal.classList.add('hidden') })

      document.getElementById('qs-add-btn')?.addEventListener('click', async () => {
        const examId = qsExamId.value; const qId = qsAddSelect.value; if (!examId || !qId) return
        const { data: max } = await supabase.from('exam_questions').select('order_num').eq('exam_id', examId).order('order_num', { ascending: false }).limit(1)
        const next = ((max ?? []) as any[]).length > 0 ? (max as any[])[0].order_num + 1 : 0
        await supabase.from('exam_questions').insert({ exam_id: examId, question_id: qId, order_num: next, points: 1 })
        toast('success', 'Pregunta agregada'); await loadQuestions(examId)
      })

      qsList.addEventListener('click', async (e) => {
        const btn = (e.target as HTMLElement).closest('.remove-eq-btn') as HTMLElement
        if (!btn) return; const eqId = btn.getAttribute('data-eq-id'); if (!eqId || !(await confirmDialog('¿Quitar esta pregunta?'))) return
        await supabase.from('exam_questions').delete().eq('id', eqId); toast('success', 'Pregunta quitada'); await loadQuestions(qsExamId.value)
      })

      // Quick question form
      document.getElementById('qs-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const examId = qsExamId.value; const type = fd.get('type') as string; const text = (fd.get('text') as string)?.trim()
        const points = parseFloat(fd.get('points') as string) || 5
        if (!text) { const el = document.getElementById('qs-error')!; el.textContent = 'Escribe el texto'; el.classList.remove('hidden'); return }
        const courseIdVal = document.querySelector<HTMLSelectElement>('select[name="course_id"]')?.value || selectedCourseId || (courses[0]?.id || '')
        const errEl = document.getElementById('qs-error')!
        const { data: newQ, error: qErr } = await supabase.from('questions').insert({ course_id: courseIdVal, type, stem: text, points }).select().maybeSingle()
        if (qErr || !newQ) { errEl.textContent = qErr?.message || 'Error'; errEl.classList.remove('hidden'); return }
        if (type === 'multiple_choice' || type === 'true_false') {
          const rows = document.querySelectorAll('#qs-opts-list .flex')
          for (let oi = 0; oi < rows.length; oi++) {
            const row = rows[oi] as HTMLElement; const optText = (row.querySelector<HTMLInputElement>('input[name="opt_text"]'))?.value?.trim()
            const optRadio = row.querySelector<HTMLInputElement>('input[name="opt_correct"]')
            if (!optText) continue
            await supabase.from('question_options').insert({ question_id: newQ.id, text: optText, is_correct: optRadio?.checked || false, order_num: oi })
          }
        }
        const { data: max2 } = await supabase.from('exam_questions').select('order_num').eq('exam_id', examId).order('order_num', { ascending: false }).limit(1)
        const next2 = ((max2 ?? []) as any[]).length > 0 ? (max2 as any[])[0].order_num + 1 : 0
        await supabase.from('exam_questions').insert({ exam_id: examId, question_id: newQ.id, order_num: next2, points })
        toast('success', 'Pregunta creada'); (document.querySelector<HTMLTextAreaElement>('#qs-form textarea[name="text"]'))!.value = ''
        errEl.classList.add('hidden'); await loadQuestions(examId)
      })

      // Quick options management
      document.getElementById('qs-add-opt')?.addEventListener('click', () => {
        const list = document.getElementById('qs-opts-list')!; const count = list.querySelectorAll('.flex').length
        list.insertAdjacentHTML('beforeend', '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">' + String.fromCharCode(65 + count) + '.</span><input type="text" name="opt_text" placeholder="Opción ' + String.fromCharCode(65 + count) + '" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="' + count + '" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button></div>')
      })

      document.getElementById('qs-opts-list')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.opt-remove') as HTMLElement
        if (!btn) return; const list = document.getElementById('qs-opts-list')!; const row = btn.closest('.flex') as HTMLElement
        if (list.querySelectorAll('.flex').length > 2) row.remove()
      })

      // Sync question type with options
      document.querySelector<HTMLSelectElement>('#qs-form select[name="type"]')?.addEventListener('change', (e) => {
        const type = (e.target as HTMLSelectElement).value
        const container = document.getElementById('qs-opts-container')!; const list = document.getElementById('qs-opts-list')!
        container.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'
        if (type === 'true_false') {
          list.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">V.</span><input type="text" name="opt_text" value="Verdadero" readonly class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">F.</span><input type="text" name="opt_text" value="Falso" readonly class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label></div>'
        } else if (type === 'multiple_choice') {
          list.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">A.</span><input type="text" name="opt_text" placeholder="Opción A" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">B.</span><input type="text" name="opt_text" placeholder="Opción B" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div>'
        }
      })

      // Answers modal
      const ansModal = document.getElementById('ans-modal')!
      const ansList = document.getElementById('ans-list')!
      const ansExamIdInput = document.getElementById('ans-exam-id') as HTMLInputElement

      async function loadAnswers(examId: string) {
        ansList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'
        const { data: attempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).order('submitted_at', { ascending: false, nullsFirst: false })
        if (!attempts || attempts.length === 0) { ansList.innerHTML = '<p class="text-sm text-zinc-500">No hay respuestas aún.</p>'; return }
        const enrollIds = [...new Set(attempts.map(a => a.enrollment_id))]
        const { data: enrolls } = await supabase.from('enrollments').select('id, profile_id').in('id', enrollIds.length > 0 ? enrollIds : ['none'])
        const profIds = [...new Set((enrolls ?? []).map(e => e.profile_id))]
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord').in('id', profIds.length > 0 ? profIds : ['none'])
        const profMap: Record<string, any> = {}; for (const p of profs ?? []) profMap[p.id] = p
        const enrollMap: Record<string, any> = {}; for (const e of enrolls ?? []) enrollMap[e.id] = profMap[e.profile_id] || {}
        const attemptIds = attempts.map(a => a.id)
        const { data: answers } = await supabase.from('student_answers').select('*').in('attempt_id', attemptIds.length > 0 ? attemptIds : ['none'])
        const qIds = [...new Set((answers ?? []).map(a => a.question_id))]
        const { data: questions } = await supabase.from('questions').select('*, question_options(*)').in('id', qIds.length > 0 ? qIds : ['none'])
        const qMap: Record<string, any> = {}; for (const q of questions ?? []) qMap[q.id] = q
        const answersByAtt: Record<string, any[]> = {}; for (const a of answers ?? []) { if (!answersByAtt[a.attempt_id]) answersByAtt[a.attempt_id] = []; answersByAtt[a.attempt_id].push(a) }
        ansList.innerHTML = attempts.map((att: any) => {
          const prof = enrollMap[att.enrollment_id] || {}
          const displayName = [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Unknown'
          return '<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"><div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2">' + (prof.avatar_url ? '<img src="' + escapeHtml(prof.avatar_url) + '" class="h-6 w-6 rounded-full object-cover" />' : '') + '<span class="text-sm font-medium text-white">' + escapeHtml(displayName) + '</span></div><div class="flex items-center gap-2"><span class="text-xs text-zinc-400">Intento ' + att.attempt_num + '</span><span class="text-xs ' + (att.score !== null ? 'text-green-400' : 'text-yellow-400') + '">' + (att.score !== null ? att.score + '%' : 'Pendiente') + '</span></div></div>' + ((answersByAtt[att.id] || []).map((sa: any, idx: number) => {
            const q = qMap[sa.question_id] || {}; const opts = q.question_options || []; const isMC = q.type === 'multiple_choice' || q.type === 'true_false'
            return '<div class="rounded border border-zinc-800 bg-zinc-900/30 p-2 text-xs mb-1"><span class="text-[#8B5CF6] font-medium">' + (idx + 1) + '.</span> <span class="text-white">' + escapeHtml(q.stem || '') + '</span>' + (isMC ? '<div class="mt-1 space-y-0.5">' + opts.map((o: any) => { const isSel = sa.selected_option === o.id; const isCorr = o.is_correct; let cls = 'text-zinc-500'; if (isSel && isCorr) cls = 'text-green-400'; else if (isSel && !isCorr) cls = 'text-red-400'; else if (isCorr) cls = 'text-green-400/60'; return '<div class="' + cls + '"><span>' + String.fromCharCode(65 + o.order_num) + '.</span> ' + escapeHtml(o.text) + (isSel ? ' ✓' : '') + '</div>' }).join('') + '</div>' : '<div class="mt-1"><span class="text-zinc-400">R: </span><span class="text-white">' + escapeHtml(sa.text_answer || '(sin respuesta)') + '</span></div>') + '</div>'
          }).join('')) + '</div>'
        }).join('')
      }

      document.querySelectorAll('.exam-answers-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
          if (!examId) return; ansExamIdInput.value = examId
          document.getElementById('ans-modal-title')!.textContent = 'Respuestas del examen'
          ansModal.classList.remove('hidden'); await loadAnswers(examId)
        })
      })

      document.getElementById('close-ans-modal')?.addEventListener('click', () => ansModal.classList.add('hidden'))
      ansModal.addEventListener('click', (e) => { if (e.target === ansModal) ansModal.classList.add('hidden') })
    }

    async function loadStudentsForCourse(courseIdVal: string) {
      if (!courseIdVal) return
      const { data: enrolls } = await supabase.from('enrollments').select('profile_id, profiles!profile_id(full_name, riot_id, social_discord)').eq('course_id', courseIdVal).eq('status', 'active')
      const sel = document.querySelector<HTMLSelectElement>('select[name="assigned_students"]')
      if (!sel) return
      sel.innerHTML = (enrolls ?? []).map((e: any) => {
        const p: any = e.profiles || {}
        const name = [p.riot_id || p.full_name, p.social_discord].filter(Boolean).join(' | ') || p.full_name || 'Unknown'
        return '<option value="' + e.profile_id + '">' + escapeHtml(name) + '</option>'
      }).join('')
    }

    function showError(msg: string) {
      const el = document.getElementById('exam-error')
      if (el) { el.textContent = msg; el.classList.remove('hidden') }
    }

    await render(selectedCourseId)
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}
