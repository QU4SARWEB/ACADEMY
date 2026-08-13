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

    const taskParams = new URLSearchParams(location.hash.split('?')[1] || '')
    const reviewParam = taskParams.get('review') || ''
    const courseParam2 = taskParams.get('course') || ''
    if (reviewParam) {
      await renderTaskReview(reviewParam, courseParam2)
      return
    }

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
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('.delete-task-btn') || target.closest('.edit-task-btn') || target.closest('a')) return
      const taskId = (card as HTMLElement).dataset.taskId
      const courseId = (card as HTMLElement).dataset.courseId
      if (!taskId) return
      location.hash = `#/coaches/tasks?review=${encodeURIComponent(taskId)}&course=${encodeURIComponent(courseId || '')}`
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

const viewerData: Record<string, { files: string[]; name: string }> = {}

async function renderTaskReview(taskId: string, courseParam: string): Promise<void> {
  try {
    const back = `#/coaches/tasks${courseParam ? '?course=' + encodeURIComponent(courseParam) : ''}`

    const [{ data: task }, { data: course }] = await Promise.all([
      supabase.from('course_tasks').select('id, title, description, week_number, due_date, course_id, is_recovery').eq('id', taskId).maybeSingle(),
      courseParam
        ? supabase.from('courses').select('id, name').eq('id', courseParam).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    if (!task) {
      document.getElementById('page-content')!.innerHTML = `<p class="text-sm text-zinc-500">Tarea no encontrada. <a class="text-[#A78BFA] underline" href="${back}">Volver a tareas</a></p>`
      return
    }
    const courseId = task.course_id
    const courseName = course?.name || 'Desconocido'

    const [{ data: enrolls }, { data: subs }] = await Promise.all([
      supabase.from('enrollments')
        .select('profile_id, profiles!inner(full_name, platform)')
        .eq('course_id', courseId)
        .eq('status', 'active'),
      supabase.from('task_submissions')
        .select('id, student_id, message, files, links, score, graded, graded_at, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
    ])

    const subByStudent = new Map<string, any>()
    for (const s of subs ?? []) subByStudent.set(s.student_id, s)

    const students = (enrolls ?? []).map((e: any) => {
      const prof: any = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
      return { sid: e.profile_id, name: prof?.full_name || 'Desconocido', platform: prof?.platform || 'pc' }
    })

    const submitted = students.filter(st => subByStudent.has(st.sid))
    const missing = students.filter(st => !subByStudent.has(st.sid))
    const isMobile = (p: string) => p === 'mobile'
    const platformBadge = (p: string) => isMobile(p)
      ? `<span class="inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] text-[#C4B5FD]">${Icon('smartphone', 10)} Mobile</span>`
      : `<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('play', 10)} PC</span>`

    const rowFor = (s: any): string => {
      const sub = subByStudent.get(s.sid)
      if (!sub) {
        return `
        <tr class="border-b border-zinc-800/50 bg-red-500/[0.03]">
          <td class="py-3 px-3 text-sm text-white">${escapeHtml(s.name)}</td>
          <td class="py-3 px-3">${platformBadge(s.platform)}</td>
          <td class="py-3 px-3 text-xs text-zinc-600">—</td>
          <td class="py-3 px-3 text-xs text-zinc-600">—</td>
          <td class="py-3 px-3"><span class="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">${Icon('alertTriangle', 10)} No entregó</span></td>
          <td class="py-3 px-3 text-xs text-zinc-600">—</td>
          <td class="py-3 px-3 text-xs text-zinc-600">—</td>
        </tr>`
      }
      const files: string[] = (sub.files as string[]) || []
      const links: string[] = (sub.links as string[]) || []
      const graded = sub.graded
      viewerData[sub.id] = { files, name: s.name }
      const fileBtns = files.length > 0
        ? files.map((f, i) => `<button type="button" class="view-file-btn inline-flex items-center gap-1 rounded bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] font-medium text-[#C4B5FD] hover:bg-[#8B5CF6]/30 transition mr-1" data-sub-id="${escapeHtml(sub.id)}" data-index="${i}" title="Ver archivo">${Icon('eye', 10)} Ver ${files.length > 1 ? i + 1 : ''}</button>`).join('')
        : '<span class="text-xs text-zinc-600">—</span>'
      const linkBtns = links.length > 0
        ? links.map(l => `<a href="${escapeHtml(l)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-blue-400 hover:text-blue-300 mr-1">${Icon('externalLink', 10)} Link</a>`).join('')
        : '<span class="text-xs text-zinc-600">—</span>'
      return `
      <tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30" data-submission-id="${escapeHtml(sub.id)}">
        <td class="py-3 px-3 text-sm text-white">${escapeHtml(s.name)}</td>
        <td class="py-3 px-3">${platformBadge(s.platform)}</td>
        <td class="py-3 px-3 text-xs text-zinc-400 max-w-[200px]">${sub.message ? escapeHtml(sub.message).slice(0, 120) : '<span class="text-zinc-600">—</span>'}</td>
        <td class="py-3 px-3">${fileBtns}</td>
        <td class="py-3 px-3">${linkBtns}</td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-2">
            <input type="number" class="submission-score w-20 rounded border ${graded ? 'border-green-500/40' : 'border-zinc-700'} bg-[#0A0A0A] px-2 py-1.5 text-xs text-white text-center outline-none focus:border-[#8B5CF6]" step="0.1" min="0" max="20" value="${sub.score ?? ''}" ${graded ? 'disabled' : ''} />
            <span class="text-[10px] text-zinc-600">/ 20</span>
          </div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center gap-1">
            ${!graded
              ? `<button class="grade-submission-btn flex items-center gap-1 rounded bg-green-600/20 px-2.5 py-1.5 text-[10px] font-medium text-green-400 hover:bg-green-600/30 transition" data-submission-id="${escapeHtml(sub.id)}">${Icon('checkCircle', 11)} Calificar</button>`
              : `<span class="text-[10px] text-green-400">${sub.score}/20</span>`}
            <button class="msg-student-btn flex items-center gap-1 rounded bg-zinc-800 px-2 py-1.5 text-[10px] text-zinc-400 hover:text-white transition" data-student-id="${escapeHtml(sub.student_id)}" data-task-title="${escapeHtml(task.title || 'Tarea')}">${Icon('mail', 10)} Mensaje</button>
          </div>
        </td>
      </tr>`
    }

    const rows = [...submitted, ...missing].map(rowFor).join('')
    const submittedCount = submitted.length
    const missingCount = missing.length
    const gradedCount = (subs ?? []).filter((s: any) => s.graded).length
    const fmtDate = (d: string) => d ? formatDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

    document.getElementById('page-content')!.innerHTML = `
      <div class="mb-4">
        <a href="${back}" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">${Icon('arrowLeft', 15)} Volver a tareas</a>
      </div>

      <div class="mb-6">
        <span class="kicker">Revisión de entregas</span>
        <h1 class="font-heading text-2xl font-bold text-white mt-1">${escapeHtml(task.title || 'Tarea')}</h1>
        <p class="text-sm text-zinc-400 mt-1">${escapeHtml(courseName)} · Semana ${escapeHtml(String(task.week_number ?? ''))} · Vence: ${fmtDate(task.due_date)}</p>
        ${task.is_recovery ? `<span class="mt-2 inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-400">${Icon('refreshCw', 10)} Recuperación</span>` : ''}
      </div>

      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Total alumnos</p>
          <p class="text-lg font-bold text-white">${students.length}</p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Entregadas</p>
          <p class="text-lg font-bold text-green-400">${submittedCount}</p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Sin entregar</p>
          <p class="text-lg font-bold text-red-400">${missingCount}</p>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
          <p class="text-[10px] text-zinc-500 uppercase">Calificadas</p>
          <p class="text-lg font-bold ${gradedCount > 0 ? 'text-[#A78BFA]' : 'text-zinc-600'}">${gradedCount}</p>
        </div>
      </div>

      ${task.description ? `<p class="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-300">${escapeHtml(task.description)}</p>` : ''}

      <div class="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/20">
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
          <tbody>${rows || '<tr><td colspan="7" class="py-8 text-center text-sm text-zinc-500">No hay alumnos inscritos en este curso.</td></tr>'}</tbody>
        </table>
      </div>`

    bindTaskReviewEvents(taskId, courseId)
  } catch (err) {
    console.error('Error loading task review:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar la revisión de la tarea</p>'
  }
}

function bindTaskReviewEvents(taskId: string, courseId: string): void {
  document.querySelectorAll('.view-file-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = (btn as HTMLElement).dataset.subId
      const index = parseInt((btn as HTMLElement).dataset.index || '0', 10)
      if (!subId) return
      const data = viewerData[subId]
      if (!data || data.files.length === 0) return
      openSubmissionViewer(data.name, data.files, index)
    })
  })

  document.querySelectorAll('.grade-submission-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const subId = (btn as HTMLElement).dataset.submissionId
      if (!subId) return
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
      renderTaskReview(taskId, courseId)
    })
  })

  document.querySelectorAll('.msg-student-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const studentId = (btn as HTMLElement).dataset.studentId
      const taskTitle = (btn as HTMLElement).dataset.taskTitle
      if (!studentId) return
      const msg = prompt(`Mensaje para el alumno sobre "${taskTitle}":`)
      if (!msg || !msg.trim()) return
      toast('success', 'Mensaje registrado. El alumno lo verá en su próxima visita.')
    })
  })
}

