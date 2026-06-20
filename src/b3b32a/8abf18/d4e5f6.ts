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

      document.getElementById('page-content')!.innerHTML = html
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

      // Questions modal (reuse from a9f8d1 logic - simplified)
      document.querySelectorAll('.exam-qs-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
          if (examId) window.location.hash = '#/coaches/courses/' + selectedCourseId + '/exams?focus=questions&exam=' + examId
        })
      })

      // Answers modal
      document.querySelectorAll('.exam-answers-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const examId = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id')
          if (examId) window.location.hash = '#/coaches/courses/' + selectedCourseId + '/exams?focus=answers&exam=' + examId
        })
      })
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
