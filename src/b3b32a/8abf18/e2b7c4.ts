import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachEditCourse(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachEditCourse(): Promise<void> {
  try {
    const params = router.getParams()
    const id = params.id
    if (!id) return

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!course) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Curso no encontrado</p>'
      return
    }

    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name')
      .order('name')

    const html = `
      <div class="mb-6">
        <a href="#/coaches/courses/${escapeHtml(id)}" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver al curso
        </a>
        <h1 class="font-heading text-2xl font-bold text-white">Editar curso</h1>
      </div>

      <div class="glass max-w-2xl rounded-xl p-6">
        <form id="edit-course-form">
          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Nombre</label>
            <input name="name" required maxlength="200"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
              value="${escapeHtml(course.name)}">
          </div>

          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Slug (URL amigable)</label>
            <input name="slug" maxlength="200"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
              value="${escapeHtml(course.slug || '')}">
          </div>

          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Descripción</label>
            <textarea name="description" rows="4"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(course.description || '')}</textarea>
          </div>

          <div class="mb-4">
            <label class="mb-1 block text-sm text-zinc-400">Temporada</label>
            <select name="season_id" required
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
              ${(seasons ?? []).map((s: any) => `
                <option value="${escapeHtml(s.id)}" ${s.id === course.season_id ? 'selected' : ''}>${escapeHtml(s.name)}</option>
              `).join('')}
            </select>
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Duración (meses)</label>
              <input name="duration_months" type="number" min="1" required
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                value="${course.duration_months}">
            </div>
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Rango mínimo</label>
              <input name="min_rank" required maxlength="50"
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                value="${escapeHtml(course.min_rank)}">
            </div>
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Orden de visualización</label>
              <input name="display_order" type="number" min="0" required
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                value="${course.display_order}">
            </div>
            <div class="flex items-end pb-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input name="is_active" type="checkbox" ${course.is_active ? 'checked' : ''}
                  class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
                <span class="text-sm text-zinc-400">Activo</span>
              </label>
            </div>
          </div>

          <p id="form-error" class="mb-4 text-sm text-red-400 hidden"></p>

          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              ${Icon('edit', 14)} Guardar cambios
            </button>
            <a href="#/coaches/courses/${escapeHtml(id)}"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">Cancelar</a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('edit-course-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const data: Record<string, any> = {
        name: fd.get('name'),
        slug: (fd.get('slug') as string) || ((fd.get('name') as string) || '').toLowerCase().replace(/\s+/g, '-'),
        description: fd.get('description'),
        season_id: fd.get('season_id'),
        duration_months: parseInt(fd.get('duration_months') as string),
        min_rank: fd.get('min_rank'),
        display_order: parseInt(fd.get('display_order') as string),
        is_active: fd.get('is_active') === 'on',
      }

      const { error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', id)

      if (error) {
        const errEl = document.getElementById('form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
        return
      }

      toast('success', 'Curso actualizado correctamente')
      router.navigate(`/coaches/courses/${escapeHtml(id)}`)
    })
  } catch (err) {
    console.error('Error loading edit course:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
