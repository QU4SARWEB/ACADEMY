import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'

export function renderPlayerTeam(): string {
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

export async function initPlayerTeam(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: myMembership } = await supabase
      .from('team_members')
      .select('*, teams(name, slug, logo_url, color, created_at, tag)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!myMembership) {
      document.getElementById('page-content')!.innerHTML = [
        '<div class="glass rounded-xl p-8 text-center">',
        '  <span class="text-zinc-600">', Icon('users', 32), '</span>',
        '  <p class="mt-3 text-sm text-zinc-500">No est\u00e1s asignado a ning\u00fan equipo todav\u00eda.</p>',
        '</div>',
      ].join('')
      return
    }

    const teamData = myMembership.teams
    const teamId = myMembership.team_id
    const myRole = myMembership.role || ''
    const tc = teamData?.color || '#8B5CF6'

    const { data: members } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, avatar_url, riot_id, rank)')
      .eq('team_id', teamId ?? 'none')
      .eq('status', 'active')
      .order('role')

    const memberIds = (members ?? []).map((m: any) => m.profile_id)

    const paymentMap = new Map<string, string>()
    if (memberIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('profile_id, status')
        .in('profile_id', memberIds)
      for (const p of payments ?? []) {
        const cur = paymentMap.get(p.profile_id)
        const rank: Record<string, number> = { paid: 4, scholarship: 3, pending: 2, free: 1, expired: 0 }
        if (!cur || (rank[p.status] || 0) > (rank[cur] || 0)) {
          paymentMap.set(p.profile_id, p.status)
        }
      }
    }

    const teamRoleLabel = (role: string) => {
      if (role === 'captain') return 'Capit\u00e1n'
      if (role === 'coach') return 'Coach'
      return 'Jugador'
    }

    const VALORANT_ROLES = ['Duelista', 'Iniciador', 'Controlador', 'Centinela', 'Flex']

    const headerHtml = [
      '<div class="mb-6 flex items-center gap-3">',
      teamData?.logo_url
        ? '<img src="' + escapeHtml(teamData.logo_url) + '" alt="" class="h-12 w-12 rounded-xl object-cover" />'
        : '<div class="flex h-12 w-12 items-center justify-center rounded-xl" style="background:' + tc + '20;color:' + tc + '">' + Icon('users', 22) + '</div>',
      '  <div>',
      '    <div class="flex items-center gap-2 mb-1">',
      badgeTag(teamData?.tag || '', tc),
      '      <h1 class="font-heading text-2xl font-bold text-white" style="color:' + tc + '">' + escapeHtml(teamData?.name || '') + '</h1>',
      '    </div>',
      '    <p class="text-sm text-zinc-500">' + (members ?? []).length + ' miembro' + ((members ?? []).length !== 1 ? 's' : '') + '</p>',
      '  </div>',
      '</div>',
    ].join('')

    const roleHtml = [
      '<div class="glass rounded-xl p-4 mb-6">',
      '  <h2 class="font-heading text-base font-bold text-white mb-3">Tu rol</h2>',
      '  <div class="flex items-center gap-3">',
      '    <select id="self-role-select" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">',
      '      <option value="">Seleccionar rol...</option>',
      VALORANT_ROLES.map(r => '<option value="' + r + '" ' + (r === myRole ? 'selected' : '') + '>' + r + '</option>').join(''),
      '    </select>',
      '    <button id="btn-save-role" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]">' + Icon('check', 14) + ' Guardar</button>',
      '  </div>',
      '</div>',
    ].join('')

    const membersHtml = [
      '<div class="space-y-3">',
      '  <h2 class="font-heading text-lg font-bold text-white">Miembros</h2>',
      (members ?? []).map((m: any) => {
        const name = m.profiles?.full_name || 'Desconocido'
        const isMe = m.profile_id === session.user.id
        return [
          '    <div class="glass rounded-xl p-4 flex items-center gap-4">',
          '      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6] overflow-hidden">',
          m.profiles?.avatar_url
            ? '<img src="' + escapeHtml(m.profiles.avatar_url) + '" alt="" class="h-full w-full object-cover" />'
            : escapeHtml(name.charAt(0).toUpperCase()),
          '      </div>',
          '      <div class="flex-1 min-w-0">',
          '        <p class="text-sm font-medium text-white">',
          badgeTag(teamData?.tag || '', tc, 'mr-2 inline-block'),
          escapeHtml(name),
          isMe ? '<span class="ml-2 text-xs text-[#8B5CF6]">(T\u00fa)</span>' : '',
          m.role ? '<span class="ml-1 rounded bg-zinc-700/50 px-1.5 py-0.5 text-[10px] text-zinc-300">' + escapeHtml(m.role) + '</span>' : '',
          '        </p>',
          '        <p class="text-xs text-zinc-500">',
          teamRoleLabel(m.role),
          m.profiles?.rank ? ' \u00b7 ' + escapeHtml(m.profiles.rank) : '',
          m.profiles?.riot_id ? ' \u00b7 ' + escapeHtml(m.profiles.riot_id) : '',
          '        </p>',
          '      </div>',
          (paymentMap.has(m.profile_id) ? paymentBadge(paymentMap.get(m.profile_id)!) : ''),
          '    </div>',
        ].join('')
      }).join(''),
      '</div>',
    ].join('')

    document.getElementById('page-content')!.innerHTML = [
      '<h1 class="mb-6 font-heading text-2xl font-bold text-white">Mi Equipo</h1>',
      headerHtml,
      roleHtml,
      membersHtml,
    ].join('')

    document.getElementById('btn-save-role')?.addEventListener('click', async () => {
      const sel = document.getElementById('self-role-select') as HTMLSelectElement
      const newRole = sel.value || null
      const { error } = await supabase.from('team_members').update({ role: newRole }).eq('profile_id', session.user.id).eq('status', 'active')
      if (error) toast('error', error.message)
      else { toast('success', 'Rol actualizado'); location.reload() }
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipo</p>'
  }
}
