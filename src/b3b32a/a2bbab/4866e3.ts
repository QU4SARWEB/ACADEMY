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

    // Scrim stats
    let totalScrims = 0, wins = 0, losses = 0, draws = 0
    let upcomingScrims: any[] = []
    if (teamId) {
      const { data: allScrims } = await supabase
        .from('scrims')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false })

      totalScrims = allScrims?.length ?? 0
      wins = allScrims?.filter((s: any) => s.result === 'win').length ?? 0
      losses = allScrims?.filter((s: any) => s.result === 'loss').length ?? 0
      draws = allScrims?.filter((s: any) => s.result === 'draw').length ?? 0

      const { data: upcoming } = await supabase
        .from('scrims')
        .select('*')
        .eq('team_id', teamId)
        .gte('date', new Date().toISOString())
        .order('date')
        .limit(5)
      upcomingScrims = upcoming ?? []
    }

    const winRate = totalScrims > 0 ? Math.round((wins / totalScrims) * 100) : 0

    // Task stats
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')

    const { data: submissions } = await supabase
      .from('task_submissions')
      .select('status')
      .in('enrollment_id', (enrollments ?? []).map((e: any) => e.id))
    const gradedSubs = submissions?.filter((s: any) => s.status === 'graded').length ?? 0
    const totalSubs = submissions?.length ?? 0

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
        }">${paymentStatus === 'paid' ? 'Pagado' : paymentStatus === 'scholarship' ? 'Beca' : paymentStatus}</span>`
      : '<span class="text-xs text-zinc-600">Sin registro</span>'

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
        <p class="mt-1 text-sm text-zinc-500">Panel competitivo — ${escapeHtml(teamName)}</p>
      </div>

      <div class="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-white">${totalScrims}</p>
          <p class="text-xs text-zinc-500">Scrims totales</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-green-400">${winRate}%</p>
          <p class="text-xs text-zinc-500">Win rate</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold text-[#8B5CF6]">${totalSubs}</p>
          <p class="text-xs text-zinc-500">Tareas hechas</p>
        </div>
        <div class="glass rounded-xl p-4 text-center">
          <p class="text-2xl font-bold ${paymentStatus === 'paid' ? 'text-green-400' : paymentStatus === 'scholarship' ? 'text-blue-400' : 'text-yellow-400'}">${paymentBadge}</p>
          <p class="text-xs text-zinc-500">Mi pago</p>
        </div>
      </div>

      ${totalScrims > 0 ? `
      <div class="mb-8 glass rounded-xl p-5">
        <h2 class="mb-4 font-heading text-base font-bold text-white">Rendimiento competitivo</h2>
        <div class="flex gap-1 h-24 items-end mb-2">
          <div class="flex-1 rounded-t bg-green-500/60 transition-all duration-500 flex items-center justify-center" style="height:${Math.max(winRate, 2)}%">
            <span class="text-[10px] text-white font-bold">${wins}</span>
          </div>
          <div class="flex-1 rounded-t bg-red-500/60 transition-all duration-500 flex items-center justify-center" style="height:${Math.max(totalScrims > 0 ? Math.round((losses / totalScrims) * 100) : 0, 2)}%">
            <span class="text-[10px] text-white font-bold">${losses}</span>
          </div>
          ${draws > 0 ? `
          <div class="flex-1 rounded-t bg-zinc-500/60 transition-all duration-500 flex items-center justify-center" style="height:${Math.round((draws / totalScrims) * 100)}%">
            <span class="text-[10px] text-white font-bold">${draws}</span>
          </div>` : ''}
        </div>
        <div class="flex justify-between text-[10px] text-zinc-600">
          <span>Victorias (${wins})</span>
          <span>Derrotas (${losses})</span>
          ${draws > 0 ? `<span>Empates (${draws})</span>` : ''}
        </div>
      </div>` : ''}

      <div class="grid gap-6 lg:grid-cols-2 mb-8">
        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white">${Icon('sword', 16)} Próximos scrims</h2>
          ${upcomingScrims.length === 0
            ? '<p class="text-sm text-zinc-500">No hay scrims programados.</p>'
            : upcomingScrims.map((s: any) => `
              <div class="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2.5 mb-2 text-sm">
                <span class="text-white">vs ${escapeHtml(s.opponent || '?')}</span>
                <span class="text-xs text-zinc-500">${s.date ? formatDate(s.date) : '—'}</span>
              </div>
            `).join('')
          }
        </div>

        <div class="glass rounded-xl p-5">
          <h2 class="mb-4 font-heading text-base font-bold text-white">Acceso rápido</h2>
          <div class="grid grid-cols-2 gap-3">
            <a href="#/players/team" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('users', 16)} Mi equipo
            </a>
            <a href="#/players/scrims" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('sword', 16)} Scrims
            </a>
            <a href="#/players/tasks" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('clipboardList', 16)} Tareas
            </a>
            <a href="#/players/courses" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
              ${Icon('bookOpen', 16)} Cursos
            </a>
          </div>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading player dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
