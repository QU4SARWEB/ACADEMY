import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'

let activeChannel: any = null

export async function initNotificationCenter(): Promise<void> {
  const button = document.getElementById('topbar-notification-btn')
  const panel = document.getElementById('notification-center')
  const list = document.getElementById('notification-center-list')
  const badge = document.getElementById('notification-unread-count')
  if (!button || !panel || !list) return

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return

  if (activeChannel) {
    supabase.removeChannel(activeChannel)
    activeChannel = null
  }

  let loaded = false
  const closePanel = () => {
    panel.classList.remove('open')
    panel.setAttribute('aria-hidden', 'true')
    button.setAttribute('aria-expanded', 'false')
  }

  const updateBadge = (count: number) => {
    if (!badge) return
    badge.textContent = count > 99 ? '99+' : String(count)
    badge.classList.toggle('hidden', count === 0)
  }

  const renderNotifications = (notifications: any[]) => {
    const unread = notifications.filter(notification => !notification.read_at).length
    updateBadge(unread)
    if (notifications.length === 0) {
      list.innerHTML = `
        <div class="notification-center__empty">
          <span>✓</span>
          <strong>Todo al día</strong>
          <p>No tienes avisos nuevos.</p>
        </div>`
      return
    }
    list.innerHTML = notifications.map(notification => `
      <a href="${escapeHtml(notification.route || '#/')}" class="notification-center__item${notification.read_at ? '' : ' unread'}" data-notification-id="${escapeHtml(notification.id)}">
        <span class="notification-center__dot"></span>
        <span class="notification-center__item-body">
          <strong>${escapeHtml(notification.title)}</strong>
          <span>${escapeHtml(notification.body)}</span>
          <small>${formatNotificationDate(notification.created_at)}</small>
        </span>
      </a>`).join('')

    list.querySelectorAll<HTMLAnchorElement>('[data-notification-id]').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.notificationId
        if (id) await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
        closePanel()
      })
    })
  }

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, route, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (!error) renderNotifications(data ?? [])
    else list.innerHTML = '<div class="notification-center__empty"><p>No se pudieron cargar los avisos.</p></div>'
    loaded = true
  }

  button.addEventListener('click', async () => {
    const open = panel.classList.toggle('open')
    panel.setAttribute('aria-hidden', String(!open))
    button.setAttribute('aria-expanded', String(open))
    if (open && !loaded) await loadNotifications()
  })

  document.getElementById('notification-mark-all')?.addEventListener('click', async () => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
    await loadNotifications()
  })

  activeChannel = supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
      void loadNotifications()
    })
    .subscribe()
}

function formatNotificationDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
