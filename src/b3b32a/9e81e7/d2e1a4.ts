import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { router } from '@/f3395c'
import { store } from '@/9ed39e/8cd892'

const STATUS_COLORS: Record<string, string> = {
  open: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  in_progress: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  resolved: 'text-green-400 border-green-500/30 bg-green-500/10',
  closed: 'text-zinc-500 border-zinc-600/30 bg-zinc-500/10',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
}

export function renderTickets(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initTickets(): Promise<void> {
  try {
    const params = router.getParams()
    const ticketId = params.id
    if (ticketId) return initTicketDetail(ticketId)

    const profile = store.get<any>('profile')
    const isCoach = profile?.role === 'coach'
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    let query = supabase.from('support_tickets').select('*, profiles(full_name, display_name)')
    if (!isCoach) query = query.eq('profile_id', session.user.id)
    const { data: tickets } = await query.order('created_at', { ascending: false })

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Soporte</h1>
          <p class="mt-1 text-sm text-zinc-500">${isCoach ? 'Gestiona los tickets de soporte' : 'Tus solicitudes de soporte'}</p>
        </div>
        ${!isCoach ? `
          <a href="#/support/new"
            class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            ${Icon('plus', 14)} Nuevo ticket
          </a>` : ''
        }
      </div>

      <div class="space-y-3">
        ${(tickets ?? []).length === 0
          ? '<div class="glass rounded-xl p-8 text-center"><p class="text-sm text-zinc-500">No hay tickets.</p></div>'
          : (tickets ?? []).map((t: any) => {
              const name = t.profiles?.display_name || t.profiles?.full_name || 'Desconocido'
              return `
                <a href="#/support/${escapeHtml(t.id)}"
                  class="glass block rounded-xl p-4 transition hover:bg-zinc-800/50">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-medium text-white truncate">${escapeHtml(t.subject)}</h3>
                        <span class="rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] || 'text-zinc-500'}">${STATUS_LABELS[t.status] || t.status}</span>
                        <span class="text-[10px] font-medium ${PRIORITY_COLORS[t.priority] || 'text-zinc-500'}">${PRIORITY_LABELS[t.priority] || t.priority}</span>
                      </div>
                      <p class="mt-1 text-sm text-zinc-400 line-clamp-2">${escapeHtml(t.body)}</p>
                      <p class="mt-1 text-xs text-zinc-600">
                        ${isCoach ? escapeHtml(name) + ' · ' : ''}${formatDate(t.created_at)}
                      </p>
                    </div>
                    ${Icon('arrowRight', 16)}
                  </div>
                </a>`
            }).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar tickets</p>'
  }
}

async function initTicketDetail(ticketId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, display_name)')
      .eq('id', ticketId)
      .maybeSingle()

    if (!ticket) {
      document.getElementById('page-content')!.innerHTML = '<p class="text-zinc-500">Ticket no encontrado</p>'
      return
    }

    const { data: responses } = await supabase
      .from('ticket_responses')
      .select('*, profiles(full_name, display_name, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at')

    const profile = store.get<any>('profile')
    const isCoach = profile?.role === 'coach'
    const creatorName = ticket.profiles?.display_name || ticket.profiles?.full_name || 'Desconocido'

    const html = `
      <div class="max-w-2xl">
        <a href="#/support" class="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          ${Icon('arrowLeft', 16)} Volver a tickets
        </a>

        <div class="glass rounded-xl p-6 mb-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h1 class="font-heading text-xl font-bold text-white">${escapeHtml(ticket.subject)}</h1>
                <span class="rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] || 'text-zinc-500'}">${STATUS_LABELS[ticket.status] || ticket.status}</span>
              </div>
              <p class="text-sm text-zinc-300">${escapeHtml(ticket.body)}</p>
              <p class="mt-2 text-xs text-zinc-600">
                ${escapeHtml(creatorName)} · ${formatDate(ticket.created_at)} · Prioridad: <span class="${PRIORITY_COLORS[ticket.priority]}">${PRIORITY_LABELS[ticket.priority]}</span>
              </p>
            </div>
          </div>

          ${isCoach && ticket.status !== 'closed' ? `
            <div class="mt-4 flex gap-2 border-t border-zinc-700 pt-4">
              <select id="ticket-status-select" class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#8B5CF6]">
                <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Abierto</option>
                <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>En progreso</option>
                <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resuelto</option>
                <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Cerrado</option>
              </select>
              <button id="btn-update-status" class="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C3AED]">Actualizar estado</button>
            </div>
          ` : ''}
        </div>

        <div class="space-y-3 mb-6">
          <h2 class="font-heading text-base font-bold text-white">Respuestas (${(responses ?? []).length})</h2>
          ${(responses ?? []).length === 0
            ? '<p class="text-sm text-zinc-500">Sin respuestas aún.</p>'
            : (responses ?? []).map((r: any) => {
                const rName = r.profiles?.display_name || r.profiles?.full_name || 'Desconocido'
                const isStaff = r.profile_id !== ticket.profile_id
                return `
                  <div class="glass rounded-xl p-4 ${isStaff ? 'border-l-2 border-[#8B5CF6]' : ''}">
                    <div class="flex items-center gap-2 mb-2">
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[10px] font-bold text-[#8B5CF6] overflow-hidden">
                        ${r.profiles?.avatar_url
                          ? `<img src="${escapeHtml(r.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : escapeHtml(rName.charAt(0).toUpperCase())
                        }
                      </div>
                      <span class="text-sm font-medium text-white">${escapeHtml(rName)}</span>
                      ${isStaff ? '<span class="rounded bg-[#8B5CF6]/20 px-1.5 py-0.5 text-[10px] text-[#8B5CF6]">Staff</span>' : ''}
                      <span class="text-xs text-zinc-600">${formatDate(r.created_at)}</span>
                    </div>
                    <p class="text-sm text-zinc-300">${escapeHtml(r.body)}</p>
                  </div>`
              }).join('')
          }
        </div>

        ${ticket.status !== 'closed' ? `
          <div class="glass rounded-xl p-4">
            <h3 class="mb-3 font-medium text-white">Responder</h3>
            <form id="ticket-response-form" class="space-y-3">
              <textarea name="body" rows="3" required placeholder="Escribe tu respuesta..."
                class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
              <p id="response-error" class="hidden text-xs text-red-400"></p>
              <button type="submit"
                class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                ${Icon('arrowUpRight', 14)} Enviar
              </button>
            </form>
          </div>
        ` : '<p class="text-sm text-zinc-500 text-center">Este ticket está cerrado.</p>'}
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('btn-update-status')?.addEventListener('click', async () => {
      const status = (document.getElementById('ticket-status-select') as HTMLSelectElement)?.value
      if (!status) return
      const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId)
      if (error) toast('error', error.message)
      else {
        toast('success', 'Estado actualizado')
        initTicketDetail(ticketId)
      }
    })

    document.getElementById('ticket-response-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const body = fd.get('body') as string
      if (!body?.trim()) return

      const { error } = await supabase.from('ticket_responses').insert({
        ticket_id: ticketId,
        profile_id: session.user.id,
        body: body.trim(),
      })
      if (error) {
        document.getElementById('response-error')!.textContent = error.message
        document.getElementById('response-error')!.classList.remove('hidden')
      } else {
        if (isCoach && ticket.status === 'open') {
          await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId)
        }
        toast('success', 'Respuesta enviada')
        initTicketDetail(ticketId)
      }
    })
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar ticket</p>'
  }
}
