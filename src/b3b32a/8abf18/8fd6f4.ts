import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

const TEAM_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16']

export function renderCoachTeams(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTeams(): Promise<void> {
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    const teamIds = (teams ?? []).map((t: any) => t.id)

    let membersByTeam: Record<string, any[]> = {}
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from('team_members')
        .select('*, profiles(full_name, avatar_url, riot_id, rank)')
        .in('team_id', teamIds)
        .order('role')

      for (const m of members ?? []) {
        if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
        membersByTeam[m.team_id].push(m)
      }
    }

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['player', 'student'])
      .order('full_name')

    const { data: allSeasons } = await supabase
      .from('courses')
      .select('id, name, is_active')

    const container = document.getElementById('page-content')!
    const teamCards = (teams ?? []).map((t: any) => {
      const teamMembers = membersByTeam[t.id] || []
      return `
        <div class="glass rounded-xl p-4" data-team-id="${escapeHtml(t.id)}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              ${t.logo_url
                ? `<img src="${escapeHtml(t.logo_url)}" alt="" class="h-10 w-10 rounded-lg object-cover" />`
                : `<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background:${t.color || '#8B5CF6'}20;color:${t.color || '#8B5CF6'}">${Icon('users', 18)}</div>`
              }
              <div>
                <h3 class="font-medium text-white">${t.tag ? `<span class="text-zinc-400">${escapeHtml(t.tag)}</span> | ` : ''}${escapeHtml(t.name)}</h3>
                <p class="mt-0.5 text-xs text-zinc-500">${teamMembers.length} miembros${t.type ? ` · <span class="${t.type === 'competitivo' ? 'text-red-400' : 'text-blue-400'}">${escapeHtml(t.type)}</span>` : ''}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-edit-team text-zinc-500 hover:text-white transition" data-team-id="${escapeHtml(t.id)}" data-team='${escapeHtml(JSON.stringify({ name: t.name, tag: t.tag || '', color: t.color || '#8B5CF6', logo_url: t.logo_url || '', type: t.type || '' }))}'>
                ${Icon('edit', 14)}
              </button>
              <button class="btn-delete-team text-red-400 hover:text-red-300" data-team-id="${escapeHtml(t.id)}" data-team-name="${escapeHtml(t.name)}">
                ${Icon('trash', 14)}
              </button>
              <button class="btn-toggle-members text-xs text-purple-400 hover:text-purple-300" data-team-id="${escapeHtml(t.id)}">
                ${Icon('users', 14)} Ver miembros
              </button>
            </div>
          </div>

          <div class="team-members hidden mt-4 space-y-3" data-team-id="${escapeHtml(t.id)}">
            ${teamMembers.length === 0
              ? '<p class="text-xs text-zinc-500">Sin miembros.</p>'
              : teamMembers.map((m: any) => {
                  const name = m.profiles?.full_name || 'Desconocido'
                  return `
                    <div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-white">${t.tag ? `<span class="text-zinc-400">${escapeHtml(t.tag)}</span> | ` : ''}${escapeHtml(name)}</span>
                        ${m.role
                          ? `<span class="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] text-zinc-300">${escapeHtml(m.role)}</span>`
                          : '<span class="text-[10px] text-zinc-600">Sin rol</span>'
                        }
                        <button class="btn-edit-role text-zinc-500 hover:text-purple-400 transition" data-member-id="${escapeHtml(m.id)}" data-role="${escapeHtml(m.role || '')}">
                          ${Icon('edit', 12)}
                        </button>
                        ${m.profiles?.riot_id ? `<span class="text-xs text-zinc-600">${escapeHtml(m.profiles.riot_id)}</span>` : ''}
                        ${m.profiles?.rank ? `<span class="text-xs text-zinc-600">${escapeHtml(m.profiles.rank)}</span>` : ''}
                      </div>
                      <button class="btn-remove-member text-red-400 hover:text-red-300" data-member-id="${escapeHtml(m.id)}" data-name="${escapeHtml(name)}">
                        ${Icon('trash', 14)}
                      </button>
                    </div>`
                }).join('')
            }

            <div class="mt-3 flex items-center gap-2">
              <select class="add-member-select flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]" data-team-id="${escapeHtml(t.id)}">
                <option value="">Seleccionar jugador...</option>
                ${(allProfiles ?? [])
                  .filter((p: any) => {
                    if (t.type === 'academico') return p.role === 'student'
                    if (t.type === 'competitivo') return p.role === 'player'
                    return true
                  })
                  .map((p: any) =>
                  `<option value="${escapeHtml(p.id)}">${escapeHtml(p.full_name || 'Desconocido')}</option>`
                ).join('')}
              </select>
              <select class="add-member-role rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6] w-28" data-team-id="${escapeHtml(t.id)}">
                <option value="">Rol</option>
                <option value="Duelista">Duelista</option>
                <option value="Iniciador">Iniciador</option>
                <option value="Controlador">Controlador</option>
                <option value="Centinela">Centinela</option>
                <option value="Flex">Flex</option>
              </select>
              <button class="btn-add-member rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs text-white hover:bg-[#7C3AED]" data-team-id="${escapeHtml(t.id)}">${Icon('plus', 14)}</button>
              <button class="btn-bulk-add text-xs text-purple-400 hover:text-purple-300 transition" data-team-id="${escapeHtml(t.id)}" data-team-name="${escapeHtml(t.name)}">${Icon('listChecks', 14)} Masivo</button>
            </div>
          </div>
        </div>`
    }).join('')

    container.innerHTML = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Equipos</h1>
          <p class="mt-1 text-sm text-zinc-500">${(teams ?? []).length} equipos</p>
        </div>
        <button id="btn-new-team"
          class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 16)} Nuevo equipo
        </button>
      </div>
      <div class="mb-4 flex items-center gap-2">
        <button id="btn-auto-assign" class="rounded-lg border border-purple-500/30 px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/10 transition flex items-center gap-1">
          ${Icon('zap', 14)} Asignación automática
        </button>
      </div>

      <div id="new-team-form" class="hidden mb-6 glass rounded-xl p-4">
        <h3 class="mb-3 font-medium text-white">Nuevo equipo</h3>
        <form id="team-create-form" class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Nombre</label>
              <input type="text" name="name" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Tag</label>
              <input type="text" name="tag" placeholder="Ej: QSR"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
              <select name="type"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Seleccionar...</option>
                <option value="academico">Académico</option>
                <option value="competitivo">Competitivo</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Color del equipo</label>
              <div class="flex flex-wrap gap-2" id="team-color-picker">
                ${TEAM_COLORS.map(c => `
                  <button type="button" class="team-color-btn h-7 w-7 rounded-full border-2 transition hover:scale-110" style="background:${c};border-color:${c}"
                    data-color="${c}"></button>
                `).join('')}
                <input type="color" name="color" id="team-color-input" value="#8B5CF6"
                  class="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent" />
              </div>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Logo del equipo</label>
            <div class="flex items-center gap-3">
              <img id="team-logo-preview" class="hidden h-14 w-14 rounded-lg object-cover" />
              <input type="file" id="team-logo-input" accept="image/*"
                class="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CF6] file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-[#7C3AED]" />
            </div>
          </div>
          <p id="team-form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-2">
            <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear</button>
            <button type="button" id="btn-cancel-team" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          </div>
        </form>
      </div>

      <div id="teams-list" class="space-y-4">${teamCards || '<p class="text-sm text-zinc-500">No hay equipos.</p>'}</div>`

    const editTeamModalHtml = `
      <div id="edit-team-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60" role="dialog">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="glass max-w-md w-full rounded-xl p-6">
          <h3 class="mb-3 font-medium text-white">Editar equipo</h3>
          <form id="team-edit-form" class="space-y-3">
            <input type="hidden" name="editTeamId" id="edit-team-id" />
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Nombre</label>
              <input type="text" name="editName" id="edit-team-name" required
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Tag</label>
              <input type="text" name="editTag" id="edit-team-tag" placeholder="Ej: QSR"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Tipo</label>
              <select name="editType" id="edit-type-select"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Seleccionar...</option>
                <option value="academico">Académico</option>
                <option value="competitivo">Competitivo</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Color del equipo</label>
              <div class="flex flex-wrap gap-2" id="edit-color-picker">
                ${TEAM_COLORS.map(c => `
                  <button type="button" class="edit-color-btn h-7 w-7 rounded-full border-2 transition hover:scale-110" style="background:${c};border-color:${c}"
                    data-color="${c}"></button>
                `).join('')}
                <input type="color" name="editColor" id="edit-color-input" value="#8B5CF6"
                  class="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs text-zinc-400">Logo</label>
              <div class="flex items-center gap-3">
                <img id="edit-logo-preview" class="hidden h-14 w-14 rounded-lg object-cover" />
                <input type="file" id="edit-logo-input" accept="image/*"
                  class="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CF6] file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-[#7C3AED]" />
              </div>
            </div>
            <p id="edit-form-error" class="hidden text-xs text-red-400"></p>
            <div class="flex gap-2">
              <button type="submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Guardar</button>
              <button type="button" id="btn-cancel-edit" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
            </div>
          </form>
        </div>
        </div>
      </div>`
    document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', editTeamModalHtml)

    const bulkModalHtml = `
      <div id="bulk-add-modal" class="fixed inset-0 z-50 hidden overflow-y-auto bg-black/60" role="dialog">
        <div class="flex min-h-full items-center justify-center p-4">
        <div class="glass max-w-lg w-full rounded-xl p-6">
          <h3 class="mb-3 font-medium text-white" id="bulk-modal-title">Agregar miembros</h3>
          <div class="mb-3 flex items-center gap-2">
            <label class="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" id="bulk-select-all" class="rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" />
              Seleccionar todos
            </label>
          </div>
          <div id="bulk-profile-list" class="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900/50 p-2"></div>
          <div class="mt-3 flex items-center gap-2">
            <select id="bulk-role-select" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]">
              <option value="">Sin rol</option>
              <option value="Duelista">Duelista</option>
              <option value="Iniciador">Iniciador</option>
              <option value="Controlador">Controlador</option>
              <option value="Centinela">Centinela</option>
              <option value="Flex">Flex</option>
            </select>
          </div>
          <p id="bulk-form-error" class="mt-2 hidden text-xs text-red-400"></p>
          <div class="mt-4 flex gap-2">
            <button id="btn-bulk-submit" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Agregar seleccionados</button>
            <button id="btn-bulk-cancel" class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          </div>
        </div>
        </div>
      </div>`
    document.getElementById('modal-root')!.insertAdjacentHTML('beforeend', bulkModalHtml)
    // --- Event handlers ---

    // Color picker (create)
    let selectedColor = '#8B5CF6'
    document.querySelectorAll('#team-color-picker .team-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#team-color-picker .team-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'))
        btn.classList.add('ring-2', 'ring-white')
        selectedColor = (btn as HTMLElement).dataset.color || '#8B5CF6'
        document.getElementById('team-color-input')!.setAttribute('value', selectedColor)
      })
    })
    document.getElementById('team-color-input')?.addEventListener('input', (e) => {
      selectedColor = (e.target as HTMLInputElement).value
      document.querySelectorAll('#team-color-picker .team-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'))
    })

    // Color picker (edit)
    let editSelectedColor = '#8B5CF6'
    document.querySelectorAll('#edit-color-picker .edit-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#edit-color-picker .edit-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'))
        btn.classList.add('ring-2', 'ring-white')
        editSelectedColor = (btn as HTMLElement).dataset.color || '#8B5CF6'
        document.getElementById('edit-color-input')!.setAttribute('value', editSelectedColor)
      })
    })
    document.getElementById('edit-color-input')?.addEventListener('input', (e) => {
      editSelectedColor = (e.target as HTMLInputElement).value
      document.querySelectorAll('#edit-color-picker .edit-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'))
    })

    // Logo preview (create)
    document.getElementById('team-logo-input')?.addEventListener('change', function(this: HTMLInputElement) {
      const preview = document.getElementById('team-logo-preview')!
      if (this.files?.[0]) {
        preview.classList.remove('hidden')
        preview.setAttribute('src', URL.createObjectURL(this.files[0]))
      }
    })

    // Logo preview (edit)
    document.getElementById('edit-logo-input')?.addEventListener('change', function(this: HTMLInputElement) {
      const preview = document.getElementById('edit-logo-preview')!
      if (this.files?.[0]) {
        preview.classList.remove('hidden')
        preview.setAttribute('src', URL.createObjectURL(this.files[0]))
      }
    })

    // Toggle new team form
    document.getElementById('btn-new-team')?.addEventListener('click', () => {
      document.getElementById('new-team-form')?.classList.toggle('hidden')
    })
    document.getElementById('btn-cancel-team')?.addEventListener('click', () => {
      document.getElementById('new-team-form')?.classList.add('hidden')
    })

    // Create team
    document.getElementById('team-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const name = (fd.get('name') as string)?.trim()
      if (!name) return

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
      let logoUrl: string | null = null
      const logoInput = document.getElementById('team-logo-input') as HTMLInputElement
      if (logoInput?.files?.[0]) {
        const { url, error: upErr } = await uploadFileFromInput('uploads', 'teams', 'logos', logoInput.files[0])
        if (upErr) { toast('error', 'Error al subir logo: ' + upErr); return }
        logoUrl = url || null
      }

      const { error } = await supabase.from('teams').insert({
        name, slug,
        tag: (fd.get('tag') as string)?.trim() || null,
        logo_url: logoUrl,
        color: selectedColor,
        type: (fd.get('type') as string) || null,
      })

      if (error) {
        const errEl = document.getElementById('team-form-error')!
        errEl.textContent = error.message
        errEl.classList.remove('hidden')
      } else {
        toast('success', 'Equipo creado correctamente')
        await initCoachTeams()
      }
    })

    // Edit team - open modal
    document.querySelectorAll('.btn-edit-team').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = JSON.parse((btn as HTMLElement).dataset.team || '{}')
        document.getElementById('edit-team-id')!.setAttribute('value', (btn as HTMLElement).dataset.teamId || '')
        document.getElementById('edit-team-name')!.setAttribute('value', data.name || '')
        document.getElementById('edit-team-tag')!.setAttribute('value', data.tag || '')
        const typeSelect = document.getElementById('edit-type-select') as HTMLSelectElement
        if (typeSelect) typeSelect.value = data.type || ''
        editSelectedColor = data.color || '#8B5CF6'
        document.getElementById('edit-color-input')!.setAttribute('value', editSelectedColor)
        document.querySelectorAll('.edit-color-btn').forEach(b => {
          b.classList.toggle('ring-2', (b as HTMLElement).dataset.color === editSelectedColor)
          b.classList.toggle('ring-white', (b as HTMLElement).dataset.color === editSelectedColor)
        })
        const preview = document.getElementById('edit-logo-preview')!
        if (data.logo_url) {
          preview.classList.remove('hidden')
          preview.setAttribute('src', data.logo_url)
        } else {
          preview.classList.add('hidden')
        }
        document.getElementById('edit-team-modal')!.classList.remove('hidden')
      })
    })

    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
      document.getElementById('edit-team-modal')!.classList.add('hidden')
    })
    document.getElementById('edit-team-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('edit-team-modal')!.classList.add('hidden')
    })

    // Save edit
    document.getElementById('team-edit-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const teamId = fd.get('editTeamId') as string
      const name = (fd.get('editName') as string)?.trim()
      if (!teamId || !name) return

      let logoUrl: string | null = null
      const logoInput = document.getElementById('edit-logo-input') as HTMLInputElement
      if (logoInput?.files?.[0]) {
        const { url, error: upErr } = await uploadFileFromInput('uploads', 'teams', 'logos', logoInput.files[0])
        if (upErr) { toast('error', 'Error al subir logo: ' + upErr); return }
        logoUrl = url || null
      }

      const editType = fd.get('editType') as string || null
      const editTag = (fd.get('editTag') as string)?.trim() || null
      const updates: Record<string, any> = { name, color: editSelectedColor, type: editType, tag: editTag }
      if (logoUrl) updates.logo_url = logoUrl

      const { error } = await supabase.from('teams').update(updates).eq('id', teamId)
      if (error) {
        document.getElementById('edit-form-error')!.textContent = error.message
        document.getElementById('edit-form-error')!.classList.remove('hidden')
      } else {
        toast('success', 'Equipo actualizado')
        document.getElementById('edit-team-modal')!.classList.add('hidden')
        await initCoachTeams()
      }
    })

    const teamsList = document.getElementById('teams-list')!

    teamsList.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement

      const toggleBtn = target.closest('.btn-toggle-members') as HTMLElement
      if (toggleBtn) {
        const teamId = toggleBtn.dataset.teamId
        const membersDiv = document.querySelector(`.team-members[data-team-id="${teamId}"]`)
        if (membersDiv) {
          const hidden = membersDiv.classList.toggle('hidden')
          toggleBtn.innerHTML = hidden
            ? `${Icon('users', 14)} Ver miembros`
            : `${Icon('users', 14)} Ocultar miembros`
        }
        return
      }

      const deleteBtn = target.closest('.btn-delete-team') as HTMLElement
      if (deleteBtn) {
        const teamId = deleteBtn.dataset.teamId
        const teamName = deleteBtn.dataset.teamName || 'este equipo'
        if (!teamId || !(await confirmDialog(`¿Eliminar ${teamName}? También se eliminarán todos los miembros y scrims asociados.`))) return
        await supabase.from('team_members').delete().eq('team_id', teamId)
        await supabase.from('scrims').delete().eq('team_id', teamId)
        const { error } = await supabase.from('teams').delete().eq('id', teamId)
        if (error) toast('error', error.message)
        else { toast('success', 'Equipo eliminado'); await initCoachTeams() }
        return
      }

      const editRoleBtn = target.closest('.btn-edit-role') as HTMLElement
      if (editRoleBtn) {
        const memberId = editRoleBtn.dataset.memberId
        const currentRole = editRoleBtn.dataset.role || ''
        if (editRoleBtn.nextElementSibling?.classList.contains('edit-role-select')) {
          editRoleBtn.nextElementSibling.remove()
          return
        }
        const sel = document.createElement('select')
        sel.className = 'edit-role-select rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-white outline-none'
        const roles = ['', 'Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex']
        sel.innerHTML = roles.map(r => `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r || 'Sin rol'}</option>`).join('')
        sel.addEventListener('change', async () => {
          const newRole = sel.value || null
          const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', memberId)
          if (error) toast('error', error.message)
          else { toast('success', 'Rol actualizado'); await initCoachTeams() }
        })
        editRoleBtn.parentNode!.insertBefore(sel, editRoleBtn.nextSibling)
        sel.focus()
        return
      }

      const removeBtn = target.closest('.btn-remove-member') as HTMLElement
      if (removeBtn) {
        const memberId = removeBtn.dataset.memberId
        const name = removeBtn.dataset.name
        if (!memberId || !(await confirmDialog(`¿Eliminar a ${name} del equipo?`))) return
        const { error } = await supabase.from('team_members').delete().eq('id', memberId)
        if (error) toast('error', error.message)
        else { toast('success', 'Miembro eliminado'); await initCoachTeams() }
        return
      }

      const addBtn = target.closest('.btn-add-member') as HTMLElement
      if (addBtn) {
        const teamId = addBtn.dataset.teamId
        const profileSelect = document.querySelector(`.add-member-select[data-team-id="${teamId}"]`) as HTMLSelectElement
        const roleInput = document.querySelector(`.add-member-role[data-team-id="${teamId}"]`) as HTMLInputElement
        const profileId = profileSelect?.value
        const role = roleInput?.value?.trim()
        if (!profileId) { toast('warning', 'Selecciona un jugador'); return }
        if ((membersByTeam[teamId!] || []).some((m: any) => m.profile_id === profileId)) { toast('warning', 'El jugador ya es miembro'); return }
        const { error } = await supabase.from('team_members').insert({ team_id: teamId, profile_id: profileId, role: role || null })
        if (error) toast('error', error.message)
        else { toast('success', 'Miembro añadido'); await initCoachTeams() }
        return
      }

      const bulkBtn = target.closest('.btn-bulk-add') as HTMLElement
      if (bulkBtn) {
        const teamId = bulkBtn.dataset.teamId
        const teamName = bulkBtn.dataset.teamName
        const t = (teams ?? []).find((x: any) => x.id === teamId)
        const existingIds = new Set((membersByTeam[teamId!] || []).map((m: any) => m.profile_id))
        const eligible = (allProfiles ?? []).filter((p: any) => {
          if (t?.type === 'academico' && p.role !== 'student') return false
          if (t?.type === 'competitivo' && p.role !== 'player') return false
          return !existingIds.has(p.id)
        })
        if (eligible.length === 0) { toast('warning', 'No hay perfiles disponibles para agregar'); return }

        document.getElementById('bulk-modal-title')!.textContent = `Agregar miembros a ${escapeHtml(teamName || '')}`
        const listEl = document.getElementById('bulk-profile-list')!
        listEl.innerHTML = eligible.map((p: any) => `
          <label class="flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer">
            <input type="checkbox" class="bulk-profile-cb rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(p.id)}" />
            ${escapeHtml(p.full_name || 'Desconocido')}
            <span class="text-zinc-500">(${p.role === 'student' ? 'Alumno' : 'Player'})</span>
          </label>
        `).join('')
        ;(document.getElementById('bulk-select-all') as HTMLInputElement).checked = false
        document.getElementById('bulk-add-modal')!.dataset.teamId = teamId
        document.getElementById('bulk-add-modal')!.classList.remove('hidden')
        return
      }
    })

    // Bulk modal handlers
    document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked
      document.querySelectorAll<HTMLInputElement>('.bulk-profile-cb').forEach(cb => cb.checked = checked)
    })

    document.getElementById('btn-bulk-cancel')?.addEventListener('click', () => {
      document.getElementById('bulk-add-modal')!.classList.add('hidden')
    })
    document.getElementById('bulk-add-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('bulk-add-modal')!.classList.add('hidden')
    })

    document.getElementById('btn-bulk-submit')?.addEventListener('click', async () => {
      const modal = document.getElementById('bulk-add-modal')!
      const teamId = modal.dataset.teamId
      if (!teamId) return
      const selected = Array.from(document.querySelectorAll<HTMLInputElement>('.bulk-profile-cb:checked')).map(cb => cb.value)
      if (selected.length === 0) { toast('warning', 'Selecciona al menos un perfil'); return }
      const role = (document.getElementById('bulk-role-select') as HTMLSelectElement).value || null
      const inserts = selected.map(profileId => ({ team_id: teamId, profile_id: profileId, role }))
      const { error } = await supabase.from('team_members').upsert(inserts, { onConflict: 'team_id,profile_id', ignoreDuplicates: true })
      if (error) { toast('error', error.message); return }
      toast('success', `${selected.length} miembros agregados`)
      modal.classList.add('hidden')
      await initCoachTeams()
    })

    // Auto-assign handler
    document.getElementById('btn-auto-assign')?.addEventListener('click', async () => {
      const { data: allTeams } = await supabase.from('teams').select('*')
      const acadTeams = (allTeams ?? []).filter((t: any) => t.type === 'academico')
      const compTeams = (allTeams ?? []).filter((t: any) => t.type === 'competitivo')
      if (acadTeams.length === 0 && compTeams.length === 0) { toast('warning', 'No hay equipos con tipo definido'); return }

      const allMemberIds = new Set<string>()
      for (const m of Object.values(membersByTeam).flat() as any[]) allMemberIds.add(m.profile_id)

      let query = supabase.from('profiles').select('id, full_name, role').in('role', ['player', 'student'])
      if (allMemberIds.size > 0) {
        query = query.not('id', 'in', `(${[...allMemberIds].join(',')})`)
      }
      const { data: unassigned } = await query

      const students = (unassigned ?? []).filter((p: any) => p.role === 'student')
      const players = (unassigned ?? []).filter((p: any) => p.role === 'player')

      let assigned = 0
      const doAssign = async (profiles: any[], teams: any[]) => {
        if (teams.length === 0) return
        for (let i = 0; i < profiles.length; i++) {
          const t = teams[i % teams.length]
          const { error } = await supabase.from('team_members').insert({ team_id: t.id, profile_id: profiles[i].id })
          if (!error) assigned++
        }
      }

      await doAssign(students, acadTeams)
      await doAssign(players, compTeams)

      if (assigned > 0) {
        toast('success', `${assigned} perfiles asignados automáticamente`)
        await initCoachTeams()
      } else {
        toast('info', 'No hay perfiles sin asignar para distribuir')
      }
    })
  } catch (err) {
    console.error('Error loading teams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipos</p>'
  }
}
