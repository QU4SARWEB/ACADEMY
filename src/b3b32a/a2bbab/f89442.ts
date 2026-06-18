import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderPlayerTeam(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerTeam(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*, teams(name, slug, created_at)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const teamData = teamMembers?.[0]?.teams
    const teamId = teamMembers?.[0]?.team_id

    if (!teamData) {
      document.getElementById('page-content')!.innerHTML = `
        <div class="glass rounded-xl p-8 text-center">
          <span class="text-zinc-600">${Icon('users', 32)}</span>
          <p class="mt-3 text-sm text-zinc-500">No estás asignado a ningún equipo todavía.</p>
        </div>`
      return
    }

    const { data: members } = await supabase
      .from('team_members')
      .select('*, profiles(full_name, avatar_url, riot_id, rank)')
      .eq('team_id', teamId ?? 'none')
      .eq('status', 'active')
      .order('role')

    const memberIds = (members ?? []).map((m: any) => m.profile_id)

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    const paymentMap = new Map<string, string>()
    if (activeSeason && memberIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('profile_id, status')
        .eq('season_id', activeSeason.id)
        .in('profile_id', memberIds)
      for (const p of payments ?? []) {
        paymentMap.set(p.profile_id, p.status)
      }
    }

    const roleLabel = (role: string) => {
      if (role === 'captain') return 'Capitán'
      if (role === 'coach') return 'Coach'
      return 'Jugador'
    }

    const paymentBadge = (status: string) => {
      const colors: Record<string, string> = {
        paid: 'text-green-400 border-green-500/30',
        pending: 'text-yellow-400 border-yellow-500/30',
        scholarship: 'text-blue-400 border-blue-500/30',
        expired: 'text-red-400 border-red-500/30',
      }
      return `<span class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] || 'text-zinc-500'}">${escapeHtml(status)}</span>`
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">${escapeHtml(teamData.name)}</h1>
        <p class="mt-1 text-sm text-zinc-500">${(members ?? []).length} miembros</p>
      </div>
      <div class="space-y-3">
        <h2 class="font-heading text-lg font-bold text-white">Miembros</h2>
        ${(members ?? []).map((m: any) => {
          const name = m.profiles?.full_name || 'Desconocido'
          const isMe = m.profile_id === session.user.id
          return `
            <div class="glass rounded-xl p-4 flex items-center gap-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6] overflow-hidden">
                ${m.profiles?.avatar_url
                  ? `<img src="${escapeHtml(m.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                  : escapeHtml(name.charAt(0).toUpperCase())
                }
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white">
                  ${escapeHtml(name)}
                  ${isMe ? '<span class="ml-2 text-xs text-[#8B5CF6]">(Tú)</span>' : ''}
                </p>
                <p class="text-xs text-zinc-500">
                  ${roleLabel(m.role)}
                  ${m.profiles?.rank ? ` · ${escapeHtml(m.profiles.rank)}` : ''}
                  ${m.profiles?.riot_id ? ` · ${escapeHtml(m.profiles.riot_id)}` : ''}
                </p>
              </div>
              ${paymentMap.has(m.profile_id) ? paymentBadge(paymentMap.get(m.profile_id)!) : ''}
            </div>`
        }).join('')}
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipo</p>'
  }
}
