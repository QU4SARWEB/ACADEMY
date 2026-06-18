import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachNewCourse(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewCourse(): Promise<void> {
  try {
    const { data: seasons } = await supabase.from('seasons').select('id, name').eq('is_active', true).order('name')

    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/courses" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a cursos
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nuevo curso</h1>

        <form id="course-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Nombre del curso</label>
            <input type="text" name="name" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Slug</label>
            <input type="text" name="slug"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"
              placeholder="nombre-del-curso" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Descripción</label>
            <textarea name="description" rows="4"
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Temporada</label>
              <select name="seasonId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]">
                <option value="">Sin temporada</option>
                ${(seasons ?? []).map((s: any) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Duración (meses)</label>
              <input type="number" name="durationMonths" value="3" min="1" max="24"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Rango mínimo</label>
              <input type="text" name="minRank"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]"
                placeholder="Ej: Plata" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Orden de visualización</label>
              <input type="number" name="displayOrder" value="0"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isActive" checked
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Curso activo
          </label>

          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear curso
            </button>
            <a href="#/coaches/courses"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('course-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)

      const name = fd.get('name') as string
      const slug = (fd.get('slug') as string) || name.toLowerCase().replace(/\s+/g, '-')
      const { error } = await supabase.from('courses').insert({
        name,
        slug,
        description: (fd.get('description') as string) || null,
        season_id: (fd.get('seasonId') as string) || null,
        duration_months: parseInt(fd.get('durationMonths') as string) || 3,
        min_rank: (fd.get('minRank') as string) || '',
        display_order: parseInt(fd.get('displayOrder') as string) || 0,
        is_active: fd.get('isActive') === 'on',
      })

      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Curso creado correctamente')
        router.navigate('/coaches/courses')
      }
    })
  } catch (err) {
    console.error('Error loading form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
