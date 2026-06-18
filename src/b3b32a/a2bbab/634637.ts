import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'

export function renderPlayerScrims(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initPlayerScrims(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!teamMember) {
      document.getElementById('page-content')!.innerHTML = `
        <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Scrims</h1></div>
        <div class="glass rounded-xl p-8 text-center">
          <p class="text-sm text-zinc-500">No estás en un equipo activo.</p>
        </div>`
      return
    }

    const { data: scrims } = await supabase
      .from('scrims')
      .select('*')
      .eq('team_id', teamMember.team_id)
      .order('scheduled_at', { ascending: false })

    const html = `
      <div class="mb-6"><h1 class="font-heading text-2xl font-bold text-white">Scrims</h1></div>
      <div class="space-y-3">
        ${(scrims ?? []).length === 0
          ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay scrims registrados todavía.</p></div>'
          : (scrims ?? []).map((s: any) => `
            <div class="glass rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-green-400">${Icon('sword', 18)}</span>
                  <div>
                    <h3 class="font-medium text-white">vs ${escapeHtml(s.rival || s.opponent)}</h3>
                    <p class="text-xs text-zinc-500">${formatDate(s.scheduled_at)}</p>
                  </div>
                </div>
                <div class="text-right">
                  ${s.result ? `
                    <p class="text-sm font-bold ${s.result === 'win' ? 'text-green-400' : s.result === 'loss' ? 'text-red-400' : s.result === 'draw' ? 'text-yellow-400' : 'text-zinc-400'}">
                      ${s.result === 'win' ? 'Victoria' : s.result === 'loss' ? 'Derrota' : s.result === 'draw' ? 'Empate' : escapeHtml(s.result)}
                    </p>
                    ${s.score ? `<p class="text-xs text-zinc-500">${escapeHtml(s.score)}</p>` : ''}
                  ` : '<p class="text-sm text-zinc-500">Programado</p>'}
                </div>
              </div>
              ${s.notes ? `<p class="mt-2 border-t border-zinc-800 pt-2 text-sm text-zinc-400">${escapeHtml(s.notes)}</p>` : ''}
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar scrims</p>'
  }
}
