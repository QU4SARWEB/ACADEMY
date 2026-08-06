import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

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
      <a href="${escapeHtml(normalizeRoute(notification.route))}" class="notification-center__item${notification.read_at ? '' : ' unread'}" data-notification-id="${escapeHtml(notification.id)}" style="--notification-accent:${safeColor(notification.accent_color)}">
        <span class="notification-center__dot"></span>
        ${notification.image_url ? `<img class="notification-center__image" src="${escapeHtml(notification.image_url)}" alt="" loading="lazy" />` : ''}
        <span class="notification-center__item-body">
          <strong>${escapeHtml(notification.title)}</strong>
          <span>${escapeHtml(notification.body)}</span>
          <small>${formatNotificationDate(notification.created_at)}</small>
          ${notification.action_label ? `<em>${escapeHtml(notification.action_label)} →</em>` : ''}
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
      .select('id, type, title, body, route, action_label, image_url, accent_color, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (!error) renderNotifications(data ?? [])
    else list.innerHTML = '<div class="notification-center__empty"><p>No se pudieron cargar los avisos.</p></div>'
    loaded = true
  }

  await loadNotifications()

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

  document.getElementById('notification-compose-btn')?.addEventListener('click', () => {
    void openNotificationComposer(loadNotifications, userId)
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

function safeColor(value: string | null | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#8B5CF6'
}

function normalizeRoute(value: string | null | undefined): string {
  if (!value) return '#/'
  if (value.startsWith('#')) return value
  return `#${value.startsWith('/') ? value : `/${value}`}`
}

async function openNotificationComposer(onSent: () => Promise<void>, userId: string): Promise<void> {
  document.getElementById('notification-composer')?.remove()
  const { data: courses } = await supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')
  const modal = document.createElement('div')
  modal.id = 'notification-composer'
  modal.className = 'notification-composer'
  modal.innerHTML = `
    <div class="notification-composer__card" role="dialog" aria-modal="true" aria-labelledby="notification-composer-title">
      <div class="notification-composer__head"><div><span class="dashboard-topbar__eyebrow">Broadcast</span><h2 id="notification-composer-title">Enviar aviso</h2></div><button type="button" data-compose-close aria-label="Cerrar">×</button></div>
      <form id="notification-composer-form" class="notification-composer__form">
        <label>Título<input name="title" maxlength="140" required placeholder="Ej: Nueva tarea disponible" /></label>
        <label>Mensaje<textarea name="body" maxlength="1000" rows="4" required placeholder="Escribe el aviso para la comunidad..."></textarea></label>
        <div class="notification-composer__grid">
          <label>Destinatarios<select name="scope" id="notification-scope"><option value="all">Todos</option><option value="course">Un curso</option><option value="platform">Una plataforma</option></select></label>
          <label>Color<input name="accentColor" type="color" value="#8B5CF6" /></label>
        </div>
        <label id="notification-course-field" class="hidden">Curso<select name="courseId"><option value="">Seleccionar curso</option>${(courses ?? []).map((course: any) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`).join('')}</select></label>
        <label id="notification-platform-field" class="hidden">Plataforma<select name="platform"><option value="pc">PC</option><option value="mobile">Mobile</option></select></label>
        <div class="notification-composer__grid">
          <label>Imagen desde dispositivo<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /><small>Máximo 5 MB</small></label>
          <label>O usar URL<input name="imageUrl" type="url" placeholder="https://..." /></label>
        </div>
        <div id="notification-image-preview" class="notification-composer__image-preview"></div>
        <div class="notification-composer__grid">
          <label>Texto del botón<input name="actionLabel" maxlength="40" placeholder="Ver ahora" /></label>
        </div>
        <label>Destino opcional<input name="route" value="#/" placeholder="#/coaches/dashboard" /></label>
        <p id="notification-composer-error" class="hidden notification-composer__error"></p>
        <button type="submit" class="btn btn-primary">Enviar aviso</button>
      </form>
    </div>`
  document.body.appendChild(modal)

  const close = () => modal.remove()
  modal.querySelector('[data-compose-close]')?.addEventListener('click', close)
  modal.addEventListener('click', event => { if (event.target === modal) close() })
  const scope = modal.querySelector<HTMLSelectElement>('#notification-scope')!
  const courseField = modal.querySelector<HTMLElement>('#notification-course-field')!
  const platformField = modal.querySelector<HTMLElement>('#notification-platform-field')!
  const updateScope = () => {
    courseField.classList.toggle('hidden', scope.value !== 'course')
    platformField.classList.toggle('hidden', scope.value !== 'platform')
  }
  scope.addEventListener('change', updateScope)
  updateScope()
  modal.querySelector<HTMLInputElement>('input[name="imageFile"]')?.addEventListener('change', event => {
    const file = (event.target as HTMLInputElement).files?.[0]
    const preview = modal.querySelector<HTMLElement>('#notification-image-preview')
    if (!preview || !file) return
    const url = URL.createObjectURL(file)
    preview.innerHTML = `<img src="${url}" alt="Vista previa de la notificación" />`
  })

  modal.querySelector<HTMLFormElement>('#notification-composer-form')?.addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const errorElement = modal.querySelector<HTMLElement>('#notification-composer-error')!
    const imageFile = (form.querySelector('input[name="imageFile"]') as HTMLInputElement | null)?.files?.[0]
    let imageUrl = String(data.get('imageUrl') || '').trim()
    if (imageFile) {
      if (!imageFile.type.startsWith('image/') || imageFile.size > 5 * 1024 * 1024) {
        errorElement.textContent = 'La imagen debe ser válida y pesar menos de 5 MB.'
        errorElement.classList.remove('hidden')
        return
      }
      const upload = await uploadFileFromInput('uploads', userId, 'notifications', imageFile)
      if (upload.error || !upload.url) {
        errorElement.textContent = upload.error || 'No se pudo subir la imagen.'
        errorElement.classList.remove('hidden')
        return
      }
      imageUrl = upload.url
    }
    const { error } = await supabase.rpc('send_coach_notification', {
      p_title: String(data.get('title') || ''),
      p_body: String(data.get('body') || ''),
      p_scope: String(data.get('scope') || 'all'),
      p_course_id: String(data.get('courseId') || '') || null,
      p_platform: String(data.get('platform') || '') || null,
      p_route: String(data.get('route') || '#/'),
      p_action_label: String(data.get('actionLabel') || '') || null,
      p_image_url: imageUrl || null,
      p_accent_color: String(data.get('accentColor') || '#8B5CF6'),
    })
    if (error) {
      errorElement.textContent = error.message
      errorElement.classList.remove('hidden')
      return
    }
    close()
    await onSent()
  })
}
