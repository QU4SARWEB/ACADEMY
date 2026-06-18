import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachQuestionDetail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachQuestionDetail(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: q } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!q) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Pregunta no encontrada.</p>'
      return
    }

    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/questions" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a preguntas
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Editar pregunta</h1>

        <form id="question-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Texto de la pregunta</label>
            <textarea name="text" rows="4" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">${escapeHtml(q.text)}</textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Tipo</label>
              <select name="type" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="multiple_choice" ${q.type === 'multiple_choice' ? 'selected' : ''}>Opción múltiple</option>
                <option value="true_false" ${q.type === 'true_false' ? 'selected' : ''}>Verdadero/Falso</option>
                <option value="open_ended" ${q.type === 'open_ended' ? 'selected' : ''}>Desarrollo</option>
                <option value="short_answer" ${q.type === 'short_answer' ? 'selected' : ''}>Respuesta corta</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Categoría</label>
              <input type="text" name="category" value="${escapeHtml(q.category || '')}"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isActive" ${q.is_active ? 'checked' : ''}
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Activa
          </label>
          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Guardar cambios
            </button>
            <a href="#/coaches/questions"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('question-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const { error } = await supabase
        .from('questions')
        .update({
          text: fd.get('text') as string,
          type: fd.get('type') as string,
          category: (fd.get('category') as string) || null,
          is_active: fd.get('isActive') === 'on',
        })
        .eq('id', id)
      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Pregunta actualizada correctamente')
        router.navigate('/coaches/questions')
      }
    })
  } catch (err) {
    console.error('Error loading question:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar pregunta</p>'
  }
}
