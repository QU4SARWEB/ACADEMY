import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'

export function renderCoachSeasons(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachSeasons(): Promise<void> {
  try {
    const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Temporadas</h1>
          <p class="mt-1 text-sm text-zinc-500">${(data ?? []).length} temporadas</p>
        </div>
        <button id="btn-new-season"
          class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 14)} Nueva temporada
        </button>
      </div>

      <div id="new-season-form" class="hidden mb-6 glass rounded-xl p-4">
        <h3 class="mb-3 font-medium text-white">Nueva temporada</h3>
        <form id="season-create-form" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Nombre</label>
              <input type="text" name="name" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Fecha inicio</label>
              <input type="date" name="startDate" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Fecha fin</label>
              <input type="date" name="endDate" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
          </div>
          <p id="season-form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-2">
            <button type="submit"
              class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear</button>
            <button type="button" id="btn-cancel-season"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          </div>
        </form>
      </div>

      <div class="space-y-3">
        ${(data ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay temporadas.</p>'
          : (data ?? []).map((s: any) => `
            <div class="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 class="font-medium text-white">${escapeHtml(s.name)}</h3>
                <p class="mt-0.5 text-xs text-zinc-500">${formatDate(s.start_date)} - ${formatDate(s.end_date)}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs ${s.is_active ? 'text-green-400' : 'text-zinc-500'}">${s.is_active ? 'Activa' : 'Inactiva'}</span>
                <button class="btn-toggle-season rounded-lg border px-3 py-1 text-xs transition ${s.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}" data-id="${escapeHtml(s.id)}" data-active="${s.is_active}">
                  ${s.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('btn-new-season')?.addEventListener('click', () => {
      const form = document.getElementById('new-season-form')
      if (form) form.classList.toggle('hidden')
    })

    document.getElementById('btn-cancel-season')?.addEventListener('click', () => {
      document.getElementById('new-season-form')?.classList.add('hidden')
    })

    document.getElementById('season-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const { error } = await supabase.from('seasons').insert({
        name: fd.get('name') as string,
        start_date: fd.get('startDate') as string,
        end_date: fd.get('endDate') as string,
      })
      if (error) {
        const errEl = document.getElementById('season-form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
      } else {
        toast('success', 'Temporada creada')
        document.getElementById('new-season-form')?.classList.add('hidden')
        initCoachSeasons()
      }
    })

    document.querySelectorAll('.btn-toggle-season').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id
        const current = (btn as HTMLElement).dataset.active === 'true'
        if (!id) return
        const { error } = await supabase.from('seasons').update({ is_active: !current }).eq('id', id)
        if (error) toast('error', error.message)
        else initCoachSeasons()
      })
    })
  } catch (err) {
    console.error('Error loading seasons:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar temporadas</p>'
  }
}
