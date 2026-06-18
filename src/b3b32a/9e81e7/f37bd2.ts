import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'

export function renderNotifications(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initNotifications(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const notifs = notifications ?? []
    const hasUnread = notifs.some((n: any) => !n.read)

    const typeColors: Record<string, string> = {
      task: 'text-blue-400', evaluation: 'text-purple-400', schedule: 'text-green-400',
      payment: 'text-yellow-400', scrim: 'text-red-400', system: 'text-zinc-400',
      message: 'text-cyan-400', grade: 'text-emerald-400', promotion: 'text-orange-400',
    }

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Notificaciones</h1>
          <p class="mt-1 text-sm text-zinc-500">${notifs.length} notificaciones</p>
        </div>
        ${hasUnread
          ? `<button id="mark-all-read-btn" class="btn-glow-sm flex items-center gap-2 rounded-lg bg-[#8B5CF6]/20 px-3 py-1.5 text-sm text-[#8B5CF6] transition hover:bg-[#8B5CF6]/30">
              ${Icon('checkCircle', 14)} Marcar todo leído
            </button>`
          : ''
        }
      </div>
      <div class="space-y-2" id="notifications-list">
        ${notifs.length === 0
          ? '<p class="text-sm text-zinc-500">No hay notificaciones.</p>'
          : notifs.map((n: any) => `
            <div class="glass rounded-xl p-4 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}" data-notif-id="${escapeHtml(n.id)}">
              <div class="mt-0.5">
                <div class="h-2 w-2 rounded-full ${n.read ? 'bg-zinc-700' : 'bg-[#8B5CF6]'}"></div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium ${typeColors[n.type] || 'text-zinc-400'}">${escapeHtml(n.type)}</span>
                  <h3 class="text-sm font-medium text-white truncate">${escapeHtml(n.title)}</h3>
                </div>
                ${n.body ? `<p class="mt-1 text-xs text-zinc-500">${escapeHtml(n.body)}</p>` : ''}
                <p class="mt-1 text-xs text-zinc-600">${formatDate(n.created_at)}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                ${n.link ? `<a href="#${escapeHtml(n.link)}" class="text-xs text-[#8B5CF6] hover:underline">Ver</a>` : ''}
                ${!n.read
                  ? `<button class="mark-read-btn text-xs text-zinc-500 hover:text-white transition" title="Marcar como leído">
                      ${Icon('checkCircle', 14)}
                    </button>`
                  : ''
                }
              </div>
            </div>
          `).join('')
        }
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
      const unreadIds = notifs.filter((n: any) => !n.read).map((n: any) => n.id)
      if (unreadIds.length === 0) return
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) {
        toast('error', 'Error al marcar notificaciones')
      } else {
        toast('success', 'Notificaciones marcadas como leídas')
        initNotifications()
      }
    })

    document.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const notifDiv = btn.closest('[data-notif-id]') as HTMLElement
        if (!notifDiv) return
        const notifId = notifDiv.dataset.notifId
        if (!notifId) return

        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notifId)

        if (error) {
          toast('error', 'Error al marcar notificación')
        } else {
          notifDiv.classList.add('opacity-60')
          const dot = notifDiv.querySelector('.h-2.w-2.rounded-full')
          if (dot) dot.classList.remove('bg-[#8B5CF6]')
          if (dot) dot.classList.add('bg-zinc-700')
          btn.remove()
          toast('success', 'Notificación marcada como leída')
        }
      })
    })

    if ((window as any).__channels?.notifications) {
      supabase.removeChannel((window as any).__channels.notifications)
    }
    const channel = supabase.channel('notifications-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.notifications = channel
    channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${session.user.id}` },
        () => { initNotifications() }
      )
      .subscribe()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar notificaciones</p>'
  }
}
