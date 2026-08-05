import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { Spinner } from '@/4725dc/a14fa2'
import { formatDate } from '@/2b3583/6b239c'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

export async function loadAndRenderTasks(containerId: string, studentId: string, role: 'student' | 'player'): Promise<void> {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = Spinner()

  try {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('profile_id', studentId)
      .eq('status', 'active')

    const courseIds = [...new Set((enrollments ?? []).map((e: any) => e.course_id))]
    if (courseIds.length === 0) {
      container.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No estás inscrito en ningún curso.</p></div>'
      return
    }

    const idFilter = courseIds.length > 0 ? courseIds : ['00000000-0000-0000-0000-000000000000']

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name')
      .in('id', idFilter)

    const courseMap = new Map<string, string>()
    for (const c of courses ?? []) courseMap.set(c.id, c.name)

    const { data: taskData } = await supabase
      .from('course_tasks')
      .select('*')
      .in('course_id', idFilter)
      .order('week_number', { ascending: true })

    const courseFilter = new URLSearchParams(location.hash.split('?')[1] || '').get('course')
    const tasks = courseFilter ? (taskData ?? []).filter((task: any) => task.course_id === courseFilter) : (taskData ?? [])

    if (tasks.length === 0) {
      container.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay tareas disponibles.</p></div>'
      return
    }

    const taskIds = tasks.map((t: any) => t.id)
    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('*')
      .in('task_id', taskIds)
      .eq('student_id', studentId)

    const submissionMap = new Map<string, any>()
    for (const s of submissions ?? []) submissionMap.set(s.task_id, s)

    const uniqueCourseIds = [...new Set(tasks.map((t: any) => t.course_id))]

    const fmtDate = (d: string) => d ? formatDate(d) : '—'

    // Week filtering
    const taskWeeks = [...new Set(tasks.map((t: any) => t.week_number).filter(Boolean))].sort()
    let currentWeek: number | null = taskWeeks.length > 0 ? taskWeeks[0] : null
    const savedWeek = sessionStorage.getItem('studentTaskWeek')
    if (savedWeek && taskWeeks.includes(parseInt(savedWeek))) currentWeek = parseInt(savedWeek)
    const filteredTasks = currentWeek ? tasks.filter((t: any) => t.week_number === currentWeek) : tasks

    const weekFilterHtml = taskWeeks.length > 1 ? `
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs text-zinc-500 mr-1">Semana:</span>
        <button class="task-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300" data-week="all">${Icon('calendar', 12)} Todas</button>
        ${taskWeeks.map((w: number) => `
          <button class="task-week-btn flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition select-none ${w === currentWeek ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-week="${w}">${Icon('calendar', 12)} Semana ${w}</button>
        `).join('')}
      </div>` : ''

    const filterChips = uniqueCourseIds.map(cid => `
      <button class="task-filter-chip rounded-lg px-3 py-1.5 text-xs font-medium transition border ${courseMap.get(cid) === courseMap.get(uniqueCourseIds[0]) ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30' : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-300'}" data-course-id="${escapeHtml(cid)}">
        ${escapeHtml(courseMap.get(cid) || 'Curso')}
      </button>
    `).join('')

    const allActive = uniqueCourseIds.length <= 1 ? 'hidden' : ''

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${Icon('clipboardList', 22)} Tareas</h1>
        <p class="mt-1 text-sm text-zinc-500">${filteredTasks.length} tarea${filteredTasks.length !== 1 ? 's' : ''} disponible${filteredTasks.length !== 1 ? 's' : ''}</p>
      </div>
      ${weekFilterHtml}
      <div class="mb-4 flex flex-wrap gap-2 ${allActive}" id="task-filter-bar">
        <button class="task-filter-chip rounded-lg px-3 py-1.5 text-xs font-medium transition border bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30" data-course-id="all">Todos</button>
        ${filterChips}
      </div>
      <div class="space-y-4" id="task-list">
        ${filteredTasks.map((task: any) => {
          const submitted = submissionMap.get(task.id)
          const courseName = courseMap.get(task.course_id) || 'Curso'
          const hasSubmitted = !!submitted
          const isGraded = hasSubmitted && submitted.score != null

          let badge = ''
          if (isGraded) {
            const s = parseFloat(submitted.score)
            const color = s >= 14 ? 'bg-green-500/20 text-green-400' : s >= 11 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
            badge = `<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-sm font-bold">${s}</div>`
          } else if (hasSubmitted) {
            badge = `<span class="rounded bg-blue-500/20 px-2 py-1 text-[10px] text-blue-400 shrink-0">Entregado</span>`
          }

          return `
            <div class="task-card glass rounded-xl p-5" data-course-id="${escapeHtml(task.course_id)}">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="min-w-0 flex-1">
                  <h3 class="font-heading text-base font-bold text-white">${escapeHtml(task.title)}</h3>
                  <div class="flex flex-wrap gap-1.5 mt-1">
                    <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${escapeHtml(courseName)}</span>
                    <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">Sem ${task.week_number || '?'}</span>
                    ${task.due_date ? `<span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">${Icon('clock', 10)} ${fmtDate(task.due_date)}</span>` : ''}
                  </div>
                </div>
                ${badge}
              </div>
              ${task.description ? `<p class="mb-3 text-sm text-zinc-400">${escapeHtml(task.description)}</p>` : ''}
              ${task.file_url ? `<div class="mb-3">
                <a href="https://docs.google.com/viewer?url=${encodeURIComponent(task.file_url)}&embedded=true" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6]/15 px-3 py-1.5 text-xs font-medium text-[#8B5CF6] hover:bg-[#8B5CF6]/25 transition">${Icon('fileText', 14)} Ver formato de trabajo</a>
              </div>` : ''}
              ${hasSubmitted ? `<div>${renderSubmission(submitted)}
                ${isGraded ? `<div class="mt-3 flex justify-end">
                  <button class="retry-task-btn text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300 transition" data-task-id="${escapeHtml(task.id)}">${Icon('rotate', 12)} Reenviar</button>
                </div>` : ''}</div>` : renderSubmissionForm(task, studentId)}
            </div>`
        }).join('')}
      </div>`

    container.innerHTML = html
    bindTaskEvents(containerId, studentId, role)
  } catch (err) {
    console.error('Error loading tasks:', err)
    container.innerHTML = '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-red-400">Error al cargar las tareas.</p></div>'
  }
}

function renderSubmission(sub: any): string {
  const files: string[] = sub.files || []
  const links: string[] = sub.links || []
  const isGraded = sub.score != null

  return `
    <div class="border-t border-zinc-700/50 pt-4 mt-4 space-y-3">
      ${sub.message ? `<div class="glass-inner rounded-lg p-3">
        <p class="text-xs text-zinc-500 mb-1">Mensaje:</p>
        <p class="text-sm text-zinc-300">${escapeHtml(sub.message)}</p>
      </div>` : ''}
      ${files.length > 0 ? `<div>
        <p class="text-xs text-zinc-500 mb-1">Archivos (${files.length}):</p>
        <div class="flex flex-wrap gap-2">
          ${files.map((f: string) => `
            <a href="${escapeHtml(f)}" target="_blank" rel="noopener" class="flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition">${Icon('paperclip', 12)} ${escapeHtml(f.split('/').pop() || 'archivo')}</a>
          `).join('')}
        </div>
      </div>` : ''}
      ${links.length > 0 ? `<div>
        <p class="text-xs text-zinc-500 mb-1">Enlaces (${links.length}):</p>
        <div class="flex flex-wrap gap-2">
          ${links.map((l: string) => `
            <a href="${escapeHtml(l)}" target="_blank" rel="noopener" class="flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-2.5 py-1.5 text-xs text-blue-400 hover:text-blue-300 transition">${Icon('externalLink', 12)} ${escapeHtml(l)}</a>
          `).join('')}
        </div>
      </div>` : ''}
      ${isGraded ? `<div class="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
        <span class="text-xs text-zinc-500">Calificaci\u00f3n:</span>
        <span class="text-sm font-bold ${parseFloat(sub.score) >= 14 ? 'text-green-400' : parseFloat(sub.score) >= 11 ? 'text-yellow-400' : 'text-red-400'}">${sub.score}/20</span>
      </div>` : `<p class="text-xs text-zinc-600 pt-2 border-t border-zinc-700/50">Esperando calificaci\u00f3n...</p>`}
    </div>`
}

function renderSubmissionForm(task: any, studentId: string): string {
  const taskId = task.id
  return `
    <div class="border-t border-zinc-700/50 pt-4 mt-4 space-y-3 task-submit-area" data-task-id="${escapeHtml(taskId)}">
      <div>
        <label class="text-xs text-zinc-500 mb-1 block">Mensaje</label>
        <textarea class="task-message w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] resize-y min-h-[80px]" placeholder="Escribe tu respuesta..." rows="3"></textarea>
      </div>
      <div>
        <label class="text-xs text-zinc-500 mb-1 block">Archivos</label>
        <div class="flex items-center gap-3">
          <input type="file" class="task-file-input text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-[#8B5CF6] file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-[#7C3AED]" multiple />
          <span class="task-file-names text-xs text-zinc-600"></span>
        </div>
        <div class="task-file-list flex flex-wrap gap-2 mt-2"></div>
      </div>
      <div>
        <label class="text-xs text-zinc-500 mb-1 block">Enlaces</label>
        <div class="flex gap-2">
          <input type="url" class="task-link-input flex-1 rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="https://..." />
          <button type="button" class="task-add-link rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition">${Icon('plus', 14)}</button>
        </div>
        <div class="task-link-list flex flex-wrap gap-2 mt-2"></div>
      </div>
      <button type="button" class="task-submit-btn flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">${Icon('upload', 14)} Entregar tarea</button>
      <p class="task-submit-error hidden text-xs text-red-400"></p>
    </div>`
}

function bindTaskEvents(containerId: string, studentId: string, role: 'student' | 'player'): void {
  // Week filter
  document.querySelectorAll('.task-week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = (btn as HTMLElement).dataset.week
      if (week === 'all') sessionStorage.removeItem('studentTaskWeek')
      else sessionStorage.setItem('studentTaskWeek', week!)
      loadAndRenderTasks(containerId, studentId, role)
    })
  })

  const filterChips = document.querySelectorAll('.task-filter-chip')
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cid = (chip as HTMLElement).dataset.courseId
      filterChips.forEach(c => {
        c.classList.remove('bg-[#8B5CF6]/15', 'text-[#8B5CF6]', 'border-[#8B5CF6]/30')
        c.classList.add('bg-zinc-800/40', 'text-zinc-500', 'border-zinc-700/50')
      })
      chip.classList.remove('bg-zinc-800/40', 'text-zinc-500', 'border-zinc-700/50')
      chip.classList.add('bg-[#8B5CF6]/15', 'text-[#8B5CF6]', 'border-[#8B5CF6]/30')

      document.querySelectorAll('.task-card').forEach(card => {
        const cardCid = (card as HTMLElement).dataset.courseId
        if (cid === 'all' || cardCid === cid) {
          (card as HTMLElement).style.display = ''
        } else {
          (card as HTMLElement).style.display = 'none'
        }
      })
    })
  })

  // File input handling
  document.querySelectorAll('.task-file-input').forEach(input => {
    input.addEventListener('change', function (this: HTMLInputElement) {
      const area = this.closest('.task-submit-area') as HTMLElement
      if (!area) return
      const nameEl = area.querySelector('.task-file-names')
      const listEl = area.querySelector('.task-file-list')
      if (!nameEl || !listEl) return
      const files = Array.from(this.files || [])
      if (files.length === 0) {
        nameEl.textContent = ''
        listEl.innerHTML = ''
        return
      }
      nameEl.textContent = `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}`
      listEl.innerHTML = files.map(f =>
        `<span class="flex items-center gap-1 rounded bg-zinc-800/60 px-2 py-1 text-[10px] text-zinc-400">${Icon('paperclip', 10)} ${escapeHtml(f.name)}</span>`
      ).join('')
    })
  })

  // Add link
  document.querySelectorAll('.task-add-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const area = (btn as HTMLElement).closest('.task-submit-area') as HTMLElement
      if (!area) return
      const input = area.querySelector('.task-link-input') as HTMLInputElement
      const list = area.querySelector('.task-link-list') as HTMLElement
      if (!input || !list) return
      const val = input.value.trim()
      if (!val) return
      if (!/^https?:\/\//i.test(val)) {
        toast('error', 'Ingresa una URL válida (https://...)')
        return
      }
      list.insertAdjacentHTML('beforeend', `
        <span class="task-link-tag flex items-center gap-1 rounded bg-zinc-800/60 px-2 py-1 text-[10px] text-blue-400" data-link="${escapeHtml(val)}">
          ${Icon('externalLink', 10)} ${escapeHtml(val.length > 40 ? val.slice(0, 40) + '…' : val)}
          <button type="button" class="task-remove-link text-zinc-600 hover:text-red-400 ml-1" aria-label="Eliminar enlace">${Icon('x', 10)}</button>
        </span>`)
      input.value = ''
    })
  })

  // Remove link (delegated)
  document.querySelectorAll('.task-link-list').forEach(list => {
    list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const rmBtn = target.closest('.task-remove-link')
      if (rmBtn) {
        rmBtn.closest('.task-link-tag')?.remove()
      }
    })
  })

  // Submit
  document.querySelectorAll('.task-submit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const area = (btn as HTMLElement).closest('.task-submit-area') as HTMLElement
      if (!area) return
      const errEl = area.querySelector('.task-submit-error') as HTMLElement
      const taskId = area.dataset.taskId
      if (!taskId) return

      errEl.classList.add('hidden')
      btn.setAttribute('disabled', 'disabled')
      btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Enviando...'

      try {
        const message = (area.querySelector('.task-message') as HTMLTextAreaElement)?.value?.trim() || ''

        // Upload files
        const fileInput = area.querySelector('.task-file-input') as HTMLInputElement
        const fileUrls: string[] = []
        if (fileInput?.files?.length) {
          for (const file of Array.from(fileInput.files)) {
            const { url, error } = await uploadFileFromInput('uploads', studentId, `tasks/${taskId}`, file)
            if (error) {
              toast('error', `Error al subir archivo: ${error}`)
              continue
            }
            if (url) fileUrls.push(url)
          }
        }

        // Collect links
        const linkTags = area.querySelectorAll('.task-link-tag')
        const links: string[] = []
        linkTags.forEach(tag => {
          const l = (tag as HTMLElement).dataset.link
          if (l) links.push(l)
        })

        const { error } = await supabase.from('task_submissions').insert({
          task_id: taskId,
          student_id: studentId,
          message: message || null,
          files: fileUrls.length > 0 ? fileUrls : null,
          links: links.length > 0 ? links : null,
        })

        if (error) {
          errEl.textContent = error.message
          errEl.classList.remove('hidden')
          btn.removeAttribute('disabled')
          btn.innerHTML = `${Icon('upload', 14)} Entregar tarea`
          return
        }

        toast('success', 'Tarea entregada correctamente')
        loadAndRenderTasks(containerId, studentId, role)
      } catch (err: any) {
        errEl.textContent = err?.message || 'Error al enviar la tarea'
        errEl.classList.remove('hidden')
        btn.removeAttribute('disabled')
        btn.innerHTML = `${Icon('upload', 14)} Entregar tarea`
      }
    })
  })

  // Retry task buttons
  document.querySelectorAll('.retry-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement
      const taskId = el.dataset.taskId
      if (!taskId || !confirm('¿Reenviar tarea? Se eliminará tu calificación anterior.')) return
      supabase.from('task_submissions').delete().eq('task_id', taskId).eq('student_id', studentId)
      loadAndRenderTasks(containerId, studentId, role)
    })
  })
}
