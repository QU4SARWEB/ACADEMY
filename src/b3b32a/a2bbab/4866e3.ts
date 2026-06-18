import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderPlayerDashboard(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*, teams(name, slug)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .limit(1)

    const team = teamMembers?.[0]
    const teamId = team?.team_id
    const teamName = team?.teams?.name ?? 'Sin equipo'

    let scrims: any[] = []
    if (teamId) {
      const { data } = await supabase
        .from('scrims')
        .select('*')
        .eq('team_id', teamId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(5)
      scrims = data ?? []
    }

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    let paymentStatus: string | null = null
    if (activeSeason) {
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('profile_id', session.user.id)
        .eq('season_id', activeSeason.id)
        .maybeSingle()
      if (payment) paymentStatus = payment.status
    }

    const { data: profile } = await supabase.from('profiles').select('full_name, display_name').eq('id', session.user.id).maybeSingle()
    const userName = profile?.display_name || profile?.full_name || 'Jugador'

    const paymentBadge = paymentStatus
      ? `<span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          paymentStatus === 'paid' ? 'text-green-400 border-green-500/30' :
          paymentStatus === 'scholarship' ? 'text-blue-400 border-blue-500/30' :
          paymentStatus === 'expired' ? 'text-red-400 border-red-500/30' :
          'text-yellow-400 border-yellow-500/30'
        }">${escapeHtml(paymentStatus)}</span>`
      : '<span class="text-xs text-zinc-600">Sin registro</span>'

    const teamInfo = team
      ? `
        <div class="glass rounded-xl p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20">
              ${Icon('users', 20)}
            </div>
            <div>
              <h3 class="font-medium text-white">${escapeHtml(teamName)}</h3>
              <p class="text-xs text-zinc-500">Rol: ${escapeHtml(team.role || 'Miembro')}</p>
            </div>
          </div>
        </div>`
      : '<div class="glass rounded-xl p-4 text-sm text-zinc-500"><p>No estás en un equipo activo.</p><a href="#/players/team" class="text-[#8B5CF6] hover:underline">Ver equipos disponibles</a></div>'

    const scrimsHtml = scrims.length === 0
      ? '<p class="text-sm text-zinc-500">No hay scrims programados.</p>'
      : scrims.map((s: any) => `
        <div class="glass rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <span class="text-green-400">${Icon('sword', 16)}</span>
            <span class="text-white">vs ${escapeHtml(s.rival || s.opponent)}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-zinc-500">${formatDate(s.scheduled_at)}</span>
            <span class="text-xs ${s.result === 'win' ? 'text-green-400' : s.result === 'loss' ? 'text-red-400' : 'text-zinc-500'}">${s.result ? escapeHtml(s.result) : 'Pendiente'}</span>
          </div>
        </div>
      `).join('')

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Panel de jugador competitivo</p>
      </div>
      <div class="mb-6 grid gap-4 sm:grid-cols-3">
        <div class="glass rounded-xl p-4">
          <div class="flex items-center justify-between">
            <span class="text-purple-400">${Icon('users', 24)}</span>
          </div>
          <p class="mt-3 text-2xl font-bold text-white">${escapeHtml(teamName)}</p>
          <p class="mt-1 text-sm text-zinc-400">Equipo</p>
        </div>
        <div class="glass rounded-xl p-4">
          <div class="flex items-center justify-between">
            <span class="text-green-400">${Icon('sword', 24)}</span>
          </div>
          <p class="mt-3 text-2xl font-bold text-white">${scrims.length}</p>
          <p class="mt-1 text-sm text-zinc-400">Próximos scrims</p>
        </div>
        <div class="glass rounded-xl p-4">
          <div class="flex items-center justify-between">
            <span class="${paymentStatus === 'paid' ? 'text-green-400' : paymentStatus === 'scholarship' ? 'text-blue-400' : 'text-yellow-400'}">${Icon('dollarSign', 24)}</span>
          </div>
          <p class="mt-3">${paymentBadge}</p>
          <p class="mt-1 text-sm text-zinc-400">Mi pago</p>
        </div>
      </div>
      <div class="mb-8">${teamInfo}</div>
      <div>
        <h2 class="mb-4 font-heading text-lg font-bold text-white">Próximos scrims</h2>
        <div class="space-y-2">${scrimsHtml}</div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading player dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
