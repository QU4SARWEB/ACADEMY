import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { router } from '@/f3395c'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { Breadcrumb } from '@/2b3583/breadcrumb'

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  submitted: 'text-blue-400',
  reviewed: 'text-purple-400',
  graded: 'text-green-400',
  late: 'text-red-400',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  submitted: 'Entregada',
  reviewed: 'En revisión',
  graded: 'Calificada',
  late: 'Atrasada',
}

export function renderCoachTaskDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTaskDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    const { data: allCourses } = await supabase.from('courses').select('id, name').order('name')

    if (!task) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Tarea no encontrada.</p>'
      return
    }

    const [{ data: submissions }, { data: enrollments }] = await Promise.all([
      supabase
        .from('task_submissions')
        .select('*, enrollments(profile_id, profiles(full_name, avatar_url, email))')
        .eq('task_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('id, profile_id, profiles(full_name, email)')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .eq('status', 'active'),
    ])

    const subs = submissions ?? []
    const allEnrollments = enrollments ?? []
    const submittedIds = new Set(subs.map((s: any) => s.enrollment_id))
    const pendingStudents = allEnrollments.filter((e: any) => !submittedIds.has(e.id))

    const html = `
      <div>
        ${Breadcrumb([
          { label: 'Tareas', href: '#/coaches/tasks' },
          { label: task.title },
        ])}
        <div class="mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(task.title)}</h1>
              <p class="mt-1 text-sm text-zinc-400">
                ${escapeHtml((task as any).courses?.name || '')}
              </p>
              <p class="text-sm text-zinc-500">
                Límite: ${task.due_date ? formatDate(task.due_date) : '—'} · Máx: ${task.max_score ?? '—'} pts
              </p>
              ${task.description ? `<p class="mt-2 text-sm text-zinc-300">${escBr(task.description)}</p>` : ''}
              ${(() => {
                const attach = task.attachments || (task.material_url ? [{ name: task.material_url.split('/').pop(), url: task.material_url }] : [])
                if (!attach.length) return ''
                return attach.map((a: any) => `
                  <div class="mt-3">
                    <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">
                      ${Icon('download', 12)} ${escapeHtml(a.name || 'archivo')}
                    </a>
                  </div>`).join('')
              })()}
            </div>
            <div class="flex gap-2 shrink-0">
              <button id="edit-task-btn" class="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">${Icon('edit', 14)}</button>
              <button id="delete-task-detail-btn" class="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-400 transition hover:bg-red-900/30">${Icon('trash', 14)}</button>
            </div>
          </div>
        </div>

        <div id="edit-task-form-area" class="hidden mb-6">
          <div class="glass rounded-xl p-6">
            <h2 class="mb-4 font-heading text-lg font-bold text-white">Editar tarea</h2>
            <form id="edit-task-form" class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm text-zinc-400">Título</label>
                  <input name="title" required maxlength="200" value="${escapeHtml(task.title)}"
                    class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-zinc-400">Curso</label>
                  <select name="courseId" required
                    class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                    <option value="">Seleccionar...</option>
                    ${(allCourses ?? []).map((c: any) => `<option value="${escapeHtml(c.id)}" ${c.id === task.course_id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm text-zinc-400">Descripción</label>
                <textarea name="description" rows="3"
                  class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(task.description || '')}</textarea>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm text-zinc-400">Puntaje máximo</label>
                  <input name="maxScore" type="number" min="0" value="${task.max_score ?? 100}"
                    class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label class="mb-1 block text-sm text-zinc-400">Archivo adjunto</label>
                  <input type="file" name="attachment"
                    class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded file:border-0 file:bg-[#8B5CF6] file:px-3 file:py-1 file:text-xs file:text-white" />
                  ${task.material_url ? `<p class="mt-1 text-xs text-zinc-500">Actual: <a href="${escapeHtml(task.material_url)}" target="_blank" class="text-[#8B5CF6] hover:underline">${escapeHtml(task.material_url.split('/').pop() || 'archivo')}</a></p>` : ''}
                </div>
              </div>
              <p id="edit-task-error" class="hidden text-sm text-red-400"></p>
              <div class="flex gap-3">
                <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">${Icon('save', 14)} Guardar</button>
                <button type="button" id="cancel-edit-task" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
              </div>
            </form>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 class="mb-4 font-heading text-lg font-bold text-white">Entregas (${subs.length})</h2>
            <div class="space-y-3">
              ${subs.length === 0 ? '<p class="text-sm text-zinc-500">Sin entregas todavía.</p>' : ''}
              ${subs.map((sub: any) => {
                const profile = sub.enrollments?.profiles
                return `
                    <div class="glass rounded-lg p-4">
                    <div class="mb-2 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                          ${profile?.avatar_url
                            ? `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                            : escapeHtml(profile?.full_name?.charAt(0) ?? '?')
                          }
                        </div>
                        <span class="text-sm font-medium text-white">${escapeHtml(profile?.full_name ?? '—')}</span>
                      </div>
                      <span class="text-xs ${statusColors[sub.status] ?? 'text-zinc-500'}">${statusLabels[sub.status] ?? sub.status}</span>
                    </div>

                    ${sub.submission_text ? `<div class="mb-3 rounded-lg bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">${escBr(sub.submission_text)}</div>` : ''}

                    ${sub.files && (sub.files as string[]).length > 0 ? `
                      <div class="mb-3 flex flex-wrap gap-2">
                        ${(sub.files as string[]).map((f: string) => `
                          <a href="${escapeHtml(f)}" target="_blank" rel="noopener noreferrer"
                            class="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">
                            ${Icon('download', 12)} ${escapeHtml(f.split('/').pop() || 'archivo')}
                          </a>
                        `).join('')}
                      </div>` : ''}

                    ${(sub.status === 'submitted' || sub.status === 'reviewed' || sub.status === 'late')
                      ? `
                        <div class="border-t border-zinc-800 pt-3">
                          <form class="grade-form space-y-2" data-sub-id="${escapeHtml(sub.id)}">
                            <div class="flex gap-3">
                              <div class="w-24">
                                <label class="block text-xs text-zinc-500">Nota</label>
                                <input name="score" type="number" min="0" max="${task.max_score}" required
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                              </div>
                              <div class="flex-1">
                                <label class="block text-xs text-zinc-500">Feedback</label>
                                <input name="feedback"
                                  class="mt-1 w-full rounded border border-zinc-700 bg-[#0A0A0A] px-2 py-1 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                              </div>
                            </div>
                            <button type="submit"
                              class="rounded bg-[#8B5CF6] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
                              Calificar
                            </button>
                          </form>
                        </div>`
                      : sub.status === 'graded'
                        ? `
                          <div class="border-t border-zinc-800 pt-2 text-sm">
                            <div class="flex items-center gap-4">
                              <span class="text-green-400">Nota: ${sub.score}/${task.max_score}</span>
                              ${sub.feedback ? `<span class="text-zinc-400">· ${escBr(sub.feedback)}</span>` : ''}
                            </div>
                          </div>`
                        : ''
                    }
                  </div>`
              }).join('')}
            </div>
          </div>

          <div>
            <h2 class="mb-4 font-heading text-lg font-bold text-white">Pendientes (${pendingStudents.length})</h2>
            <div class="space-y-2">
              ${pendingStudents.length === 0
                ? '<p class="text-sm text-zinc-500">Todos han entregado.</p>'
                : pendingStudents.map((ps: any) => `
                    <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#111] px-4 py-3">
                      ${Icon('x', 14)}<span class="text-sm text-zinc-300">${escapeHtml(ps.profiles?.full_name ?? '—')}</span>
                    </div>
                  `).join('')
              }
            </div>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('delete-task-detail-btn')?.addEventListener('click', async () => {
      if (!(await confirmDialog('¿Eliminar esta tarea y todas sus entregas?'))) return
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) { toast('error', error.message); return }
      toast('success', 'Tarea eliminada')
      router.navigate('/coaches/tasks')
    })

    // ── Edit task ──
    document.getElementById('edit-task-btn')?.addEventListener('click', () => {
      document.getElementById('edit-task-form-area')!.classList.remove('hidden')
      document.getElementById('edit-task-form-area')!.scrollIntoView({ behavior: 'smooth' })
    })
    document.getElementById('cancel-edit-task')?.addEventListener('click', () => {
      document.getElementById('edit-task-form-area')!.classList.add('hidden')
    })
    document.getElementById('edit-task-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const fileInput = document.querySelector<HTMLInputElement>('#edit-task-form input[name="attachment"]')
      let materialUrl = task.material_url
      let attachments = task.attachments || []
      if (fileInput?.files?.[0]) {
        const { url, error: upErr } = await uploadFileFromInput('uploads', 'tasks', 'attachments', fileInput.files[0])
        if (upErr) { document.getElementById('edit-task-error')!.textContent = upErr; document.getElementById('edit-task-error')!.classList.remove('hidden'); return }
        if (url) {
          materialUrl = url
          attachments = [{ name: fileInput.files[0].name, url }]
        }
      }
      const { error } = await supabase.from('tasks').update({
        course_id: fd.get('courseId') as string,
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || null,
        due_date: fd.get('dueDate') as string,
        max_score: parseFloat(fd.get('maxScore') as string) || 100,
        material_url: materialUrl,
        attachments,
      }).eq('id', id)
      if (error) { document.getElementById('edit-task-error')!.textContent = error.message; document.getElementById('edit-task-error')!.classList.remove('hidden'); return }
      toast('success', 'Tarea actualizada')
      document.getElementById('edit-task-form-area')!.classList.add('hidden')
      router.navigate(`/coaches/tasks/${id}`)
    })

    document.querySelectorAll('.grade-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const subId = (e.target as HTMLElement).getAttribute('data-sub-id')
        if (!subId) return

        const { error } = await supabase
          .from('task_submissions')
          .update({
            score: parseFloat(fd.get('score') as string),
            feedback: (fd.get('feedback') as string) || null,
            status: 'graded',
            graded_at: new Date().toISOString(),
          })
          .eq('id', subId)

        if (error) {
          toast('error', error.message)
        } else {
          toast('success', 'Calificación guardada')
          // Recalc enrollment grade
          const { data: sub } = await supabase.from('task_submissions').select('enrollment_id').eq('id', subId).maybeSingle()
          if (sub?.enrollment_id) {
            const { recalcFinalGrade, checkAutoPromotion } = await import('@/b3b32a/8abf18/grade_utils')
            await recalcFinalGrade(sub.enrollment_id)
            const { data: enr } = await supabase.from('enrollments').select('course_id, profile_id').eq('id', sub.enrollment_id).maybeSingle()
            if (enr) await checkAutoPromotion(sub.enrollment_id, enr.course_id, enr.profile_id)
          }
          router.navigate(`/coaches/tasks/${id}`)
        }
      })
    })
  } catch (err) {
    console.error('Error loading task detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tarea</p>'
  }
}
