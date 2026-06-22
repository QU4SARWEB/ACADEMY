import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'
import { Breadcrumb } from '@/2b3583/breadcrumb'

const RANK_OPTIONS = ['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiante']

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

    const html = `
      <div class="mb-6">
        ${Breadcrumb([
          { label: 'Cursos', href: '#/coaches/courses' },
          { label: course.name || 'Editar' },
        ])}
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
            <label class="mb-1 block text-sm text-zinc-400">Descripción</label>
            <textarea name="description" rows="4"
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">${escapeHtml(course.description || '')}</textarea>
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
              <select name="min_rank" required
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">— Sin rango —</option>
                ${RANK_OPTIONS.map(r => `<option value="${r}" ${course.min_rank === r ? 'selected' : ''}>${r}+</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Orden de visualización</label>
              <input name="display_order" type="number" min="0" required
                class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                value="${course.display_order}">
            </div>
            <div>
              <label class="mb-1 block text-sm text-zinc-400">Precio (USD)</label>
              <div class="flex items-center gap-3">
                <input name="price" type="number" min="0" step="0.01"
                  class="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                  value="${course.price || '0'}">
                <label class="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                  <input type="checkbox" name="is_free" id="field-free" ${!course.price || course.price <= 0 ? 'checked' : ''}
                    class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]">
                  Gratis
                </label>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input name="is_active" type="checkbox" ${course.is_active ? 'checked' : ''}
                class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] outline-none">
              <span class="text-sm text-zinc-400">Activo</span>
            </label>
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

    // Free course toggle
    document.getElementById('field-free')?.addEventListener('change', function(this: HTMLInputElement) {
      const priceInput = document.querySelector<HTMLInputElement>('input[name="price"]')
      if (priceInput) {
        priceInput.disabled = this.checked
        priceInput.value = this.checked ? '0' : '1.54'
        priceInput.classList.toggle('opacity-50', this.checked)
      }
    })
    // Init free toggle state
    const freeCheck = document.getElementById('field-free') as HTMLInputElement
    if (freeCheck?.checked) {
      const priceInput = document.querySelector<HTMLInputElement>('input[name="price"]')
      if (priceInput) { priceInput.disabled = true; priceInput.classList.add('opacity-50') }
    }

    document.getElementById('edit-course-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const data: Record<string, any> = {
        name: fd.get('name'),
        description: fd.get('description'),
        duration_months: parseInt(fd.get('duration_months') as string),
        min_rank: fd.get('min_rank'),
        display_order: parseInt(fd.get('display_order') as string),
        price: fd.get('is_free') === 'on' ? 0 : (parseFloat(fd.get('price') as string) || 0),
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