function openSubmissionViewer(studentName: string, files: string[], startIndex: number): void {
  const items = files.map(f => {
    const name = decodeURIComponent((f.split('/').pop() || 'archivo').split('?')[0])
    const lower = name.toLowerCase()
    const kind = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(lower) ? 'image' : /\.pdf$/i.test(lower) ? 'pdf' : 'doc'
    return { url: f, kind, label: name }
  })
  if (items.length === 0) return

  const existing = document.getElementById('submission-viewer')
  if (existing) existing.remove()
  const viewer = document.createElement('div')
  viewer.id = 'submission-viewer'
  document.body.appendChild(viewer)

  let current = Math.min(Math.max(startIndex, 0), items.length - 1)

  const render = () => {
    const item = items[current]
    const main = item.kind === 'image'
      ? `<img src="${escapeHtml(item.url)}" class="max-h-[58vh] max-w-full object-contain mx-auto rounded-lg" alt="${escapeHtml(item.label)}" />`
      : item.kind === 'pdf'
        ? `<iframe src="${escapeHtml(item.url)}" class="h-[58vh] w-full rounded-lg border border-zinc-700 bg-white" title="${escapeHtml(item.label)}"></iframe>`
        : `<div class="flex flex-col items-center gap-4 py-20 text-center">
             <span class="text-zinc-500">${Icon('fileText', 52)}</span>
             <p class="text-sm text-zinc-300 break-all px-6">${escapeHtml(item.label)}</p>
             <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm text-white hover:bg-[#7C3AED]">${Icon('download', 14)} Abrir archivo</a>
           </div>`
    const thumbnails = items.map((it, i) => {
      const active = i === current ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/40' : 'border-zinc-700 hover:border-zinc-500'
      const thumb = it.kind === 'image'
        ? `<img src="${escapeHtml(it.url)}" class="h-full w-full object-cover" alt="${escapeHtml(it.label)}" />`
        : `<div class="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-900">
             <span class="text-zinc-500">${Icon('fileText', 18)}</span>
             <span class="px-1 text-center text-[8px] leading-tight text-zinc-500 line-clamp-2">${escapeHtml(it.label)}</span>
           </div>`
      return `<button type="button" class="viewer-thumb h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${active} ${i === current ? '' : 'opacity-60 hover:opacity-100'}" data-index="${i}">${thumb}</button>`
    }).join('')

    viewer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onclick="if(event.target===this)document.getElementById('submission-viewer')?.remove()">
        <div class="glass flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
          <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p class="truncate text-sm font-medium text-white">${escapeHtml(studentName)} · ${escapeHtml(item.label)}</p>
            <button id="close-viewer" class="text-zinc-500 hover:text-white">${Icon('x', 18)}</button>
          </div>
          <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div class="relative flex min-h-[58vh] items-center justify-center">
              ${items.length > 1 ? `<button id="viewer-prev" class="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-800/90 p-2 text-white transition hover:bg-[#8B5CF6]">${Icon('chevronLeft', 20)}</button>` : ''}
              ${main}
              ${items.length > 1 ? `<button id="viewer-next" class="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-zinc-800/90 p-2 text-white transition hover:bg-[#8B5CF6]">${Icon('chevronRight', 20)}</button>` : ''}
            </div>
            ${items.length > 1 ? `
            <div class="mt-1">
              <p class="mb-2 text-[10px] uppercase text-zinc-500">${items.length} archivos · ${item.kind === 'image' ? 'Imagen' : item.kind === 'pdf' ? 'PDF' : 'Documento'} ${current + 1} de ${items.length}</p>
              <div class="viewer-thumbs flex gap-2 overflow-x-auto pb-2">${thumbnails}</div>
            </div>` : ''}
          </div>
        </div>
      </div>`
  }

  render()

  const nav = (i: number) => {
    current = (i + items.length) % items.length
    render()
  }

  viewer.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('#close-viewer')) { viewer.remove(); return }
    if (t.closest('#viewer-next')) { nav(current + 1); return }
    if (t.closest('#viewer-prev')) { nav(current - 1); return }
    const thumb = t.closest<HTMLElement>('.viewer-thumb')
    if (thumb) { nav(parseInt(thumb.dataset.index || '0', 10)); return }
  })

  const keyHandler = (e: KeyboardEvent) => {
    if (!document.getElementById('submission-viewer')) {
      document.removeEventListener('keydown', keyHandler)
      return
    }
    if (e.key === 'Escape') viewer.remove()
    else if (e.key === 'ArrowRight') nav(current + 1)
    else if (e.key === 'ArrowLeft') nav(current - 1)
  }
  document.addEventListener('keydown', keyHandler)
}
