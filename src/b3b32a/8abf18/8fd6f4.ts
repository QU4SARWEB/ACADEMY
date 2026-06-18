import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachTeams(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachTeams(): Promise<void> {
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('*, seasons(name)')
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
      .select('id, full_name')
      .in('role', ['player', 'student'])
      .order('full_name')

    const { data: allSeasons } = await supabase
      .from('seasons')
      .select('id, name, is_active')

    const container = document.getElementById('page-content')!

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
              <label class="mb-1 block text-xs text-zinc-400">Temporada</label>
              <select name="seasonId"
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Sin temporada</option>
                ${(allSeasons ?? []).map((s: any) =>
                  `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}${s.is_active ? ' (Activa)' : ''}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <p id="team-form-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-2">
            <button type="submit"
              class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">Crear</button>
            <button type="button" id="btn-cancel-team"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Cancelar</button>
          </div>
        </form>
      </div>

      <div id="teams-list" class="space-y-4">
        ${(teams ?? []).length === 0
          ? '<p class="text-sm text-zinc-500">No hay equipos.</p>'
          : (teams ?? []).map((t: any) => {
              const teamMembers = membersByTeam[t.id] || []
              return `
                <div class="glass rounded-xl p-4" data-team-id="${escapeHtml(t.id)}">
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-medium text-white">${escapeHtml(t.name)}</h3>
                      <p class="mt-0.5 text-xs text-zinc-500">
                        ${t.seasons?.name ? escapeHtml(t.seasons.name) + ' · ' : ''}${teamMembers.length} miembros
                      </p>
                    </div>
                    <button class="btn-toggle-members text-xs text-purple-400 hover:text-purple-300"
                      data-team-id="${escapeHtml(t.id)}">
                      ${Icon('users', 14)} Ver miembros
                    </button>
                  </div>

                  <div class="team-members hidden mt-4 space-y-3" data-team-id="${escapeHtml(t.id)}">
                    ${teamMembers.length === 0
                      ? '<p class="text-xs text-zinc-500">Sin miembros.</p>'
                      : teamMembers.map((m: any) => {
                          const name = m.profiles?.full_name || 'Desconocido'
                          return `
                            <div class="flex items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm">
                              <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-white">${escapeHtml(name)}</span>
                                <span class="text-xs text-zinc-500">${escapeHtml(m.role || '')}</span>
                                ${m.profiles?.riot_id ? `<span class="text-xs text-zinc-600">${escapeHtml(m.profiles.riot_id)}</span>` : ''}
                                ${m.profiles?.rank ? `<span class="text-xs text-zinc-600">${escapeHtml(m.profiles.rank)}</span>` : ''}
                              </div>
                              <button class="btn-remove-member text-red-400 hover:text-red-300"
                                data-member-id="${escapeHtml(m.id)}" data-name="${escapeHtml(name)}">
                                ${Icon('trash', 14)}
                              </button>
                            </div>`
                        }).join('')
                    }

                    <div class="mt-3 flex items-center gap-2">
                      <select class="add-member-select flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]"
                        data-team-id="${escapeHtml(t.id)}">
                        <option value="">Seleccionar jugador...</option>
                        ${(allProfiles ?? []).map((p: any) =>
                          `<option value="${escapeHtml(p.id)}">${escapeHtml(p.full_name || 'Desconocido')}</option>`
                        ).join('')}
                      </select>
                      <input type="text"
                        class="add-member-role rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6] w-24"
                        placeholder="Rol" data-team-id="${escapeHtml(t.id)}" />
                      <button class="btn-add-member rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs text-white hover:bg-[#7C3AED]"
                        data-team-id="${escapeHtml(t.id)}">
                        ${Icon('plus', 14)}
                      </button>
                    </div>
                  </div>
                </div>`
            }).join('')
        }
      </div>`

    document.getElementById('btn-new-team')?.addEventListener('click', () => {
      const form = document.getElementById('new-team-form')
      if (form) form.classList.toggle('hidden')
    })

    document.getElementById('btn-cancel-team')?.addEventListener('click', () => {
      const form = document.getElementById('new-team-form')
      if (form) form.classList.add('hidden')
    })

    document.getElementById('team-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const name = (fd.get('name') as string)?.trim()
      if (!name) return

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
      const { error } = await supabase.from('teams').insert({
        name,
        slug,
        season_id: (fd.get('seasonId') as string) || null,
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

      const removeBtn = target.closest('.btn-remove-member') as HTMLElement
      if (removeBtn) {
        const memberId = removeBtn.dataset.memberId
        const name = removeBtn.dataset.name
        if (!memberId || !(await confirmDialog(`¿Eliminar a ${name} del equipo?`))) return

        const { error } = await supabase.from('team_members').delete().eq('id', memberId)
        if (error) toast('error', error.message)
        else {
          toast('success', 'Miembro eliminado')
          await initCoachTeams()
        }
        return
      }

      const addBtn = target.closest('.btn-add-member') as HTMLElement
      if (addBtn) {
        const teamId = addBtn.dataset.teamId
        const profileSelect = document.querySelector(`.add-member-select[data-team-id="${teamId}"]`) as HTMLSelectElement
        const roleInput = document.querySelector(`.add-member-role[data-team-id="${teamId}"]`) as HTMLInputElement
        const profileId = profileSelect?.value
        const role = roleInput?.value?.trim()

        if (!profileId) {
          toast('warning', 'Selecciona un jugador')
          return
        }

        const existingMembers = membersByTeam[teamId!] || []
        if (existingMembers.some((m: any) => m.profile_id === profileId)) {
          toast('warning', 'El jugador ya es miembro de este equipo')
          return
        }

        const { error } = await supabase.from('team_members').insert({
          team_id: teamId,
          profile_id: profileId,
          role: role || null,
        })

        if (error) toast('error', error.message)
        else {
          toast('success', 'Miembro añadido')
          await initCoachTeams()
        }
        return
      }
    })
  } catch (err) {
    console.error('Error loading teams:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipos</p>'
  }
}
