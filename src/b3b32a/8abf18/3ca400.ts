import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'

export function renderCoachNewSeason(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachNewSeason(): Promise<void> {
  try {
    const html = `
      <div class="max-w-2xl">
        <a href="#/coaches/seasons" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a temporadas
        </a>
        <h1 class="mb-6 font-heading text-2xl font-bold text-white">Nueva temporada</h1>

        <form id="season-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Nombre</label>
            <input type="text" name="name" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Fecha inicio</label>
              <input type="date" name="startDate" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-zinc-400">Fecha fin</label>
              <input type="date" name="endDate" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-[#8B5CF6]" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="isActive"
              class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6] focus:ring-[#8B5CF6]" />
            Temporada activa
          </label>

          <p id="form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-3">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Crear temporada
            </button>
            <a href="#/coaches/seasons"
              class="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800">
              Cancelar
            </a>
          </div>
        </form>
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('season-form')!.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)

      const { error } = await supabase.from('seasons').insert({
        name: fd.get('name') as string,
        start_date: fd.get('startDate') as string,
        end_date: fd.get('endDate') as string,
        is_active: fd.get('isActive') === 'on',
      })

      if (error) {
        document.getElementById('form-error')!.textContent = error.message
        document.getElementById('form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Temporada creada correctamente')
        router.navigate('/coaches/seasons')
      }
    })
  } catch (err) {
    console.error('Error loading season form:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el formulario</p>'
  }
}
