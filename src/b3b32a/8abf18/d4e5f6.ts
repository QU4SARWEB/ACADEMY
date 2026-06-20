import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachExamsOverview(): string { return `<div id="page-content">${Spinner()}</div>` }

const modalsHtml = `
<div id="qs-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
  <div class="glass max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-xl p-6">
    <div class="flex items-center justify-between mb-4"><h2 class="font-heading text-lg font-bold text-white" id="qs-modal-title">Preguntas</h2><button id="close-qs-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button></div>
    <input type="hidden" id="qs-exam-id"><div id="qs-list" class="space-y-3 mb-6"></div>
    <div class="border-t border-zinc-700 pt-4"><h3 class="mb-3 font-medium text-white text-sm">Agregar pregunta existente</h3><div class="flex gap-2"><select id="qs-add-select" class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></select><button id="qs-add-btn" class="rounded-lg bg-[#8B5CF6] px-3 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Agregar</button></div></div>
    <div class="border-t border-zinc-700 pt-4 mt-4"><h3 class="mb-3 font-medium text-white text-sm">Crear nueva pregunta</h3><form id="qs-form" class="space-y-3"><input type="hidden" name="examId"><div><textarea name="text" rows="2" required placeholder="Texto de la pregunta..." class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div><div class="flex gap-2"><select name="type" required class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="multiple_choice">Opción múltiple</option><option value="true_false">V/F</option><option value="open_ended">Desarrollo</option><option value="short_answer">Corta</option></select><input name="points" type="number" step="0.5" value="5" class="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div><div id="qs-opts-container"><p class="text-xs text-zinc-500 mb-2">Opciones</p><div id="qs-opts-list" class="space-y-2"></div><button type="button" id="qs-add-opt" class="mt-2 text-xs text-zinc-500 hover:text-white transition">${Icon('plus', 10)} Agregar opción</button></div><p id="qs-error" class="hidden text-xs text-red-400"></p><button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Crear y agregar</button></form></div>
  </div>
</div>
<div id="ans-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
  <div class="glass max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto rounded-xl p-6">
    <div class="flex items-center justify-between mb-4"><h2 class="font-heading text-lg font-bold text-white" id="ans-modal-title">Respuestas</h2><button id="close-ans-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button></div>
    <input type="hidden" id="ans-exam-id"><div id="ans-list" class="space-y-4"></div>
  </div>
</div>`

