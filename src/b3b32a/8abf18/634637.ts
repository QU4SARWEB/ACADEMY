import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachScrims(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachScrims(): Promise<void> {
  try {
    const { data: scrims } = await supabase
      .from('scrims')
      .select('*, teams(name), seasons(name)')
      .order('scheduled_at', { ascending: false })

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')

    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name')
      .order('start_date', { ascending: false })

    const container = document.getElementById('page-content')!

    container.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Scrims</h1>
          <p class="mt-1 text-sm text-zinc-500">${(scrims ?? []).length} scrims</p>
        </div>
        <button id="btn-new-scrim"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nuevo scrim
        </button>
      </div>

      <div id="scrim-form-container" class="hidden mb-6"></div>

      <div id="scrims-list" class="space-y-3">
        ${(scrims ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay scrims registrados.</p>'
          : (scrims ?? []).map((s: any) => {
              const resultLabel = !s.result ? 'Pendiente'
                : s.result === 'win' ? 'Victoria'
                : s.result === 'loss' ? 'Derrota'
                : s.result === 'draw' ? 'Empate'
                : escapeHtml(s.result)
              const resultColor = s.result === 'win' ? 'text-green-400'
                : s.result === 'loss' ? 'text-red-400'
                : 'text-yellow-400'
              return `
                <div class="glass rounded-xl p-4" data-scrim-id="${escapeHtml(s.id)}">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-medium text-white">vs ${escapeHtml(s.rival || s.opponent || 'Desconocido')}</h3>
                        <span class="text-xs rounded-full px-2 py-0.5 ${resultColor}">${resultLabel}</span>
                      </div>
                      <p class="mt-0.5 text-xs text-zinc-500">
                        ${escapeHtml(s.teams?.name || 'Sin equipo')}
                        ${s.seasons?.name ? ' · ' + escapeHtml(s.seasons.name) : ''}
                        · ${formatDate(s.scheduled_at)}
                        ${s.score_quasar != null && s.score_opponent != null ? ` · ${s.score_quasar} - ${s.score_opponent}` : ''}
                      </p>
                      ${s.notes ? `<p class="mt-1 text-xs text-zinc-600">${escBr(s.notes)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2 ml-4">
                      <button class="btn-delete-scrim text-red-400 hover:text-red-300" data-scrim-id="${escapeHtml(s.id)}">
                        ${Icon('trash', 14)}
                      </button>
                    </div>
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    function renderScrimForm(): string {
      const teamsOptions = (teams ?? []).map((t: any) =>
        `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`
      ).join('')
      const seasonsOptions = (seasons ?? []).map((s: any) =>
        `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`
      ).join('')
      return `
        <div class="glass rounded-xl p-4">
          <h3 class="mb-3 font-medium text-white">Nuevo scrim</h3>
          <form id="scrim-form" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Equipo</label>
                <select name="teamId" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar equipo...</option>
                  ${teamsOptions || '<option value="" disabled>No hay equipos</option>'}
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Temporada</label>
                <select name="seasonId" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar temporada...</option>
                  ${seasonsOptions || '<option value="" disabled>No hay temporadas</option>'}
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Oponente</label>
                <input type="text" name="opponent" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Fecha y hora</label>
                <input type="datetime-local" name="scheduledAt" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Resultado</label>
                <select name="result"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Pendiente</option>
                  <option value="win">Victoria</option>
                  <option value="loss">Derrota</option>
                  <option value="draw">Empate</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Puntaje QU4SAR</label>
                <input type="number" name="qu4sarScore"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Puntaje oponente</label>
                <input type="number" name="opponentScore"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Notas</label>
              <textarea name="notes" rows="2"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
            </div>
            <div class="flex gap-2">
              <button type="submit"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear scrim</button>
              <button type="button" id="btn-cancel-scrim-form"
                class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
            <p id="scrim-form-error" class="hidden text-xs text-red-400"></p>
          </form>
        </div>`
    }

    document.getElementById('btn-new-scrim')?.addEventListener('click', () => {
      const formContainer = document.getElementById('scrim-form-container')!
      formContainer.innerHTML = renderScrimForm()
      formContainer.classList.remove('hidden')

      document.getElementById('btn-cancel-scrim-form')?.addEventListener('click', () => {
        formContainer.classList.add('hidden')
      })

      document.getElementById('scrim-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)

        const payload: Record<string, any> = {
          team_id: fd.get('teamId'),
          season_id: fd.get('seasonId'),
          rival: fd.get('opponent'),
          scheduled_at: fd.get('scheduledAt'),
          result: (fd.get('result') as string) || null,
          score_quasar: (fd.get('qu4sarScore') as string) ? parseInt(fd.get('qu4sarScore') as string) : null,
          score_opponent: (fd.get('opponentScore') as string) ? parseInt(fd.get('opponentScore') as string) : null,
          notes: (fd.get('notes') as string) || null,
        }

        if (!payload.team_id || !payload.season_id || !payload.rival || !payload.scheduled_at) {
          toast('warning', 'Completa los campos obligatorios')
          return
        }

        const { error } = await supabase.from('scrims').insert(payload)

        if (error) {
          const errEl = document.getElementById('scrim-form-error')!
          errEl.textContent = error.message
          errEl.classList.remove('hidden')
        } else {
          toast('success', 'Scrim creado')
          formContainer.classList.add('hidden')
          await initCoachScrims()
        }
      })
    })

    document.getElementById('scrims-list')?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement

      const deleteBtn = target.closest('.btn-delete-scrim') as HTMLElement
      if (deleteBtn) {
        const scrimId = deleteBtn.dataset.scrimId
        if (!scrimId || !(await confirmDialog('¿Eliminar este scrim?'))) return
        const { error } = await supabase.from('scrims').delete().eq('id', scrimId)
        if (error) toast('error', error.message)
        else {
          toast('success', 'Scrim eliminado')
          await initCoachScrims()
        }
        return
      }
    })
  } catch (err) {
    console.error('Error loading scrims:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar scrims</p>'
  }
}
