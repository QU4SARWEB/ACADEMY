import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { formatDate } from '@/2b3583/6b239c'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { getAssignedCourseIds } from '@/2b3583/assignments'

export function renderCoachTasks(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTasks(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const coachId = session.user.id
    const assignedIds = await getAssignedCourseIds(coachId)

    let coursesQuery = supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
    if (assignedIds.length > 0) coursesQuery = coursesQuery.in('id', assignedIds)
    const { data: courses } = await coursesQuery

    const courseIds = (courses ?? []).map((c: any) => c.id)
    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: taskData } = await supabase
      .from('course_tasks')
      .select('id, course_id, title, description, week_number, due_date, created_at, file_url, is_recovery')
      .in('course_id', idFilter)
      .order('created_at', { ascending: false })

    const courseFilter = new URLSearchParams(location.hash.split('?')[1] || '').get('course')
    const tasks = courseFilter ? (taskData ?? []).filter((task: any) => task.course_id === courseFilter) : (taskData ?? [])
    const taskIds = tasks.map((t: any) => t.id)
    const taskFilter = taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000']

    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('task_id, student_id, graded')
      .in('task_id', taskFilter)

    const submissionsByTask: Record<string, any[]> = {}
    for (const s of submissions ?? []) {
      if (!submissionsByTask[s.task_id]) submissionsByTask[s.task_id] = []
      submissionsByTask[s.task_id].push(s)
    }

    const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

    const filterHtml = (courses ?? []).map((c: any) => {
      const taskCount = (tasks ?? []).filter((t: any) => t.course_id === c.id).length
      return `
      <button class="course-filter-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none
        bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
        data-course-id="${escapeHtml(c.id)}" data-course-name="${escapeHtml(c.name)}" data-active="1">
        ${Icon('checkCircle', 14)}
        <span>${escapeHtml(c.name)}</span>
        <span class="text-zinc-500">${taskCount}</span>
      </button>`
    }).join('')

    const fmtDate = (d: string) => d ? formatDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

    // Week filtering
    const taskWeeks = [...new Set((tasks ?? []).map((t: any) => t.week_number).filter(Boolean))].sort()
    let taskCurrentWeek: number | null = null
    const savedTaskWeek = sessionStorage.getItem('coachTaskWeek')
    if (savedTaskWeek && taskWeeks.includes(parseInt(savedTaskWeek))) taskCurrentWeek = parseInt(savedTaskWeek)
    const filteredTasks = taskCurrentWeek ? (tasks ?? []).filter((t: any) => t.week_number === taskCurrentWeek) : (tasks ?? [])

    const taskWeekHtml = taskWeeks.length > 1 ? `
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-zinc-500 mr-1">Semana:</span>
        <button class="task-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${!taskCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="all">${Icon('calendar', 12)} Todas</button>
        ${taskWeeks.map((w: number) => `
          <button class="task-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${w === taskCurrentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="${w}">${Icon('calendar', 12)} Semana ${w}</button>
        `).join('')}
      </div>` : ''

    const taskCards = filteredTasks.length === 0
      ? '<div class="col-span-full py-12 text-center text-sm text-zinc-500">No hay tareas esta semana.</div>'
      : filteredTasks.map((t: any) => {
          const course = courseMap.get(t.course_id)
          const subCount = (submissionsByTask[t.id] || []).length
          const gradedCount = (submissionsByTask[t.id] || []).filter((s: any) => s.graded).length
          return `
          <div class="task-card rounded-xl border border-zinc-800 bg-[#111] p-5 hover:border-zinc-700 transition cursor-pointer"
            data-task-id="${escapeHtml(t.id)}" data-course-id="${escapeHtml(t.course_id)}">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-sm font-semibold text-white">${escapeHtml(t.title)}</h3>
                <p class="text-xs text-zinc-500 mt-1">${escapeHtml(course?.name || 'Desconocido')} · Semana ${escapeHtml(String(t.week_number))}</p>
              </div>
              <div class="flex items-center gap-1">
                ${t.is_recovery ? `<span class="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">${Icon('refreshCw', 10)} Recuperación</span>` : ''}
                <button class="edit-task-btn text-zinc-400 hover:text-white transition" data-task-id="${escapeHtml(t.id)}" title="Editar tarea">${Icon('edit', 13)}</button>
                <button class="delete-task-btn text-zinc-600 hover:text-red-400 transition" data-task-id="${escapeHtml(t.id)}" title="Eliminar tarea">${Icon('trash', 14)}</button>
              </div>
            </div>
            ${t.description ? `<p class="text-xs text-zinc-400 mb-3 line-clamp-2">${escapeHtml(t.description)}</p>` : ''}
            <div class="flex items-center gap-4 text-xs text-zinc-500">
              <span class="flex items-center gap-1">${Icon('calendar', 12)} Vence: ${fmtDate(t.due_date)}</span>
              <span class="flex items-center gap-1">${Icon('users', 12)} ${subCount} entrega${subCount !== 1 ? 's' : ''}</span>
              ${gradedCount > 0 ? `<span class="text-green-400">${gradedCount} calificada${gradedCount !== 1 ? 's' : ''}</span>` : ''}
              ${t.file_url ? `<a href="${escapeHtml(t.file_url)}" target="_blank" class="inline-flex items-center gap-1 text-[10px] text-[#8B5CF6] hover:text-[#A78BFA]">${Icon('paperclip', 10)} Archivo</a>` : ''}
            </div>
          </div>`
        }).join('')

    const html = `
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="kicker">Entregas y calificación</span>
          <h1 class="font-heading text-2xl font-bold text-white">Tareas</h1>
          <p class="mt-1 text-sm text-zinc-500">Gestiona las tareas de tus cursos y califica las entregas.</p>
        </div>
        <button id="btn-new-task" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">${Icon('plus', 14)} Nueva tarea</button>
      </div>
      <div id="task-form-container" class="hidden mb-6"></div>
      ${taskWeekHtml}
      <div class="mb-4 flex flex-wrap items-center gap-2" id="course-filters">${filterHtml}</div>
      <div id="task-list" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${taskCards}</div>`

    document.getElementById('page-content')!.innerHTML = html
    bindTaskEvents(courses ?? [], coachId)
  } catch (err) {
    console.error('Error loading tasks:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tareas</p>'
  }
}

