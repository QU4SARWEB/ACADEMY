import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'

export function renderCoachPlayers(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPlayers(): Promise<void> {
  try {
    const { data: players } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at')
      .eq('role', 'player')
      .order('full_name')

    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    let paymentsByPlayer: Record<string, any[]> = {}
    if (activeSeason && players && players.length > 0) {
      const playerIds = players.map((p: any) => p.id)
      const { data: payments } = await supabase
        .from('payments')
        .select('profile_id, amount, status, due_date')
        .in('profile_id', playerIds)
        .eq('season_id', activeSeason.id)
      if (payments) {
        for (const p of payments) {
          if (!paymentsByPlayer[p.profile_id]) paymentsByPlayer[p.profile_id] = []
          paymentsByPlayer[p.profile_id].push(p)
        }
      }
    }

    const html = `
      <div class="mb-6">
        <h1 class="font-heading text-2xl font-bold text-white">Jugadores</h1>
        <p class="mt-1 text-sm text-zinc-500">${(players ?? []).length} jugadores</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th class="pb-3 pr-4 font-medium">Nombre</th>
              <th class="pb-3 pr-4 font-medium">Email</th>
              <th class="pb-3 pr-4 font-medium">Riot ID</th>
              <th class="pb-3 pr-4 font-medium">Rango</th>
              <th class="pb-3 pr-4 font-medium">Beca</th>
              <th class="pb-3 pr-4 font-medium">Pago</th>
              <th class="pb-3 pr-4 font-medium">Activo</th>
              <th class="pb-3 font-medium">Registro</th>
            </tr>
          </thead>
          <tbody>
            ${(players ?? []).length === 0
              ? '<tr><td colspan="8" class="pt-4 text-zinc-500">No hay jugadores registrados.</td></tr>'
              : (players ?? []).map((p: any) => {
                  const initial = (p.full_name || '?')[0]
                  const pPayments = paymentsByPlayer[p.id] || []
                  const payStatus = pPayments.length > 0
                    ? pPayments.some((pp: any) => pp.status === 'paid') ? 'pagado' : 'pendiente'
                    : 'sin registro'
                  const payColor = payStatus === 'pagado' ? 'text-green-400' : payStatus === 'pendiente' ? 'text-yellow-400' : 'text-zinc-500'
                  return `
                    <tr class="border-b border-zinc-800/50">
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml(initial)}</div>
                          <a href="#/coaches/students/${escapeHtml(p.id)}" class="text-white hover:text-[#8B5CF6] transition">${escapeHtml(p.full_name || 'Desconocido')}</a>
                        </div>
                      </td>
                      <td class="py-3 pr-4 text-zinc-400">${escapeHtml(p.email || '-')}</td>
                      <td class="py-3 pr-4 text-zinc-400">${escapeHtml(p.riot_id || '-')}</td>
                      <td class="py-3 pr-4 text-zinc-400">${escapeHtml(p.rank || '-')}</td>
                      <td class="py-3 pr-4">${p.scholarship ? '<span class="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Sí</span>' : '<span class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">No</span>'}</td>
                      <td class="py-3 pr-4"><span class="text-xs ${payColor}">${escapeHtml(payStatus)}</span></td>
                      <td class="py-3 pr-4">${p.is_active ? '<span class="inline-block h-2 w-2 rounded-full bg-green-400"></span>' : '<span class="inline-block h-2 w-2 rounded-full bg-red-400"></span>'}</td>
                      <td class="py-3 text-zinc-400 text-xs">${p.created_at ? formatDate(p.created_at) : '-'}</td>
                    </tr>`
                }).join('')
            }
          </tbody>
        </table>
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error('Error loading players:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar jugadores</p>'
  }
}
