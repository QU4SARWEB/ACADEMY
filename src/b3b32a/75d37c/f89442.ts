import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderStudentTeam(): string {
  return `<div id="page-content">${Spinner()}</div>`
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
      document.getElementById('page-content')!.innerHTML = `
        <div class="glass rounded-xl p-8 text-center">
          <span class="text-zinc-600">${Icon('users', 32)}</span>
          <p class="mt-3 text-sm text-zinc-500">No estás asignado a ningún equipo todavía.</p>
        </div>`
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

    const paymentBadge = (status: string) => {
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

    const html = `
      <h1 class="mb-6 font-heading text-2xl font-bold text-white">Mis Equipos</h1>
      <div class="space-y-6">
        ${teamMembers.map((tm: any) => {
          const team = tm.teams
          const color = team?.color || '#8B5CF6'
          const roster = membersByTeam[tm.team_id] || []
          return `
            <div class="glass rounded-xl p-5">
              <div class="mb-5 flex items-center gap-3">
                ${team?.logo_url
                  ? `<img src="${escapeHtml(team.logo_url)}" alt="" class="h-12 w-12 rounded-xl object-cover" />`
                  : `<div class="flex h-12 w-12 items-center justify-center rounded-xl" style="background:${color}20;color:${color}">${Icon('users', 22)}</div>`
                }
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider" style="background:${color}15;color:${color};border:1px solid ${color}30">${escapeHtml(team?.tag || '')}</span>
                    <h2 class="font-heading text-xl font-bold text-white" style="color:${color}">${escapeHtml(team?.name || '')}</h2>
                  </div>
                  <p class="text-sm text-zinc-500">${roster.length} miembro${roster.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div class="space-y-3">
                ${roster.length === 0 ? '<p class="text-sm text-zinc-500">No hay miembros registrados en este equipo.</p>' : roster.map((m: any) => {
                  const name = m.profiles?.full_name || 'Desconocido'
                  const isMe = m.profile_id === uid
                  return `
                    <div class="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-sm font-bold text-[#8B5CF6] overflow-hidden">
                        ${m.profiles?.avatar_url
                          ? `<img src="${escapeHtml(m.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : escapeHtml(name.charAt(0).toUpperCase())
                        }
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white">
                          <span class="mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style="background:${color}15;color:${color};border:1px solid ${color}30">${escapeHtml(team?.tag || '')}</span>
                          ${escapeHtml(name)}
                          ${isMe ? `<span class="ml-2 text-xs" style="color:${color}">(Tú)</span>` : ''}
                        </p>
                        <p class="text-xs text-zinc-500">
                          ${m.role ? `${escapeHtml(m.role)}` : 'Miembro'}
                          ${m.profiles?.rank ? ` · ${escapeHtml(m.profiles.rank)}` : ''}
                        </p>
                      </div>
                      ${paymentMap.has(m.profile_id) ? paymentBadge(paymentMap.get(m.profile_id)!) : ''}
                    </div>`
                }).join('')}
              </div>
            </div>`
        }).join('')}
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar equipos</p>'
  }
}