export async function initCoachExamsOverview(): Promise<void> {
  try {
    const { data: allCourses } = await supabase.from('courses').select('id, name, display_order').eq('is_active', true).order('display_order')
    const courses = allCourses ?? []
    let currentCourseId = ''
    let currentCourseName = ''

    async function renderGrid() {
      currentCourseId = ''
      const courseIds = courses.map(c => c.id)
      const { data: exams } = await supabase.from('exams').select('course_id').in('course_id', courseIds.length ? courseIds : ['none'])
      const { data: enrolls } = await supabase.from('enrollments').select('course_id').in('course_id', courseIds.length ? courseIds : ['none'])
      const examCount: Record<string, number> = {}; const studentCount: Record<string, number> = {}
      for (const e of exams ?? []) { if (!examCount[e.course_id]) examCount[e.course_id] = 0; examCount[e.course_id]++ }
      for (const e of enrolls ?? []) { if (!studentCount[e.course_id]) studentCount[e.course_id] = 0; studentCount[e.course_id]++ }
      document.getElementById('page-content')!.innerHTML = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Exámenes</h1><p class="mt-1 text-sm text-zinc-500">${(exams ?? []).length} exámenes en ${courses.length} cursos</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${courses.map(c => '<button class="course-exam-btn glass rounded-xl p-5 text-left transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5" data-course-id="' + c.id + '" data-course-name="' + escapeHtml(c.name) + '"><div class="flex items-center justify-between"><div><h3 class="font-medium text-white">' + escapeHtml(c.name) + '</h3><p class="mt-1 text-sm text-zinc-500">' + (examCount[c.id] || 0) + ' exámenes · ' + (studentCount[c.id] || 0) + ' estudiantes</p></div>' + Icon('chevronRight', 20) + '</div></button>').join('')}
      </div>` + modalsHtml
      document.querySelectorAll('.course-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCourseId = (btn as HTMLElement).dataset.courseId || ''
          currentCourseName = (btn as HTMLElement).dataset.courseName || ''
          renderExamList(currentCourseId)
        })
      })
    }

    async function renderExamList(courseId: string) {
      const { data: exams } = await supabase.from('exams').select('*, course_modules(name)').eq('course_id', courseId).order('created_at', { ascending: false })
      const { data: modules } = await supabase.from('course_modules').select('id, name').eq('course_id', courseId).order('display_order')
      const { data: allQ } = await supabase.from('exam_questions').select('exam_id, question_id')
      const qCountByExam: Record<string, number> = {}
      for (const eq of allQ ?? []) { if (!qCountByExam[eq.exam_id]) qCountByExam[eq.exam_id] = 0; qCountByExam[eq.exam_id]++ }

      document.getElementById('page-content')!.innerHTML = `
      <div class="mb-4"><button id="back-to-grid" class="flex items-center gap-2 text-sm text-zinc-400 hover:text-white">${Icon('arrowLeft', 16)} Todos los cursos</button></div>
      <h1 class="font-heading text-2xl font-bold text-white mb-6">${escapeHtml(currentCourseName)}</h1>
      <div class="flex gap-6 items-start">
      <div class="w-[600px] shrink-0">
      <div id="new-exam-form" class="glass rounded-xl p-6">
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Crear nuevo examen</h2>
        <form id="create-exam-form" class="space-y-3">
          <div><label class="mb-1 block text-sm text-zinc-400">Curso</label><select name="course_id" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${courses.map((c: any) => '<option value="' + c.id + '" ' + (c.id === courseId ? 'selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('')}</select></div>
          <div><label class="mb-1 block text-sm text-zinc-400">Título</label><input name="title" required class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          <div><label class="mb-1 block text-sm text-zinc-400">Descripción</label><textarea name="description" rows="2" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="mb-1 block text-sm text-zinc-400">Módulo</label><select name="module_id" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="">— Sin módulo —</option>${(modules ?? []).map((m: any) => '<option value="' + m.id + '">' + escapeHtml(m.name) + '</option>').join('')}</select></div><div><label class="mb-1 block text-sm text-zinc-400">Nota mínima %</label><input name="passing_score" type="number" min="0" max="100" value="60" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div></div>
          <div class="grid grid-cols-3 gap-3"><div><label class="mb-1 block text-sm text-zinc-400">Tiempo (min)</label><input name="time_limit" type="number" min="0" placeholder="Sin límite" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div><div><label class="mb-1 block text-sm text-zinc-400">Intentos</label><input name="max_attempts" type="number" min="1" value="1" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div><div><label class="mb-1 block text-sm text-zinc-400">Peso %</label><input name="weight" type="number" min="0" max="100" step="0.01" value="0" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div></div>
          <div><label class="mb-1 block text-sm text-zinc-400">Fecha límite</label><input name="due_date" type="datetime-local" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></div>
          <div class="grid grid-cols-2 gap-3"><div><label class="mb-1 block text-sm text-zinc-400">Tipo</label><select name="eval_type" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="exam">Examen</option><option value="quiz">Quiz</option><option value="practical">Práctica</option></select></div><div><label class="mb-1 block text-sm text-zinc-400">Mes</label><select name="month" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="">— Sin mes —</option>${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((n, i) => '<option value="' + (i+1) + '">' + n + '</option>').join('')}</select></div></div>
          <div class="border-t border-zinc-700 pt-3"><label class="mb-2 block text-sm text-zinc-400">Asignar a</label><div class="flex gap-4 mb-2"><label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="assign_type" value="course" checked class="h-4 w-4 border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none" onchange="document.getElementById('assign-students').classList.add('hidden')"> <span class="text-sm text-zinc-300">Todo el curso</span></label><label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="assign_type" value="individual" class="h-4 w-4 border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none" onchange="document.getElementById('assign-students').classList.remove('hidden')"> <span class="text-sm text-zinc-300">Alumnos específicos</span></label></div><div id="assign-students" class="hidden"><select name="assigned_students" multiple class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" size="4"></select><p class="mt-1 text-xs text-zinc-500">Ctrl+click para seleccionar varios</p></div></div>
          <div class="flex items-center gap-4"><label class="flex items-center gap-2 cursor-pointer"><input name="is_published" type="checkbox" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> <span class="text-sm text-zinc-400">Publicado</span></label><label class="flex items-center gap-2 cursor-pointer"><input name="shuffle" type="checkbox" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> <span class="text-sm text-zinc-400">Aleatorio</span></label><label class="flex items-center gap-2 cursor-pointer"><input name="is_active" type="checkbox" checked class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"> <span class="text-sm text-zinc-400">Activo</span></label></div>
          <div class="border-t border-zinc-700 pt-3 mt-3">
            <h3 class="font-heading text-sm font-bold text-white mb-2">Preguntas del examen</h3>
            <div id="manual-questions-list" class="space-y-2 mb-2"></div>
            <div id="manual-q-form" class="hidden rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 mb-2">
              <div class="flex flex-wrap gap-2 mb-2"><input id="manual-q-text" placeholder="Texto de la pregunta" class="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /><select id="manual-q-type" class="w-28 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"><option value="multiple_choice">Opción múltiple</option><option value="true_false">V/F</option><option value="open_ended">Desarrollo</option><option value="short_answer">Corta</option></select><input id="manual-q-points" type="number" step="0.5" value="5" class="w-16 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" /><button type="button" id="manual-q-close" class="text-zinc-600 hover:text-red-400">&times;</button></div>
              <div id="manual-q-options" class="space-y-1.5 pl-2"></div>
              <button type="button" id="manual-add-opt" class="mt-2 ml-2 text-xs text-zinc-500 hover:text-white">${Icon('plus', 10)} Agregar opción</button>
              <p id="manual-q-error" class="mt-2 hidden text-xs text-red-400"></p>
              <button type="button" id="manual-q-save" class="mt-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">Guardar pregunta</button>
            </div>
            <button type="button" id="paste-full-exam-btn" class="flex items-center gap-2 text-xs text-zinc-500 hover:text-white">${Icon('clipboardList', 12)} Pegar examen completo</button>
            <div id="paste-full-exam-area" class="hidden mt-2"><textarea rows="5" placeholder="Pega aquí el examen completo (título, descripción, preguntas con opciones...)" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-xs text-white outline-none focus:border-[#8B5CF6]"></textarea><div class="flex gap-2 mt-1"><button type="button" id="apply-full-exam-btn" class="text-xs text-[#8B5CF6] hover:text-[#7C3AED]">Aplicar</button><button type="button" id="cancel-full-exam-btn" class="text-xs text-zinc-500 hover:text-white">Cancelar</button></div></div>
            <button type="button" id="add-manual-q-btn" class="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 w-full justify-center transition">${Icon('plus', 12)} Agregar pregunta manual</button>
          </div>
          <p id="exam-error" class="hidden text-sm text-red-400"></p>
          <button type="submit" class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('plus', 14)} Crear examen${'<span id="exam-q-count" class="ml-1 text-xs opacity-70"></span>'}</button>
        </form>
      </div>
      </div>

      <div class="flex-1 min-w-0">
      <div class="glass rounded-xl p-6">
      <div class="space-y-3">${(exams ?? []).length === 0 ? '<p class="text-sm text-zinc-500">No hay exámenes en este curso.</p>' : (exams ?? []).map((exam: any) => '<div class="exam-item glass rounded-xl p-4" data-exam-id="' + exam.id + '" data-course-id="' + (exam.course_id || '') + '"><div class="flex items-start justify-between"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><h3 class="font-medium text-white">' + escapeHtml(exam.title) + '</h3>' + (exam.is_published ? '<span class="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Publicado</span>' : '<span class="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Borrador</span>') + '</div><p class="mt-1 text-xs text-zinc-500">' + (exam.course_modules?.name ? escapeHtml(exam.course_modules.name) + ' · ' : '') + 'Nota mín: ' + exam.passing_score + '%' + (exam.time_limit ? ' · Tiempo: ' + exam.time_limit + 'min' : '') + (exam.max_attempts ? ' · Intentos: ' + exam.max_attempts : '') + (exam.due_date ? ' · Vence: ' + formatDate(exam.due_date) : '') + '</p></div><div class="flex gap-2 shrink-0 ml-3"><button class="exam-answers-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('users', 12) + ' Respuestas</button><button class="edit-exam-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">' + Icon('edit', 12) + '</button><button class="del-exam-btn rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30">' + Icon('trash', 12) + '</button></div></div><div class="edit-exam-form mt-3 hidden border-t border-zinc-700 pt-3"><form data-exam-id="' + exam.id + '"><div class="grid grid-cols-2 gap-3 mb-3"><div><label class="text-xs text-zinc-400">Título</label><input name="title" value="' + escapeHtml(exam.title) + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Módulo</label><select name="module_id" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"><option value="">— Sin módulo —</option>' + (modules ?? []).map((m: any) => '<option value="' + m.id + '" ' + (m.id === exam.module_id ? 'selected' : '') + '>' + escapeHtml(m.name) + '</option>').join('') + '</select></div></div><div class="grid grid-cols-3 gap-3 mb-3"><div><label class="text-xs text-zinc-400">Nota mín %</label><input name="passing_score" type="number" value="' + exam.passing_score + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Tiempo (min)</label><input name="time_limit" type="number" value="' + (exam.time_limit || '') + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div><div><label class="text-xs text-zinc-400">Intentos</label><input name="max_attempts" type="number" value="' + exam.max_attempts + '" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]"></div></div><div class="mb-3"><label class="text-xs text-zinc-400">Descripción</label><textarea name="description" rows="2" class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8B5CF6]">' + escapeHtml(exam.description || '') + '</textarea></div><div class="flex gap-2"><button type="submit" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white">Guardar</button><button type="button" class="cancel-edit-btn rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancelar</button></div></form></div></div>').join('')}</div></div></div></div>` + modalsHtml

      bindEvents(courseId)
    }

    async function loadStudentsForCourse(courseIdVal: string) {
      if (!courseIdVal) return
      const { data: enrolls } = await supabase.from('enrollments').select('profile_id, profiles!profile_id(full_name, riot_id, social_discord)').eq('course_id', courseIdVal).eq('status', 'active')
      const sel = document.querySelector<HTMLSelectElement>('select[name="assigned_students"]')
      if (!sel) return; sel.innerHTML = (enrolls ?? []).map((e: any) => { const p: any = e.profiles || {}; const name = [p.riot_id || p.full_name, p.social_discord].filter(Boolean).join(' | ') || p.full_name || 'Unknown'; return '<option value="' + e.profile_id + '">' + escapeHtml(name) + '</option>' }).join('')
    }

    function showError(msg: string) { const el = document.getElementById('exam-error'); if (el) { el.textContent = msg; el.classList.remove('hidden') } }

    async function bindEvents(courseId: string) {
      document.getElementById('back-to-grid')?.addEventListener('click', () => renderGrid())

      document.getElementById('add-exam-btn')?.addEventListener('click', () => {
        document.getElementById('new-exam-form')?.classList.remove('hidden')
        document.getElementById('assign-students')?.classList.add('hidden')
        document.querySelector<HTMLInputElement>('input[name="assign_type"][value="course"]')!.checked = true
        loadStudentsForCourse(courseId)
      })

      document.getElementById('create-exam-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        // Loading overlay
        const loadOverlay = document.createElement('div')
        loadOverlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60'
        loadOverlay.innerHTML = '<div class="flex flex-col items-center gap-3"><svg class="animate-spin h-8 w-8 text-[#8B5CF6]" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg><p class="text-sm text-zinc-300">Creando examen...</p></div>'
        document.body.appendChild(loadOverlay)
        try {
        const fd = new FormData(e.target as HTMLFormElement)
        const course_id = fd.get('course_id') as string
        if (!course_id) { showError('Selecciona un curso'); loadOverlay.remove(); return }
        const payload: Record<string, any> = {
          course_id, title: fd.get('title'), description: fd.get('description'), module_id: fd.get('module_id') || null,
          passing_score: parseFloat(fd.get('passing_score') as string) || 60, time_limit: parseInt(fd.get('time_limit') as string) || null,
          max_attempts: parseInt(fd.get('max_attempts') as string) || 1, weight: parseFloat(fd.get('weight') as string) || 0,
          due_date: fd.get('due_date') || null, is_published: fd.get('is_published') === 'on', shuffle: fd.get('shuffle') === 'on',
          eval_type: (fd.get('eval_type') as string) || 'exam', month: fd.get('month') ? parseInt(fd.get('month') as string) : null, is_active: fd.get('is_active') === 'on',
        }
        const { data: newExam, error } = await supabase.from('exams').insert(payload).select().maybeSingle()
        if (error || !newExam) { showError(error?.message || 'Error'); return }
        if (fd.get('assign_type') === 'individual') {
          const sel = document.querySelector<HTMLSelectElement>('select[name="assigned_students"]')
          if (sel) { const ids = Array.from(sel.selectedOptions).map(o => o.value); if (ids.length > 0) await supabase.from('exam_assignments').insert(ids.map(pid => ({ exam_id: newExam.id, profile_id: pid }))) }
        }
        // Save pending manual questions
        if (pendingQuestions.length > 0) {
          for (let qi = 0; qi < pendingQuestions.length; qi++) {
            const q = pendingQuestions[qi]
            const { data: question } = await supabase.from('questions').insert({ course_id, type: q.type, stem: q.stem, points: q.points || 5 }).select().maybeSingle()
            if (!question) continue
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
              for (let oi = 0; oi < (q.options || []).length; oi++) {
                await supabase.from('question_options').insert({ question_id: question.id, text: q.options[oi].text, is_correct: q.options[oi].correct, order_num: oi })
              }
            }
            await supabase.from('exam_questions').insert({ exam_id: newExam.id, question_id: question.id, order_num: qi, points: q.points || 5 })
          }
          pendingQuestions = []
        }
        toast('success', 'Examen creado'); document.getElementById('new-exam-form')?.classList.add('hidden'); renderExamList(courseId)
        } catch (err) { console.error(err); toast('error', 'Error al crear examen')
        } finally { loadOverlay.remove() }
      })

      // Manual question builder
      let pendingQuestions: any[] = []
      function renderManualQList() {
        const list = document.getElementById('manual-questions-list')!
        const countEl = document.getElementById('exam-q-count')!
        if (pendingQuestions.length === 0) { list.innerHTML = ''; countEl.textContent = ''; return }
        list.innerHTML = pendingQuestions.map((q, qi) => '<div class="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900/30 px-3 py-2"><span class="text-xs text-white truncate flex-1">' + (qi + 1) + '. ' + escapeHtml(q.stem) + '</span><button type="button" class="remove-pending-q text-zinc-600 hover:text-red-400 shrink-0 ml-2" data-idx="' + qi + '">' + Icon('x', 12) + '</button></div>').join('')
        countEl.textContent = '(' + pendingQuestions.length + ' preg.)'
      }
      function syncManualOpts() {
        const type = (document.getElementById('manual-q-type') as HTMLSelectElement)?.value || 'multiple_choice'
        const opts = document.getElementById('manual-q-options')!; const addBtn = document.getElementById('manual-add-opt')!
        opts.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'; addBtn.style.display = (type === 'multiple_choice') ? '' : 'none'
        if (type === 'true_false') opts.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">V.</span><input type="text" class="manual-opt-text flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" value="Verdadero" readonly /><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="manual-opt-correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">F.</span><input type="text" class="manual-opt-text flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" value="Falso" readonly /><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="manual-opt-correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label></div>'
        else if (type === 'multiple_choice') opts.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">A.</span><input type="text" class="manual-opt-text flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción A" /><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="manual-opt-correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label><button type="button" class="manual-opt-remove text-zinc-600 hover:text-red-400 hidden">&times;</button></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">B.</span><input type="text" class="manual-opt-text flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción B" /><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="manual-opt-correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label><button type="button" class="manual-opt-remove text-zinc-600 hover:text-red-400 hidden">&times;</button></div>'
      }
      document.getElementById('add-manual-q-btn')?.addEventListener('click', () => { document.getElementById('manual-q-form')?.classList.remove('hidden') })
      document.getElementById('manual-q-close')?.addEventListener('click', () => { document.getElementById('manual-q-form')?.classList.add('hidden') })
      document.getElementById('manual-q-type')?.addEventListener('change', syncManualOpts); syncManualOpts()
      document.getElementById('manual-add-opt')?.addEventListener('click', () => {
        const opts = document.getElementById('manual-q-options')!; const count = opts.querySelectorAll('.flex').length
        opts.insertAdjacentHTML('beforeend', '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">' + String.fromCharCode(65 + count) + '.</span><input type="text" class="manual-opt-text flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Opción ' + String.fromCharCode(65 + count) + '" /><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="manual-opt-correct" value="' + count + '" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label><button type="button" class="manual-opt-remove text-zinc-600 hover:text-red-400">&times;</button></div>')
      })
      document.getElementById('manual-q-options')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.manual-opt-remove') as HTMLElement; if (!btn) return
        const opts = document.getElementById('manual-q-options')!; const row = btn.closest('.flex') as HTMLElement
        if (opts.querySelectorAll('.flex').length > 2) row.remove()
      })
      document.getElementById('manual-q-save')?.addEventListener('click', () => {
        const stem = (document.getElementById('manual-q-text') as HTMLInputElement).value.trim()
        if (!stem) { const el = document.getElementById('manual-q-error')!; el.textContent = 'Escribe el texto'; el.classList.remove('hidden'); return }
        const type = (document.getElementById('manual-q-type') as HTMLSelectElement).value
        const points = parseFloat((document.getElementById('manual-q-points') as HTMLInputElement).value) || 5
        const options: any[] = []
        if (type === 'multiple_choice' || type === 'true_false') {
          const rows = document.querySelectorAll('#manual-q-options .flex'); let hasCorrect = false
          rows.forEach((row, oi) => {
            const text = ((row as HTMLElement).querySelector('.manual-opt-text') as HTMLInputElement)?.value?.trim()
            const radio = (row as HTMLElement).querySelector('.manual-opt-correct') as HTMLInputElement
            if (text) { options.push({ text, correct: radio?.checked || false }); if (radio?.checked) hasCorrect = true }
          })
          if (options.length < 2) { const el = document.getElementById('manual-q-error')!; el.textContent = 'Agrega al menos 2 opciones'; el.classList.remove('hidden'); return }
          if (!hasCorrect) { const el = document.getElementById('manual-q-error')!; el.textContent = 'Selecciona una correcta'; el.classList.remove('hidden'); return }
        }
        pendingQuestions.push({ stem, type, points, options })
        ;(document.getElementById('manual-q-text') as HTMLInputElement).value = ''; (document.getElementById('manual-q-points') as HTMLInputElement).value = '5'
        document.getElementById('manual-q-error')!.classList.add('hidden'); document.getElementById('manual-q-form')!.classList.add('hidden')
        renderManualQList()
      })
      document.getElementById('manual-questions-list')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.remove-pending-q') as HTMLElement; if (!btn) return
        const idx = parseInt(btn.getAttribute('data-idx') || ''); if (idx >= 0 && idx < pendingQuestions.length) { pendingQuestions.splice(idx, 1); renderManualQList() }
      })

      // Paste full exam
      document.getElementById('paste-full-exam-btn')?.addEventListener('click', () => { document.getElementById('paste-full-exam-area')?.classList.toggle('hidden') })
      document.getElementById('cancel-full-exam-btn')?.addEventListener('click', () => { const a = document.getElementById('paste-full-exam-area')!; a.classList.add('hidden'); a.querySelector('textarea')!.value = '' })
      document.getElementById('apply-full-exam-btn')?.addEventListener('click', async () => {
        const area = document.getElementById('paste-full-exam-area')!; const ta = area.querySelector('textarea') as HTMLTextAreaElement
        if (!ta?.value?.trim()) return
        const parsed = parseFullExam(ta.value)
        if (!parsed.title) { toast('error', 'No se pudo detectar el título'); return }
        document.querySelector<HTMLInputElement>('#create-exam-form input[name="title"]')!.value = parsed.title
        document.querySelector<HTMLTextAreaElement>('#create-exam-form textarea[name="description"]')!.value = parsed.description
        if (parsed.passingScore) document.querySelector<HTMLInputElement>('#create-exam-form input[name="passing_score"]')!.value = String(parsed.passingScore)
        if (parsed.timeLimit) document.querySelector<HTMLInputElement>('#create-exam-form input[name="time_limit"]')!.value = String(parsed.timeLimit)
        pendingQuestions = parsed.questions; renderManualQList()
        area.classList.add('hidden'); ta.value = ''; toast('success', parsed.questions.length + ' preguntas parseadas')
      })
      function parseFullExam(text: string): any {
        const lines = text.split('\n'); const result: any = { title: '', description: '', passingScore: null, timeLimit: null, questions: [] }; let currentQ: any = null; const desc: string[] = []
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim(); if (!line) continue
          if (!result.title) { result.title = line.replace(/^w/i, '').replace(/^Examen\s*/i, '').trim() || line; continue }
          if (line.startsWith('Objetivo:') || line.startsWith('Duración:') || line.startsWith('Nota mínima')) { desc.push(line); const sm = line.match(/Nota\s*m[íi]nima[^:]*:\s*(\d+)/i); if (sm) result.passingScore = parseInt(sm[1]); const tm = line.match(/Duraci[óo]n[^:]*:\s*(\d+)/i); if (tm) result.timeLimit = parseInt(tm[1]); continue }
          if (/^Secci[óo]n\s+\d+/i.test(line)) { desc.push(line); continue }
          const qm = line.match(/^(\d+)[\.\)]\s*(.+)/)
          if (qm) { if (currentQ) { if (currentQ.options.length === 0) currentQ.type = 'open_ended'; if (currentQ.stem) result.questions.push(currentQ) }; currentQ = { stem: qm[2].trim(), type: 'multiple_choice', points: 5, options: [] }; continue }
          const om = line.match(/^([a-z])[\.\)]\s*(.+?)(?:\s*✅)?$/)
          if (om && currentQ) { currentQ.options.push({ text: om[2].trim(), correct: line.includes('✅') }); continue }
          if (/pregunta\s+abierta/i.test(line) && currentQ) { currentQ.type = 'open_ended'; continue }
          if (currentQ) currentQ.stem += ' ' + line; else desc.push(line)
        }
        if (currentQ) { if (currentQ.options.length === 0) currentQ.type = 'open_ended'; if (currentQ.stem) result.questions.push(currentQ) }
        result.description = desc.join('\n'); return result
      }

      document.querySelectorAll('.edit-exam-btn').forEach(btn => { btn.addEventListener('click', () => { const f = (btn as HTMLElement).closest('.exam-item')?.querySelector('.edit-exam-form') as HTMLElement; if (f) f.classList.toggle('hidden') }) })
      document.querySelectorAll('.cancel-edit-btn').forEach(btn => { btn.addEventListener('click', () => { const f = (btn as HTMLElement).closest('.edit-exam-form') as HTMLElement; if (f) f.classList.add('hidden') }) })
      document.querySelectorAll('.edit-exam-form form').forEach(form => {
        form.addEventListener('submit', async (e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); const examId = (e.target as HTMLElement).dataset.examId; if (!examId) return; const { error } = await supabase.from('exams').update({ title: fd.get('title'), description: fd.get('description'), module_id: fd.get('module_id') || null, passing_score: parseFloat(fd.get('passing_score') as string) || 60, time_limit: parseInt(fd.get('time_limit') as string) || null, max_attempts: parseInt(fd.get('max_attempts') as string) || 1, is_published: fd.get('is_published') === 'on', shuffle: fd.get('shuffle') === 'on', is_active: fd.get('is_active') === 'on' }).eq('id', examId); if (error) { toast('error', error.message); return }; toast('success', 'Examen actualizado'); renderExamList(courseId) })
      })

      document.querySelectorAll('.del-exam-btn').forEach(btn => { btn.addEventListener('click', async () => { const id = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id'); if (!id || !(await confirmDialog('¿Eliminar este examen?'))) return; const { error } = await supabase.from('exams').delete().eq('id', id); if (error) { toast('error', error.message); return }; toast('success', 'Eliminado'); renderExamList(courseId) }) })

      // Questions modal
      const qsModal = document.getElementById('qs-modal')!; const qsList = document.getElementById('qs-list')!; const qsExamId = document.getElementById('qs-exam-id') as HTMLInputElement; const qsAddSelect = document.getElementById('qs-add-select') as HTMLSelectElement
      async function loadQuestions(examId: string) {
        qsList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'
        const { data: eqs } = await supabase.from('exam_questions').select('*, questions(*)').eq('exam_id', examId).order('order_num')
        const qIds = [...new Set((eqs ?? []).map((eq: any) => eq.question_id))]
        const { data: opts } = await supabase.from('question_options').select('*').in('question_id', qIds.length ? qIds : ['none'])
        const optsByQ: Record<string, any[]> = {}; for (const o of opts ?? []) { if (!optsByQ[o.question_id]) optsByQ[o.question_id] = []; optsByQ[o.question_id].push(o) }
        if ((eqs ?? []).length === 0) { qsList.innerHTML = '<p class="text-sm text-zinc-500">No hay preguntas.</p>' } else {
          qsList.innerHTML = (eqs ?? []).map((eq: any) => { const q = eq.questions; const qOpts = optsByQ[q.id] || []; return '<div class="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3" data-eq-id="' + eq.id + '"><div class="flex items-start justify-between gap-2"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-xs font-medium text-[#8B5CF6]">' + (eq.order_num + 1) + '.</span><p class="text-sm text-white">' + escapeHtml(q.stem || '') + '</p><span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">' + (q.type || '') + '</span><span class="text-xs text-zinc-500">' + eq.points + ' pts</span></div>' + (qOpts.length > 0 ? '<div class="mt-2 space-y-1 pl-4">' + qOpts.map((o: any) => '<div class="flex items-center gap-2 text-xs ' + (o.is_correct ? 'text-green-400' : 'text-zinc-500') + '"><span class="w-4 text-right">' + String.fromCharCode(65 + o.order_num) + '.</span><span>' + escapeHtml(o.text) + '</span>' + (o.is_correct ? '<span class="text-green-400">' + Icon('checkCircle', 10) + '</span>' : '') + '</div>').join('') + '</div>' : '') + '</div><button class="remove-eq-btn text-zinc-600 hover:text-red-400" data-eq-id="' + eq.id + '">' + Icon('x', 14) + '</button></div></div>' }).join('')
        }
        qsAddSelect.innerHTML = '<option value="">— Seleccionar —</option>'; const { data: allQ } = await supabase.from('questions').select('id, stem, type').order('created_at', { ascending: false }); const existing = new Set((eqs ?? []).map((eq: any) => eq.question_id)); for (const q of allQ ?? []) { if (!existing.has(q.id)) qsAddSelect.innerHTML += '<option value="' + q.id + '">' + escapeHtml((q.stem || '').slice(0, 80)) + '</option>' }
      }
      document.getElementById('close-qs-modal')?.addEventListener('click', () => qsModal.classList.add('hidden'))
      qsModal.addEventListener('click', (e) => { if (e.target === qsModal) qsModal.classList.add('hidden') })
      document.getElementById('qs-add-btn')?.addEventListener('click', async () => { const eid = qsExamId.value; const qid = qsAddSelect.value; if (!eid || !qid) return; const { data: max } = await supabase.from('exam_questions').select('order_num').eq('exam_id', eid).order('order_num', { ascending: false }).limit(1); const next = ((max ?? []) as any[]).length > 0 ? (max as any[])[0].order_num + 1 : 0; await supabase.from('exam_questions').insert({ exam_id: eid, question_id: qid, order_num: next, points: 1 }); toast('success', 'Pregunta agregada'); await loadQuestions(eid) })
      qsList.addEventListener('click', async (e) => { const btn = (e.target as HTMLElement).closest('.remove-eq-btn') as HTMLElement; if (!btn) return; const eqId = btn.getAttribute('data-eq-id'); if (!eqId || !(await confirmDialog('¿Quitar esta pregunta?'))) return; await supabase.from('exam_questions').delete().eq('id', eqId); toast('success', 'Pregunta quitada'); await loadQuestions(qsExamId.value) })
      document.getElementById('qs-form')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); const examId = qsExamId.value; const type = fd.get('type') as string; const text = (fd.get('text') as string)?.trim(); const points = parseFloat(fd.get('points') as string) || 5
        if (!text) { const el = document.getElementById('qs-error')!; el.textContent = 'Escribe el texto'; el.classList.remove('hidden'); return }
        const errEl = document.getElementById('qs-error')!; const { data: newQ, error: qErr } = await supabase.from('questions').insert({ course_id: courseId, type, stem: text, points }).select().maybeSingle()
        if (qErr || !newQ) { errEl.textContent = qErr?.message || 'Error'; errEl.classList.remove('hidden'); return }
        if (type === 'multiple_choice' || type === 'true_false') { const rows = document.querySelectorAll('#qs-opts-list .flex'); for (let oi = 0; oi < rows.length; oi++) { const row = rows[oi] as HTMLElement; const optText = (row.querySelector<HTMLInputElement>('input[name="opt_text"]'))?.value?.trim(); const optRadio = row.querySelector<HTMLInputElement>('input[name="opt_correct"]'); if (optText) await supabase.from('question_options').insert({ question_id: newQ.id, text: optText, is_correct: optRadio?.checked || false, order_num: oi }) } }
        const { data: max2 } = await supabase.from('exam_questions').select('order_num').eq('exam_id', examId).order('order_num', { ascending: false }).limit(1); const next2 = ((max2 ?? []) as any[]).length > 0 ? (max2 as any[])[0].order_num + 1 : 0
        await supabase.from('exam_questions').insert({ exam_id: examId, question_id: newQ.id, order_num: next2, points }); toast('success', 'Pregunta creada'); (document.querySelector<HTMLTextAreaElement>('#qs-form textarea[name="text"]'))!.value = ''; errEl.classList.add('hidden'); await loadQuestions(examId)
      })
      document.getElementById('qs-add-opt')?.addEventListener('click', () => { const list = document.getElementById('qs-opts-list')!; const count = list.querySelectorAll('.flex').length; list.insertAdjacentHTML('beforeend', '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">' + String.fromCharCode(65 + count) + '.</span><input type="text" name="opt_text" placeholder="Opción ' + String.fromCharCode(65 + count) + '" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="' + count + '" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6] outline-none"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition">&times;</button></div>') })
      document.getElementById('qs-opts-list')?.addEventListener('click', (e) => { const btn = (e.target as HTMLElement).closest('.opt-remove') as HTMLElement; if (!btn) return; const list = document.getElementById('qs-opts-list')!; const row = btn.closest('.flex') as HTMLElement; if (list.querySelectorAll('.flex').length > 2) row.remove() })
      document.querySelector<HTMLSelectElement>('#qs-form select[name="type"]')?.addEventListener('change', (e) => {
        const type = (e.target as HTMLSelectElement).value; const container = document.getElementById('qs-opts-container')!; const list = document.getElementById('qs-opts-list')!
        container.style.display = (type === 'multiple_choice' || type === 'true_false') ? '' : 'none'
        if (type === 'true_false') list.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">V.</span><input type="text" name="opt_text" value="Verdadero" readonly class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">F.</span><input type="text" name="opt_text" value="Falso" readonly class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label></div>'
        else if (type === 'multiple_choice') list.innerHTML = '<div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">A.</span><input type="text" name="opt_text" placeholder="Opción A" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="0" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div><div class="flex gap-2 items-center"><span class="text-xs font-medium text-zinc-500 w-5 shrink-0">B.</span><input type="text" name="opt_text" placeholder="Opción B" class="flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-1.5 text-sm text-white outline-none focus:border-[#8B5CF6]"><label class="flex items-center gap-1 text-xs text-zinc-400 shrink-0"><input type="radio" name="opt_correct" value="1" class="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-[#8B5CF6]"> Correcta</label><button type="button" class="opt-remove text-zinc-600 hover:text-red-400 transition hidden">&times;</button></div>'
      })

      // Answers modal
      const ansModal = document.getElementById('ans-modal')!; const ansList = document.getElementById('ans-list')!; const ansExamIdInput = document.getElementById('ans-exam-id') as HTMLInputElement
      async function loadAnswers(examId: string) {
        ansList.innerHTML = '<p class="text-sm text-zinc-500">Cargando...</p>'
        const { data: attempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).in('status', ['submitted', 'graded']).order('submitted_at', { ascending: false })
        if (!attempts || attempts.length === 0) { ansList.innerHTML = '<p class="text-sm text-zinc-500">No hay respuestas aún.</p>'; return }
        const enrollIds = [...new Set(attempts.map(a => a.enrollment_id))]
        const { data: enrolls } = await supabase.from('enrollments').select('id, profile_id').in('id', enrollIds.length ? enrollIds : ['none'])
        const profIds = [...new Set((enrolls ?? []).map(e => e.profile_id))]
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, riot_id, social_discord').in('id', profIds.length ? profIds : ['none'])
        const profMap: Record<string, any> = {}; for (const p of profs ?? []) profMap[p.id] = p
        const enrollMap: Record<string, any> = {}; for (const e of enrolls ?? []) enrollMap[e.id] = profMap[e.profile_id] || {}
        ansList.innerHTML = attempts.map((att: any) => { const prof = enrollMap[att.enrollment_id] || {}; const dn = [prof.riot_id || prof.full_name, prof.social_discord].filter(Boolean).join(' | ') || 'Unknown'; return '<div class="exam-attempt-item rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 cursor-pointer hover:bg-zinc-800/50 transition" data-attempt-id="' + att.id + '"><div class="flex items-center justify-between"><div class="flex items-center gap-3">' + (prof.avatar_url ? '<img src="' + escapeHtml(prof.avatar_url) + '" class="h-8 w-8 rounded-full object-cover" />' : '<div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">' + escapeHtml(dn.charAt(0)) + '</div>') + '<div><p class="text-sm font-medium text-white hover:text-[#8B5CF6] transition">' + escapeHtml(dn) + '</p><p class="text-xs text-zinc-500">Intento ' + att.attempt_num + '</p></div></div><div class="flex items-center gap-2"><span class="text-sm font-semibold ' + (att.score !== null ? (att.score >= 70 ? 'text-green-400' : 'text-red-400') : 'text-yellow-400') + '">' + (att.score !== null ? att.score + '%' : 'Pendiente') + '</span><span class="text-zinc-600">' + Icon('chevronRight', 16) + '</span></div></div></div>' }).join('')
        document.querySelectorAll('.exam-attempt-item').forEach(el => { el.addEventListener('click', () => { const attId = el.getAttribute('data-attempt-id'); if (attId) { ansModal.classList.add('hidden'); const cid = document.querySelector<HTMLElement>('.exam-item[data-exam-id="' + examId + '"]')?.getAttribute('data-course-id') || ''; location.hash = '#/coaches/courses/' + cid + '/exams/' + examId + '/attempt/' + attId } }) })
      }
      document.querySelectorAll('.exam-answers-btn').forEach(btn => { btn.addEventListener('click', async () => { const id = (btn as HTMLElement).closest('.exam-item')?.getAttribute('data-exam-id'); if (!id) return; ansExamIdInput.value = id; ansModal.classList.remove('hidden'); await loadAnswers(id) }) })
      document.getElementById('close-ans-modal')?.addEventListener('click', () => ansModal.classList.add('hidden'))
      ansModal.addEventListener('click', (e) => { if (e.target === ansModal) ansModal.classList.add('hidden') })
    }

    await renderGrid()
  } catch (err) {
    console.error('Error loading exams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar exámenes</p>'
  }
}