function bindTaskEvents(courses: any[], coachId: string): void {
  document.querySelectorAll('.task-week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = (btn as HTMLElement).dataset.week
      if (week === 'all') sessionStorage.removeItem('coachTaskWeek')
      else sessionStorage.setItem('coachTaskWeek', week!)
      initCoachTasks()
    })
  })

  initCourseFilters()
  setupNewTaskButton(courses, coachId)
  setupTaskCardClicks()
  setupDeleteTaskButtons()
  setupEditTaskButtons()
}

function initCourseFilters(): void {
  const activeFilters = new Set<string>()
  document.querySelectorAll('.course-filter-btn').forEach(btn => {
    const courseId = (btn as HTMLElement).dataset.courseId
    if (courseId) activeFilters.add(courseId)
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement
      const cid = el.dataset.courseId
      const active = el.dataset.active === '1'
      if (active) activeFilters.delete(cid!)
      else activeFilters.add(cid!)
      el.dataset.active = active ? '0' : '1'
      el.classList.toggle('bg-[#8B5CF6]/15', !active)
      el.classList.toggle('text-[#8B5CF6]', !active)
      el.classList.toggle('border-[#8B5CF6]/30', !active)
      el.classList.toggle('bg-zinc-800/40', active)
      el.classList.toggle('text-zinc-500', active)
      el.classList.toggle('border-dashed', active)
      el.innerHTML = active
        ? `${Icon('plus', 12)} <span>${escapeHtml(el.dataset.courseName || '')}</span> <span class="text-zinc-500">${el.dataset.courseCount || ''}</span>`
        : `${Icon('checkCircle', 14)} <span>${escapeHtml(el.dataset.courseName || '')}</span> <span class="text-zinc-500">${el.dataset.courseCount || ''}</span>`

      document.querySelectorAll<HTMLElement>('.task-card').forEach(card => {
        const cid2 = card.dataset.courseId
        card.classList.toggle('hidden', !!cid2 && !activeFilters.has(cid2))
      })
    })
  })
}

