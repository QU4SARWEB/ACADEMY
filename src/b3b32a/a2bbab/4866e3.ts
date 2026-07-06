import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'

export function renderPlayerDashboard(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerDashboard(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*, teams(name, slug, logo_url, color)')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .limit(1)

    const team = teamMembers?.[0]
    const teamName = team?.teams?.name ?? 'Sin equipo'
    const teamLogo = team?.teams?.logo_url
    const teamColor = team?.teams?.color

    let paymentStatus: string | null = null
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('profile_id', session.user.id)
      .order('created_at', { ascending: false })
      .maybeSingle()
    if (payment) paymentStatus = payment.status

    const { data: profile } = await supabase.from('profiles').select('full_name, display_name').eq('id', session.user.id).maybeSingle()
    const userName = profile?.display_name || profile?.full_name || 'Jugador'

    const paymentBadge = paymentStatus
      ? `<span class="inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          paymentStatus === 'paid' || paymentStatus === 'free' ? 'text-green-400 border-green-500/30' :
          paymentStatus === 'scholarship' ? 'text-blue-400 border-blue-500/30' :
          paymentStatus === 'expired' ? 'text-red-400 border-red-500/30' :
          'text-yellow-400 border-yellow-500/30'
        }">${paymentStatus === 'paid' ? 'Pagado' : paymentStatus === 'free' ? 'Gratis' : paymentStatus === 'scholarship' ? 'Beca' : paymentStatus}</span>`
      : '<span class="text-xs text-zinc-600">Sin registro</span>'

    const html = `
      <div class="mb-6 flex items-center gap-3">
        ${teamLogo
          ? `<img src="${escapeHtml(teamLogo)}" alt="" class="h-12 w-12 rounded-xl object-cover" />`
          : `<div class="flex h-12 w-12 items-center justify-center rounded-xl" style="background:${teamColor || '#8B5CF6'}20;color:${teamColor || '#8B5CF6'}">${Icon('users', 22)}</div>`
        }
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Bienvenido, ${escapeHtml(userName)}</h1>
          <p class="mt-1 text-sm text-zinc-500">Panel competitivo — <span style="color:${teamColor || '#fff'}">${escapeHtml(teamName)}</span></p>
        </div>
      </div>

      <div class="glass rounded-xl p-4 text-center mb-8">
        <p class="text-2xl font-bold ${paymentStatus === 'paid' ? 'text-green-400' : paymentStatus === 'scholarship' ? 'text-blue-400' : 'text-yellow-400'}">${paymentBadge}</p>
        <p class="text-xs text-zinc-500">Mi pago</p>
      </div>

      <div class="glass rounded-xl p-5">
        <h2 class="mb-4 font-heading text-base font-bold text-white">Acceso rápido</h2>
        <div class="grid grid-cols-2 gap-3">
          <a href="#/players/team" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
            ${Icon('users', 16)} Mi equipo
          </a>
          <a href="#/players/courses" class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800">
            ${Icon('bookOpen', 16)} Cursos
          </a>
        </div>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading player dashboard:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar</p>'
  }
}
