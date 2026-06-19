import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { router } from '@/f3395c'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { toast } from '@/4725dc/4f2900'

export function renderPlayerTaskDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerTaskDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const taskId = params.id
    if (!taskId) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: task } = await supabase
      .from('tasks')
      .select('*, course_modules(name, courses(name))')
      .eq('id', taskId)
      .maybeSingle()

    if (!task) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Tarea no encontrada</p>'
      return
    }

    const courseId = (task as any).course_modules?.course_id
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .maybeSingle()

    let submission: any = null
    if (enrollment) {
      const { data } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('task_id', taskId)
        .eq('enrollment_id', enrollment.id)
        .maybeSingle()
      submission = data
    }

    const html = `
      <div class="max-w-xl mx-auto">
        <a href="#/players/tasks" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a tareas
        </a>
        <h1 class="mb-2 font-heading text-2xl font-bold text-white">${escapeHtml((task as any).title)}</h1>
        <p class="mb-6 text-sm text-zinc-500">
          ${escapeHtml((task as any).course_modules?.courses?.name || '')} / ${escapeHtml((task as any).course_modules?.name || '')}
          · Límite: ${formatDate((task as any).due_date)} ${(task as any).max_score ? `· Máx: ${(task as any).max_score} pts` : ''}
        </p>

        ${(task as any).description ? `
          <div class="glass mb-6 rounded-xl p-4">
            <h3 class="mb-2 font-medium text-white">Descripción</h3>
            <p class="text-sm text-zinc-300">${escBr((task as any).description)}</p>
          </div>` : ''}

        ${submission
          ? `<div class="glass rounded-xl p-4">
              <h3 class="mb-2 font-medium text-white">Tu entrega</h3>
              <p class="text-sm text-zinc-400">Estado: <span class="${submission.status === 'graded' ? 'text-green-400' : submission.status === 'submitted' ? 'text-blue-400' : 'text-yellow-400'}">${escapeHtml(submission.status)}</span></p>
              ${submission.text_content ? `<p class="mt-2 text-sm text-zinc-300">${escBr(submission.text_content)}</p>` : ''}
              ${submission.files && (submission.files as string[]).length > 0 ? `
                <div class="mt-3">
                  <p class="mb-1 text-xs font-medium text-zinc-400">Archivos adjuntos:</p>
                  <div class="flex flex-wrap gap-2">
                    ${(submission.files as string[]).map((f: string) => `
                      <a href="${escapeHtml(f)}" target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800">
                        ${Icon('download', 12)} ${escapeHtml(f.split('/').pop() || 'archivo')}
                      </a>
                    `).join('')}
                  </div>
                </div>` : ''}
              ${submission.score !== null ? `<p class="mt-2 text-sm">Calificación: <span class="font-bold text-white">${submission.score}</span>${(task as any).max_score ? ` / ${(task as any).max_score}` : ''}</p>` : ''}
              ${submission.feedback ? `<p class="mt-2 text-sm text-zinc-400">Feedback: ${escBr(submission.feedback)}</p>` : ''}
            </div>`
          : `<div class="glass rounded-xl p-4">
              <h3 class="mb-4 font-medium text-white">Entregar tarea</h3>
              <form id="submit-task-form" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-zinc-400">Respuesta</label>
                  <textarea name="textContent" rows="5"
                    class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"
                    placeholder="Escribe tu respuesta aquí..."></textarea>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-zinc-400">Archivos (opcional)</label>
                  <input name="files" type="file" multiple
                    class="w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-zinc-700" />
                  <p class="mt-1 text-xs text-zinc-600">PDF, imágenes, documentos (máx 50MB total)</p>
                </div>
                <p id="submit-error" class="hidden text-xs text-red-400"></p>
                <button type="submit"
                  class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                  ${Icon('upload', 14)} Entregar
                </button>
              </form>
            </div>`
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    if (!submission && enrollment) {
      document.getElementById('submit-task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)
        const fileInput = fd.get('files') as File | null
        const files: string[] = []

        if (fileInput && fileInput.size > 0) {
          const input = (e.target as HTMLFormElement).querySelector('input[name="files"]') as HTMLInputElement
          if (input?.files) {
            for (const f of Array.from(input.files)) {
              const { url, error: uploadErr } = await uploadFileFromInput('uploads', session.user.id, 'tasks', f)
              if (uploadErr) { toast('error', uploadErr); return }
              if (url) files.push(url)
            }
          }
        }

        const { error } = await supabase.from('task_submissions').insert({
          task_id: taskId,
          enrollment_id: enrollment.id,
          status: 'submitted',
          submission_text: fd.get('textContent') as string,
          files,
        })
        if (error) {
          document.getElementById('submit-error')!.textContent = error.message
          document.getElementById('submit-error')!.classList.remove('hidden')
        } else {
          toast('success', 'Tarea entregada correctamente')
          location.reload()
        }
      })
    }
  } catch (err) {
    console.error('Error loading task detail:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tarea</p>'
  }
}