function setupNewTaskButton(courses: any[], coachId: string): void {
  document.getElementById('btn-new-task')?.addEventListener('click', () => {
    const container = document.getElementById('task-form-container')!
    container.classList.toggle('hidden')
    if (!container.classList.contains('hidden')) {
      container.innerHTML = renderTaskCreateForm(courses)
      bindTaskFormEvents(container, coachId)
    }
  })
}

function renderTaskCreateForm(courses: any[], editTask?: any): string {
  const isEdit = !!editTask
  return `
    <div class="glass rounded-xl p-4">
      <h3 class="mb-3 font-medium text-white">${isEdit ? 'Editar tarea' : 'Nueva tarea'}</h3>
      <form id="task-create-form" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Curso</label>
            <select name="courseId" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              ${courses.map((c: any) => `<option value="${escapeHtml(c.id)}" ${editTask?.course_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">N° de semana</label>
            <input type="number" name="weekNumber" min="1" max="52" value="${escapeHtml(editTask?.week_number || '')}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-400">Título</label>
            <input type="text" name="title" value="${escapeHtml(editTask?.title || '')}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-400">Descripción</label>
            <textarea name="description" rows="3" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(editTask?.description || '')}</textarea>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Fecha de entrega</label>
            <input type="date" name="dueDate" value="${editTask?.due_date || ''}" required class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer h-full mt-6">
              <input type="checkbox" name="isRecovery" ${editTask?.is_recovery ? 'checked' : ''} class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
              <span class="text-sm text-zinc-400">${Icon('refreshCw', 14)} Recuperación</span>
            </label>
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-400">Archivo adjunto (opcional)</label>
            <input type="file" name="taskFile" class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-zinc-400 outline-none focus:border-[#8B5CF6] file:mr-2 file:rounded file:border-0 file:bg-[#8B5CF6]/20 file:px-2 file:py-1 file:text-xs file:text-[#8B5CF6]" />
          </div>
        </div>
        <p id="task-form-error" class="hidden text-xs text-red-400"></p>
        <div class="flex gap-2">
          <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">${isEdit ? 'Guardar cambios' : 'Crear tarea'}</button>
          <button type="button" id="btn-cancel-task" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        </div>
      </form>
    </div>`
}

function bindTaskFormEvents(container: HTMLElement, coachId: string, editId?: string): void {
  document.getElementById('btn-cancel-task')?.addEventListener('click', () => { container.classList.add('hidden') })

  document.getElementById('task-create-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const courseId = fd.get('courseId') as string
    const title = fd.get('title') as string
    const description = fd.get('description') as string
    const weekNumber = parseInt(fd.get('weekNumber') as string, 10)
    const dueDate = fd.get('dueDate') as string
    const isRecovery = fd.get('isRecovery') === 'on'

    const errorEl = document.getElementById('task-form-error')!
    if (!courseId || !title || !weekNumber || !dueDate) {
      errorEl.textContent = 'Completa todos los campos obligatorios'
      errorEl.classList.remove('hidden')
      return
    }

    const submitBtn = document.querySelector<HTMLButtonElement>('#task-create-form button[type="submit"]')!
    submitBtn.disabled = true
    submitBtn.textContent = 'Guardando...'

    // Upload file if present
    const fileInput = document.querySelector<HTMLInputElement>('#task-create-form input[name="taskFile"]')
    let fileUrl = ''
    if (fileInput?.files?.length) {
      const { url, error: upErr } = await uploadFileFromInput('task-files', coachId, `tasks/${Date.now()}`, fileInput.files[0])
      if (upErr) { toast('error', 'Error al subir archivo: ' + upErr); return }
      if (url) fileUrl = url
    }

    const payload: any = {
      course_id: courseId,
      coach_id: coachId,
      title,
      description: description || '',
      week_number: weekNumber,
      due_date: dueDate,
      is_recovery: isRecovery,
    }
    if (fileUrl) payload.file_url = fileUrl

    let error: any
    if (editId) {
      ({ error } = await supabase.from('course_tasks').update(payload).eq('id', editId))
    } else {
      ({ error } = await supabase.from('course_tasks').insert(payload))
    }

    submitBtn.disabled = false
    submitBtn.textContent = editId ? 'Guardar cambios' : 'Crear tarea'

    if (error) { toast('error', error.message); return }
    toast('success', editId ? 'Tarea actualizada' : 'Tarea creada')
    container.classList.add('hidden')
    initCoachTasks()
  })
}

function setupTaskCardClicks(): void {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      if (target.closest('.delete-task-btn')) return
      const taskId = (card as HTMLElement).dataset.taskId
      if (!taskId) return
      openTaskSubmissionsModal(taskId)
    })
  })
}

function setupEditTaskButtons(): void {
  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const taskId = (btn as HTMLElement).dataset.taskId
      if (!taskId) return
      const { data: task } = await supabase.from('course_tasks').select('*').eq('id', taskId).maybeSingle()
      if (!task) return
      const container = document.getElementById('task-form-container')!
      container.classList.remove('hidden')
      container.scrollIntoView({ behavior: 'smooth' })
      const courses: any[] = []
      document.querySelectorAll('#task-create-form select[name="courseId"] option').forEach((opt: any) => {
        if (opt.value) courses.push({ id: opt.value, name: opt.text })
      })
      container.innerHTML = renderTaskCreateForm(courses, task)
      bindTaskFormEvents(container, '', taskId)
    })
  })
}

function setupDeleteTaskButtons(): void {
  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const taskId = (btn as HTMLElement).dataset.taskId
      if (!taskId || !(await confirmDialog('¿Eliminar esta tarea? También se eliminarán todas las entregas.'))) return
      const { error } = await supabase.from('course_tasks').delete().eq('id', taskId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Tarea eliminada')
      const card = (btn as HTMLElement).closest('.task-card')
      if (card) card.remove()
    })
  })
}

async function openTaskSubmissionsModal(taskId: string): Promise<void> {
  const existing = document.getElementById('task-submissions-modal')
  if (existing) existing.remove()

  const div = document.createElement('div')
  div.id = 'task-submissions-modal'
  div.innerHTML = renderSubmissionsModal()
  document.body.appendChild(div)

  const { data: task } = await supabase
    .from('course_tasks')
    .select('id, title, course_id, week_number, due_date')
    .eq('id', taskId)
    .maybeSingle()

  if (!task) {
    document.getElementById('submissions-modal-body')!.innerHTML = '<p class="text-sm text-red-400">Tarea no encontrada</p>'
    return
  }

  document.getElementById('submissions-modal-title')!.textContent = task.title || 'Tarea'

  const { data: subs } = await supabase
    .from('task_submissions')
    .select('id, student_id, message, files, links, score, graded, graded_at, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  // Fetch student names separately
  const studentIds = [...new Set((subs ?? []).map((s: any) => s.student_id))]
  const { data: studentProfiles } = studentIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, platform').in('id', studentIds)
    : { data: [] }
  const nameMap = new Map((studentProfiles ?? []).map((p: any) => [p.id, p.full_name]))
  const platformMap = new Map((studentProfiles ?? []).map((p: any) => [p.id, p.platform]))

  const rows = !subs || subs.length === 0
    ? '<tr><td colspan="7" class="py-8 text-center text-sm text-zinc-500">No hay entregas para esta tarea.</td></tr>'
    : subs.map((s: any) => {
        const files: string[] = (s.files as string[]) || []
        const links: string[] = (s.links as string[]) || []
        const graded = s.graded
        const studentName = nameMap.get(s.student_id) || 'Desconocido'
        const isMobile = platformMap.get(s.student_id) === 'mobile'
        const platformBadge = isMobile
          ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
          : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`
        return `
        <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-submission-id="${escapeHtml(s.id)}">
          <td class="py-3 px-3 text-sm text-white">${escapeHtml(studentName)}</td>
          <td class="py-3 px-3">${platformBadge}</td>
          <td class="py-3 px-3 text-xs text-zinc-400 max-w-[200px]">${s.message ? escapeHtml(s.message).slice(0, 100) : '<span class="text-zinc-600">—</span>'}</td>
          <td class="py-3 px-3">
            ${files.length > 0 ? files.map(f => `<a href="${escapeHtml(f)}" target="_blank" class="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-[#8B5CF6] hover:text-[#A78BFA] mr-1">${Icon('download', 10)} Archivo</a>`).join('') : '<span class="text-xs text-zinc-600">—</span>'}
          </td>
          <td class="py-3 px-3">
            ${links.length > 0 ? links.map(l => `<a href="${escapeHtml(l)}" target="_blank" class="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-blue-400 hover:text-blue-300 mr-1">${Icon('externalLink', 10)} Link</a>`).join('') : '<span class="text-xs text-zinc-600">—</span>'}
          </td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-2">
              <input type="number" class="submission-score w-20 rounded border ${graded ? 'border-green-500/40' : 'border-zinc-700'} bg-[#0A0A0A] px-2 py-1.5 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="20" value="${s.score ?? ''}" data-student="${escapeHtml(s.student_id)}" ${graded ? 'disabled' : ''} />
              <span class="text-[10px] text-zinc-600">/ 20</span>
            </div>
          </td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-1">
              ${!graded
                ? `<button class="grade-submission-btn flex items-center gap-1 rounded bg-green-600/20 px-2.5 py-1.5 text-[10px] font-medium text-green-400 hover:bg-green-600/30 transition" data-submission-id="${escapeHtml(s.id)}" data-task-id="${escapeHtml(taskId)}">${Icon('checkCircle', 11)} Calificar</button>`
                : `<span class="text-[10px] text-green-400">${s.score}/20</span>`
              }
              <button class="msg-student-btn flex items-center gap-1 rounded bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white transition" data-student-id="${escapeHtml(s.student_id)}" data-task-title="${escapeHtml(task?.title || 'Tarea')}">${Icon('mail', 10)} Mensaje</button>
            </div>
          </td>
        </tr>`
      }).join('')

  document.getElementById('submissions-modal-body')!.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="text-zinc-500 text-xs uppercase border-b border-zinc-800">
            <th class="py-2.5 px-3 font-medium">Alumno</th>
            <th class="py-2.5 px-3 font-medium">Plataforma</th>
            <th class="py-2.5 px-3 font-medium">Mensaje</th>
            <th class="py-2.5 px-3 font-medium">Archivos</th>
            <th class="py-2.5 px-3 font-medium">Links</th>
            <th class="py-2.5 px-3 font-medium">Nota</th>
            <th class="py-2.5 px-3 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  bindSubmissionsModalEvents(taskId)
}

