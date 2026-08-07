import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'

export function renderStudentTeam(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

function badgeTag(tag: string, color: string, cls = ''): string {
  return `<span class="rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${cls}" style="background:${color}15;color:${color};border:1px solid ${color}30">${escapeHtml(tag)}</span>`
}

function paymentBadge(status: string): string {
  const labels: Record<string, string> = { paid: 'Pagado', free: 'Gratis', pending: 'Pendiente', scholarship: 'Beca', expired: 'Vencido' }
  const colors: Record<string, string> = {
    paid: 'text-green-400 border-green-500/30',
    free: 'text-green-400 border-green-500/30',
    pending: 'text-yellow-400 border-yellow-500/30',
    scholarship: 'text-blue-400 border-blue-500/30',
    expired: 'text-red-400 border-red-500/30',
  }
  return `<span class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] || 'text-zinc-500'}">${labels[status] || escapeHtml(status)}</span>`
}

export async function initStudentTeam(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const uid = session.user.id

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*, teams(name, id, logo_url, color, slug, tag)')
      .eq('profile_id', uid)
      .eq('status', 'active')

    if (!teamMembers || teamMembers.length === 0) {
      document.getElementById('page-content')!.innerHTML = [
        '<div class="glass rounded-xl p-8 text-center">',
        '  <span class="text-zinc-600">', Icon('users', 32), '</span>',
        '  <p class="mt-3 text-sm text-zinc-500">No est\u00e1s asignado a ning\u00fan equipo todav\u00eda.</p>',
        '</div>',
      ].join('')
      return
    }

    const teamIds = teamMembers.map((tm: any) => tm.team_id)
    const { data: members } = teamIds.length > 0 ? await supabase
      .from('team_members')
      .select('*, profiles(full_name, avatar_url, rank)')
      .in('team_id', teamIds)
      .eq('status', 'active')
      .order('role')
    : { data: [] }

    const memberIds = (members ?? []).map((m: any) => m.profile_id)

    const memberProfileSlug: Record<string, string> = {}
    if (memberIds.length > 0) {
      const { data: pubSlugs } = await supabase
        .from('public_profiles')
        .select('profile_id, slug')
        .in('profile_id', memberIds)
      for (const p of pubSlugs ?? []) {
        if (p.profile_id && p.slug && !memberProfileSlug[p.profile_id]) memberProfileSlug[p.profile_id] = p.slug
      }
    }

    const paymentMap = new Map<string, string>()
    if (memberIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('profile_id, status')
        .in('profile_id', memberIds)
      for (const p of payments ?? []) {
        const cur = paymentMap.get(p.profile_id)
        const r: Record<string, number> = { paid: 4, scholarship: 3, pending: 2, free: 1, expired: 0 }
        if (!cur || (r[p.status] || 0) > (r[cur] || 0)) {
          paymentMap.set(p.profile_id, p.status)
        }
      }
    }

    const membersByTeam: Record<string, any[]> = {}
    for (const m of members ?? []) {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
      membersByTeam[m.team_id].push(m)
    }

    const teamRoleLabel = (role: string) => {
      if (role === 'captain') return 'Capit\u00e1n'
      if (role === 'coach') return 'Coach'
      return 'Miembro'
    }

    const VALORANT_ROLES = ['Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex']

    const teamsHtml = teamMembers.map((tm: any) => {
      const team = tm.teams
      const teamId = tm.team_id
      const color = team?.color || '#8B5CF6'
      const roster = membersByTeam[teamId] || []
      const myRole = tm.role || ''
      const roleId = 'self-role-select-' + teamId

      const headerHtml = [
        '<div class="mb-6 flex items-center gap-3">',
        team?.logo_url
          ? '<img src="' + escapeHtml(team.logo_url) + '" alt="" class="h-12 w-12 rounded-xl object-cover" />'
          : '<div class="flex h-12 w-12 items-center justify-center rounded-xl" style="background:' + color + '20;color:' + color + '">' + Icon('users', 22) + '</div>',
        '  <div>',
        '    <div class="flex items-center gap-2 mb-1">',
        badgeTag(team?.tag || '', color),
        '      <h2 class="font-heading text-2xl font-bold text-white" style="color:' + color + '">' + escapeHtml(team?.name || '') + '</h2>',
        '    </div>',
        '    <p class="text-sm text-zinc-500">' + roster.length + ' miembro' + (roster.length !== 1 ? 's' : '') + '</p>',
        '  </div>',
        '</div>',
      ].join('')

      const roleHtml = [
        '<div class="glass rounded-xl p-4 mb-6">',
        '  <h2 class="font-heading text-base font-bold text-white mb-3">Tu rol</h2>',
        '  <div class="flex items-center gap-3">',
        '    <select id="' + roleId + '" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">',
        '      <option value="">Seleccionar rol...</option>',
        VALORANT_ROLES.map(r => '<option value="' + r + '" ' + (r === myRole ? 'selected' : '') + '>' + r + '</option>').join(''),
        '    </select>',
        '    <button class="btn-save-role rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]" data-team-id="' + teamId + '">' + Icon('check', 14) + ' Guardar</button>',
        '  </div>',
        '</div>',
      ].join('')

      const membersHtml = [
        '<div class="space-y-3">',
        '  <h2 class="font-heading text-lg font-bold text-white">Miembros</h2>',
        roster.length === 0
          ? '<p class="text-sm text-zinc-500">No hay miembros registrados en este equipo.</p>'
          : roster.map((m: any) => {
              const name = m.profiles?.full_name || 'Desconocido'
              const isMe = m.profile_id === uid
              return [
                '    <div class="glass rounded-xl p-4 flex items-center gap-4">',
                '      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6] overflow-hidden">',
                m.profiles?.avatar_url
                  ? '<img src="' + escapeHtml(m.profiles.avatar_url) + '" alt="" class="h-full w-full object-cover" />'
                  : escapeHtml(name.charAt(0).toUpperCase()),
                '      </div>',
                '      <div class="flex-1 min-w-0">',
                '        <p class="text-sm font-medium text-white">',
                badgeTag(team?.tag || '', color, 'mr-2 inline-block'),
                escapeHtml(name),
                isMe ? '<span class="ml-2 text-xs" style="color:' + color + '">(T\u00fa)</span>' : '',
                m.role ? '<span class="ml-1 rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] text-zinc-300">' + escapeHtml(m.role) + '</span>' : '',
                '        </p>',
                '        <p class="text-xs text-zinc-500">',
                teamRoleLabel(m.role),
                m.profiles?.rank ? ' \u00b7 ' + escapeHtml(m.profiles.rank) : '',
                '        </p>',
                '      </div>',
                (paymentMap.has(m.profile_id) ? paymentBadge(paymentMap.get(m.profile_id)!) : ''),
                memberProfileSlug[m.profile_id]
                  ? '<a href="#/p/' + escapeHtml(memberProfileSlug[m.profile_id]) + '" title="Ver perfil público" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-[#8B5CF6]/50 hover:text-[#8B5CF6]">' + Icon('eye', 15) + '</a>'
                  : '',
                '    </div>',
              ].join('')
            }).join(''),
        '</div>',
      ].join('')

      return [
        '<div class="glass rounded-xl p-5 mb-6">',
        headerHtml,
        roleHtml,
        membersHtml,
        '</div>',
      ].join('')
    }).join('')

    document.getElementById('page-content')!.innerHTML = [
      '<h1 class="mb-6 font-heading text-2xl font-bold text-white">Mis Equipos</h1>',
      teamsHtml,
    ].join('')

    document.querySelectorAll('.btn-save-role').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const teamId = (btn as HTMLElement).dataset.teamId
        const sel = document.getElementById('self-role-select-' + teamId) as HTMLSelectElement
        const newRole = sel?.value || null
        const { error } = await supabase.from('team_members').update({ role: newRole }).eq('profile_id', uid).eq('team_id', teamId).eq('status', 'active')
        if (error) toast('error', error.message)
        else { toast('success', 'Rol actualizado'); location.reload() }
      })
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipos</p>'
  }
}
