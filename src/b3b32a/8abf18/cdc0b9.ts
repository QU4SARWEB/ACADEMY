import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { router } from '@/f3395c'

export function renderCoachNewTask(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewTask(): Promise<void> {
  try {
    const { data: modules } = await supabase
      .from('exams') 
      .select('id, name, course_id, courses(name)')
      .order('course_id')
    const { data: seasons } = await supabase.from('seasons').select('id, name, is_active')

    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/tasks" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a tareas
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nueva tarea</h1>

        <form id="task-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Título</label>
            <input type="text" name="title" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Descripción</label>
            <textarea name="description" rows="4"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"></textarea>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Módulo</label>
            <select name="moduleId" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
              <option value="">Seleccionar...</option>
              ${(modules ?? []).map((m: any) =>
                `<option value="${escapeHtml(m.id)}">${escapeHtml(m.courses?.name || '')} / ${escapeHtml(m.name)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Temporada</label>
              <select name="seasonId" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Seleccionar...</option>
                ${(seasons ?? []).map((s: any) =>
                  `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}${s.is_active ? ' (Activa)' : ''}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Fecha límite</label>
              <input type="datetime-local" name="dueDate" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Puntaje máximo</label>
              <input type="number" name="maxScore" value="100" min="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Archivo adjunto (opcional)</label>
            <input type="file" name="attachment" accept=".pdf,.mp4,.png,.jpg,.jpeg,.zip"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition file:mr-3 file:rounded file:border-0 file:bg-[#8B5CF6] file:px-3 file:py-1 file:text-xs file:text-white hover:file:bg-[#7C3AED]" />
          </div>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isActive" checked
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Activa
          </label>
          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear tarea
            </button>
            <a href="#/coaches/tasks"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('task-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const file = (document.querySelector<HTMLInputElement>('input[name="attachment"]'))?.files?.[0]
      let attachmentUrl: string | null = null
      if (file) {
        const { url: fileUrl, error: fileErr } = await uploadFileFromInput('uploads', fd.get('seasonId') as string || 'tasks', 'attachments', file)
        if (fileErr) { document.getElementById('form-error')!.textContent = fileErr; document.getElementById('form-error')!.classList.remove('hidden'); return }
        attachmentUrl = fileUrl ?? null
      }
      let seasonId = fd.get('seasonId') as string
      if (!seasonId) {
        const { data: mod } = await supabase.from('exams') .select('course_id').eq('id', fd.get('moduleId')).maybeSingle()
        if (mod) {
          const { data: activeS } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()
          if (activeS) seasonId = activeS.id
        }
      }
      const { error } = await supabase.from('tasks').insert({
        module_id: fd.get('moduleId') as string,
        season_id: seasonId || null,
        title: fd.get('title') as string,
        description: (fd.get('description') as string) || null,
        due_date: fd.get('dueDate') as string,
        max_score: parseFloat(fd.get('maxScore') as string) || 100,
      })
      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Tarea creada correctamente')
        router.navigate('/coaches/tasks')
      }
    })
  } catch (err) {
    console.error('Error loading form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