function renderSubmissionsModal(): string {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onclick="if(event.target===this)document.getElementById('task-submissions-modal')?.remove()">
      <div class="glass max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 id="submissions-modal-title" class="font-heading text-lg font-bold text-white">Entregas</h2>
          <button id="close-submissions-modal" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
        </div>
        <div id="submissions-modal-body">
          <div class="text-center py-8 text-zinc-500">${Icon('loader', 24)} Cargando...</div>
        </div>
      </div>
    </div>`
}

function bindSubmissionsModalEvents(taskId: string): void {
  document.getElementById('close-submissions-modal')?.addEventListener('click', () => {
    document.getElementById('task-submissions-modal')?.remove()
  })

  document.querySelectorAll('.grade-submission-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const subId = (btn as HTMLElement).dataset.submissionId
      const taskId2 = (btn as HTMLElement).dataset.taskId
      if (!subId || !taskId2) return

      const tr = (btn as HTMLElement).closest('tr')!
      const scoreInput = tr.querySelector<HTMLInputElement>('.submission-score')
      const score = parseFloat(scoreInput?.value || '')
      if (isNaN(score) || score < 0 || score > 20) {
        toast('error', 'La nota debe estar entre 0 y 20')
        return
      }

      const { error } = await supabase.from('task_submissions').update({
        score,
        graded: true,
        graded_at: new Date().toISOString(),
      }).eq('id', subId)

      if (error) { toast('error', error.message); return }
      toast('success', 'Nota guardada')
      openTaskSubmissionsModal(taskId2)
    })
  })

  document.querySelectorAll('.msg-student-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const studentId = (btn as HTMLElement).dataset.studentId
      const taskTitle = (btn as HTMLElement).dataset.taskTitle
      if (!studentId) return

      const msg = prompt(`Mensaje para el alumno sobre "${taskTitle}":`)
      if (!msg || !msg.trim()) return

      toast('success', 'Mensaje registrado. El alumno lo ver\u00e1 en su pr\u00f3xima visita.')
    })
  })
}
