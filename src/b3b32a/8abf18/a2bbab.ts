import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { confirmDialog } from '@/4725dc/b9f3a2'

export function renderCoachPlayers(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initCoachPlayers(): Promise<void> {
  try {
    const { data: players } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at, social_discord')
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
        .select('profile_id, amount, status')
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

      <div id="bulk-bar" class="hidden mb-4 flex items-center gap-2 rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-2.5">
        <span class="text-sm text-zinc-300" id="bulk-count">0 seleccionados</span>
        <div class="ml-auto flex gap-2">
          <button id="bulk-scholarship" class="rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition hover:bg-yellow-500/10">${Icon('dollarSign', 12)} Dar beca</button>
          <button id="bulk-uns-cholarship" class="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800">${Icon('x', 12)} Quitar beca</button>
          <button id="bulk-delete" class="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10">${Icon('trash', 12)} Eliminar</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th class="pb-3 pr-2 font-medium"><input type="checkbox" id="select-all" class="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]"></th>
              <th class="pb-3 pr-4 font-medium">Nombre / Riot</th>
              <th class="pb-3 pr-4 font-medium">Email</th>
              <th class="pb-3 pr-4 font-medium">Rango</th>
              <th class="pb-3 pr-4 font-medium">Beca</th>
              <th class="pb-3 pr-4 font-medium">Pago</th>
              <th class="pb-3 pr-4 font-medium">Activo</th>
              <th class="pb-3 font-medium">Registro</th>
            </tr>
          </thead>
          <tbody>
            ${(players ?? []).length === 0
              ? '<tr><td colspan="9" class="pt-4 text-zinc-500">No hay jugadores registrados.</td></tr>'
              : (players ?? []).map((p: any) => {
                  const displayName = [p.riot_id || p.full_name, p.social_discord].filter(Boolean).join(' | ') || 'Desconocido'
                  const initial = (displayName || '?')[0]
                  const pPayments = paymentsByPlayer[p.id] || []
                  const payStatus = pPayments.length > 0
                    ? pPayments.some((pp: any) => pp.status === 'paid') ? 'pagado' : 'pendiente'
                    : 'sin registro'
                  const payColor = payStatus === 'pagado' ? 'text-green-400' : payStatus === 'pendiente' ? 'text-yellow-400' : 'text-zinc-500'
                  return `
                    <tr class="border-b border-zinc-800/50">
                      <td class="py-3 pr-2"><input type="checkbox" class="player-cb h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#8B5CF6]" value="${escapeHtml(p.id)}"></td>
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6]">${escapeHtml(initial)}</div>
                          <span class="text-white">${escapeHtml(displayName)}</span>
                        </div>
                      </td>
                      <td class="py-3 pr-4 text-zinc-400">${escapeHtml(p.email || '-')}</td>
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
    initBulkActions()
  } catch (err) {
    console.error('Error loading players:', err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar jugadores</p>'
  }
}

function initBulkActions(): void {
  const cbs = document.querySelectorAll<HTMLInputElement>('.player-cb')
  const selectAll = document.getElementById('select-all') as HTMLInputElement
  const bulkBar = document.getElementById('bulk-bar')!
  const bulkCount = document.getElementById('bulk-count')!

  function updateBulkBar() {
    const checked = document.querySelectorAll<HTMLInputElement>('.player-cb:checked')
    bulkCount.textContent = `${checked.length} seleccionados`
    bulkBar.classList.toggle('hidden', checked.length === 0)
  }

  selectAll?.addEventListener('change', () => {
    cbs.forEach(cb => cb.checked = selectAll.checked)
    updateBulkBar()
  })
  cbs.forEach(cb => cb.addEventListener('change', updateBulkBar))

  function getSelectedIds(): string[] {
    return [...document.querySelectorAll<HTMLInputElement>('.player-cb:checked')].map(cb => cb.value)
  }

  document.getElementById('bulk-scholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Dar beca a ${ids.length} jugadores?`))) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: true }).eq('id', id)
      await supabase.from('payments').update({ status: 'scholarship' }).eq('profile_id', id).eq('status', 'pending')
    }
    toast('success', `Beca asignada a ${ids.length} jugadores`)
    window.location.reload()
  })

  document.getElementById('bulk-uns-cholarship')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Quitar beca a ${ids.length} jugadores?`))) return
    for (const id of ids) {
      await supabase.from('profiles').update({ scholarship: false }).eq('id', id)
      await supabase.from('payments').update({ status: 'pending' }).eq('profile_id', id).eq('status', 'scholarship')
    }
    toast('success', `Beca quitada a ${ids.length} jugadores`)
    window.location.reload()
  })

  document.getElementById('bulk-delete')?.addEventListener('click', async () => {
    const ids = getSelectedIds()
    if (!ids.length || !(await confirmDialog(`¿Desactivar ${ids.length} jugadores?`))) return
    let ok = 0, fail = 0
    for (const id of ids) {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
      if (error) fail++
      else ok++
    }
    toast('success', `${ok} desactivados, ${fail} errores`)
    window.location.reload()
  })
}
