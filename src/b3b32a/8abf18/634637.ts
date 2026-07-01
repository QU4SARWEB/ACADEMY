import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml, escBr } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

export function renderCoachScrims(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachScrims(): Promise<void> {
  try {
    const { data: scrims } = await supabase
      .from('scrims')
      .select('*, teams(name, logo_url, color)')
      .order('date', { ascending: false })

    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, logo_url, color')

    const { data: seasons } = await supabase
      .from('courses')
      .select('id, name')
      .order('start_date', { ascending: false })

    const container = document.getElementById('page-content')!

    container.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Enfrentamientos</h1>
          <p class="mt-1 text-sm text-zinc-500">${(scrims ?? []).length} enfrentamientos</p>
        </div>
        <button id="btn-new-scrim"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nuevo enfrentamiento
        </button>
      </div>

      <div id="scrim-form-container" class="hidden mb-6"></div>

      <div id="scrims-list" class="space-y-3">
        ${(scrims ?? []).length === 0
          ? '          <p class="text-sm text-zinc-500">No hay enfrentamientos registrados.</p>'
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
                        ${s.teams?.logo_url
                          ? `<img src="${escapeHtml(s.teams.logo_url)}" alt="" class="h-6 w-6 rounded object-cover" />`
                          : `<div class="flex h-6 w-6 items-center justify-center rounded" style="background:${s.teams?.color || '#8B5CF6'}20;color:${s.teams?.color || '#8B5CF6'}">${Icon('users', 12)}</div>`
                        }
                        <h3 class="font-medium text-white">vs
                          ${s.opponent_logo_url
                            ? `<img src="${escapeHtml(s.opponent_logo_url)}" alt="" class="inline h-5 w-5 rounded object-cover align-middle" />`
                            : ''
                          }
                          ${s.opponent_tag ? `<span class="text-zinc-400">${escapeHtml(s.opponent_tag)}</span> | ` : ''}${escapeHtml(s.opponent || 'Desconocido')}
                        </h3>
                        <span class="text-xs rounded-full px-2 py-0.5 ${resultColor}">${resultLabel}</span>
                      </div>
                      <p class="mt-0.5 text-xs text-zinc-500">
                        ${s.teams?.tag ? `<span class="text-zinc-500">${escapeHtml(s.teams.tag)}</span> | ` : ''}${escapeHtml(s.teams?.name || 'Sin equipo')}
                        ${s.type ? ` · <span class="${s.type === 'torneo' ? 'text-amber-400' : 'text-zinc-400'}">${escapeHtml(s.type)}</span>` : ''}
          ${s.map ? ` · ${Icon('map', 10)} ${escapeHtml(s.map)}` : ''}
                        · ${formatDate(s.date)}
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
      return `
        <div class="glass rounded-xl p-4">
          <h3 class="mb-3 font-medium text-white">Nuevo enfrentamiento</h3>
          <form id="scrim-form" class="space-y-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Equipo</label>
                <input type="hidden" name="teamId" id="scrim-team-id" value="" />
                <div class="flex flex-wrap gap-2">
                  ${(teams ?? []).map((t: any) =>
                    `<button type="button" class="scrim-team-btn rounded-xl border px-3 py-1.5 text-xs transition hover:border-[#8B5CF6] hover:text-white border-zinc-700 text-zinc-300 hover:text-white bg-zinc-900/50"
                      data-team-id="${escapeHtml(t.id)}">${escapeHtml(t.name)}</button>`
                  ).join('')}
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Oponente</label>
                <input type="text" name="opponent" required
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Tag del oponente</label>
                <input type="text" name="opponentTag" placeholder="Ej: QSR"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Logo del oponente</label>
                <div class="flex items-center gap-2">
                  <img id="scrim-opponent-logo-preview" class="hidden h-8 w-8 rounded object-cover" />
                  <input type="file" id="scrim-opponent-logo-input" accept="image/*"
                    class="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CF6] file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-[#7C3AED]" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
                <select name="encounterType"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="scrim">Scrim</option>
                  <option value="torneo">Torneo</option>
                  <option value="liga">Liga</option>
                  <option value="amistoso">Amistoso</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-400">Mapa</label>
                <select name="map"
                  class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Seleccionar mapa...</option>
                  <option value="Ascent">Ascent</option>
                  <option value="Bind">Bind</option>
                  <option value="Haven">Haven</option>
                  <option value="Split">Split</option>
                  <option value="Icebox">Icebox</option>
                  <option value="Breeze">Breeze</option>
                  <option value="Fracture">Fracture</option>
                  <option value="Pearl">Pearl</option>
                  <option value="Lotus">Lotus</option>
                  <option value="Sunset">Sunset</option>
                  <option value="Abyss">Abyss</option>
                  <option value="Glacier">Glacier</option>
                  <option value="Summit">Summit</option>
                  <option value="District">District</option>
                </select>
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
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear enfrentamiento</button>
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

      // Opponent logo preview
      document.getElementById('scrim-opponent-logo-input')?.addEventListener('change', function(this: HTMLInputElement) {
        const preview = document.getElementById('scrim-opponent-logo-preview')!
        if (this.files?.[0]) {
          preview.classList.remove('hidden')
          preview.setAttribute('src', URL.createObjectURL(this.files[0]))
        }
      })

      document.getElementById('btn-cancel-scrim-form')?.addEventListener('click', () => {
        formContainer.classList.add('hidden')
      })

      formContainer.querySelectorAll('.scrim-team-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          formContainer.querySelectorAll('.scrim-team-btn').forEach(b => {
            b.classList.remove('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
            b.classList.add('border-zinc-700', 'text-zinc-300')
          })
          btn.classList.add('bg-[#8B5CF6]/20', 'border-[#8B5CF6]', 'text-white')
          btn.classList.remove('border-zinc-700', 'text-zinc-300')
          ;(formContainer.querySelector('#scrim-team-id') as HTMLInputElement)!.value = (btn as HTMLElement).dataset.teamId || ''
        })
      })

      document.getElementById('scrim-form')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const fd = new FormData(e.target as HTMLFormElement)

        let opponentLogoUrl: string | null = null
        const logoInput = document.getElementById('scrim-opponent-logo-input') as HTMLInputElement
        if (logoInput?.files?.[0]) {
          const { url, error: upErr } = await uploadFileFromInput('uploads', 'scrims', 'opponents', logoInput.files[0])
          if (upErr) { toast('error', 'Error al subir logo: ' + upErr); return }
          opponentLogoUrl = url || null
        }

        const payload: Record<string, any> = {
          team_id: (document.getElementById('scrim-team-id') as HTMLInputElement)?.value || fd.get('teamId'),
          opponent: fd.get('opponent'),
          date: fd.get('scheduledAt'),
          result: (fd.get('result') as string) || null,
          score_quasar: (fd.get('qu4sarScore') as string) ? parseInt(fd.get('qu4sarScore') as string) : null,
          score_opponent: (fd.get('opponentScore') as string) ? parseInt(fd.get('opponentScore') as string) : null,
          notes: (fd.get('notes') as string) || null,
          type: (fd.get('encounterType') as string) || null,
          map: (fd.get('map') as string) || null,
          opponent_tag: (fd.get('opponentTag') as string)?.trim() || null,
          opponent_logo_url: opponentLogoUrl,
        }

        if (!payload.team_id || !payload.opponent || !payload.date) {
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
        else { toast('success', 'Scrim eliminado'); await initCoachScrims() }
        return
      }
    })
  } catch (err) {
    console.error('Error loading scrims:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar scrims</p>'
  }
}
