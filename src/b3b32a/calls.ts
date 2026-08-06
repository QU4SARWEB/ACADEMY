import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'

type CallRoom = {
  id: string
  title: string
  description: string | null
  room_name: string
  course_id: string | null
  schedule_type: 'custom' | 'weekly'
  timezone: string
  duration_minutes: number
  meet_url: string | null
  status: string
}

type CallSession = {
  id: string
  room_id: string
  starts_at: string
  ends_at: string
  status: string
}

let callChannel: any = null

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export function renderCalls(): string {
  return `<div id="page-content" class="calls-page"><div class="calls-loading">${Icon('video', 24)}<p>Cargando llamadas...</p></div></div>`
}

export async function initCalls(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return

  await loadCalls(session.user.id)
  if (callChannel) supabase.removeChannel(callChannel)
  callChannel = supabase.channel('call-calendar').on('postgres_changes', { event: '*', schema: 'public', table: 'call_rooms' }, () => void loadCalls(session.user.id)).on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions' }, () => void loadCalls(session.user.id)).subscribe()
}

async function loadCalls(userId: string): Promise<void> {
  const [{ data: profile }, { data: rooms, error: roomError }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('call_rooms').select('id,title,description,room_name,course_id,schedule_type,timezone,duration_minutes,meet_url,status').eq('status', 'active').order('created_at', { ascending: false }),
  ])
  const page = document.getElementById('page-content')
  if (!page) return
  if (roomError) {
    page.innerHTML = `<div class="calls-empty glass"><div>${Icon('video', 28)}</div><h2>Las llamadas todavía no están configuradas</h2><p>Aplica la migración de salas en Supabase para activar esta sección.</p></div>`
    return
  }

  const callRooms = (rooms ?? []) as CallRoom[]
  const roomIds = callRooms.map(room => room.id)
  const { data: sessions } = roomIds.length > 0
    ? await supabase.from('call_sessions').select('id,room_id,starts_at,ends_at,status').in('room_id', roomIds).neq('status', 'cancelled').order('starts_at', { ascending: true })
    : { data: [] as CallSession[] }
  const courseRows = profile?.role === 'coach'
    ? (await supabase.from('courses').select('id,name').eq('is_active', true).order('display_order')).data ?? []
    : []

  renderCallsPage(page, callRooms, (sessions ?? []) as CallSession[], profile?.role === 'coach', courseRows)
}

function renderCallsPage(page: HTMLElement, rooms: CallRoom[], sessions: CallSession[], isCoach: boolean, courses: any[]): void {
  const sessionsByRoom = new Map<string, CallSession[]>()
  sessions.forEach(session => {
    const current = sessionsByRoom.get(session.room_id) || []
    current.push(session)
    sessionsByRoom.set(session.room_id, current)
  })

  page.innerHTML = `
    <div class="calls-head">
      <div>
        <span class="section-head__eyebrow">Comunicación en vivo</span>
        <h1>Llamadas</h1>
        <p>Salas de Google Meet para clases, revisiones y sesiones de equipo.</p>
      </div>
      <div class="calls-head__actions">
        <span class="calls-network-status">${Icon('shield', 15)} Conexión protegida</span>
        ${isCoach ? `<button id="call-create-toggle" class="btn btn-primary">${Icon('plus', 16)} Agendar llamada</button>` : ''}
      </div>
    </div>
    ${isCoach ? renderCreateForm(courses) : ''}
    <section class="calls-grid">
      ${rooms.length > 0 ? rooms.map(room => renderRoomCard(room, sessionsByRoom.get(room.id) || [], isCoach)).join('') : '<div class="calls-empty glass"><div class="calls-empty__icon">' + Icon('calendar', 28) + '</div><h2>No hay llamadas agendadas</h2><p>Cuando un coach programe una sesión aparecerá aquí con su fecha, hora y enlace.</p></div>'}
    </section>
    <div id="call-modal-root"></div>`

  if (isCoach) bindCreateForm(page)
  page.querySelectorAll<HTMLButtonElement>('[data-call-join]').forEach(button => button.addEventListener('click', () => {
    const room = rooms.find(item => item.id === button.dataset.roomId)
    const session = sessions.find(item => item.id === button.dataset.sessionId)
    if (room && session) void joinCall(room, session)
  }))
  page.querySelectorAll<HTMLButtonElement>('[data-call-configure]').forEach(button => button.addEventListener('click', () => {
    const room = rooms.find(item => item.id === button.dataset.callConfigure)
    if (room) void configureMeetUrl(room)
  }))
  page.querySelectorAll<HTMLButtonElement>('[data-call-copy]').forEach(button => button.addEventListener('click', async () => {
    const url = `${window.location.origin}/#/calls?room=${button.dataset.callCopy}`
    await navigator.clipboard?.writeText(url)
    toast('success', 'Enlace de llamada copiado')
  }))
}

function renderRoomCard(room: CallRoom, sessions: CallSession[], isCoach: boolean): string {
  const upcoming = sessions.filter(session => new Date(session.ends_at).getTime() > Date.now()).slice(0, 8)
  const recurrence = room.schedule_type === 'weekly' ? 'Sesión semanal · mismo enlace' : 'Sesiones personalizadas · mismo enlace'
  const meetReady = Boolean(room.meet_url && /^https?:\/\//.test(room.meet_url))
  const configureButton = isCoach
    ? `<button data-call-configure="${escapeHtml(room.id)}" class="call-icon-button" title="${meetReady ? 'Cambiar enlace de Meet' : 'Agregar enlace de Meet'}">${Icon('slidersHorizontal', 15)}</button>`
    : ''
  return `<article class="call-room-card glass">
    <div class="call-room-card__head"><div class="call-room-card__icon">${Icon('video', 20)}</div><div><span class="section-head__eyebrow">${recurrence}</span><h2>${escapeHtml(room.title)}</h2></div></div>
    ${room.description ? `<p class="call-room-card__description">${escapeHtml(room.description)}</p>` : ''}
    <div class="call-room-card__meta"><span>${Icon('clock', 14)} ${room.duration_minutes} min</span><span>${Icon('mapPin', 14)} ${escapeHtml(room.timezone)}</span>${meetUrlBadge(room)}</div>
    <div class="call-session-list">${upcoming.length > 0 ? upcoming.map(session => `<div class="call-session-row"><div><strong>${formatCallDate(session.starts_at, room.timezone)}</strong><small>${formatCallTime(session.starts_at, room.timezone)} · ${session.status === 'scheduled' ? 'Agendada' : session.status}</small></div><div class="call-session-actions">${configureButton}<button data-call-copy="${escapeHtml(room.id)}" class="call-icon-button" title="Copiar enlace a la sala">${Icon('copy', 15)}</button>${joinButtonForSession(session)}</div></div>`).join('') : '<div class="call-session-empty">No hay próximas sesiones.</div>'}</div>
  </article>`
}

function meetUrlBadge(room: CallRoom): string {
  if (!room.meet_url) return ''
  return `<span class="call-meet-badge">${Icon('video', 12)} Meet configurado</span>`
}

function joinButtonForSession(session: CallSession): string {
  return `<button data-call-join data-room-id="${escapeHtml(session.room_id)}" data-session-id="${escapeHtml(session.id)}" class="btn btn-primary btn-small">${Icon('video', 14)} Entrar</button>`
}

function renderCreateForm(courses: any[]): string {
  return `<section id="call-create-panel" class="call-create-panel glass hidden">
    <div class="call-create-panel__head"><div><span class="section-head__eyebrow">Nueva sala</span><h2>Agendar llamada</h2></div><button id="call-create-close" class="call-icon-button" type="button" aria-label="Cerrar">${Icon('x', 18)}</button></div>
    <form id="call-create-form" class="call-form">
      <label>Título<input name="title" required placeholder="Ej. Revisión de estrategia" /></label>
      <label>Curso asociado<select name="course_id"><option value="">Llamada general</option>${courses.map((course: { id: string; name: string }) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`).join('')}</select></label>
      <label class="call-form__wide">Descripción<textarea name="description" rows="2" placeholder="Objetivo de la sesión, material a revisar..."></textarea></label>
      <label>Enlace de Google Meet<textarea name="meet_url" rows="2" placeholder="https://meet.google.com/xxx-xxxx-xxx (opcional, puedes agregarlo después)"></textarea></label>
      <label>Duración<select name="duration"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60" selected>1 hora</option><option value="90">90 minutos</option><option value="120">2 horas</option></select></label>
      <label>Tipo de agenda<select id="call-schedule-type" name="schedule_type"><option value="custom">Días y horas personalizados</option><option value="weekly">Mismos días y hora cada semana</option></select></label>
      <div id="call-custom-slots" class="call-form__wide"><div class="call-form__subhead"><span>Sesiones</span><button id="call-add-slot" class="call-text-button" type="button">${Icon('plus', 14)} Agregar día</button></div><div id="call-slot-list">${renderSlotRow(0)}</div></div>
      <div id="call-weekly-options" class="call-form__wide hidden"><div class="call-form__subhead"><span>Repetición semanal</span></div><div class="call-form__row"><label>Desde<input name="weekly_start" type="date" /></label><label>Hasta<input name="weekly_end" type="date" /></label><label>Hora<input name="weekly_time" type="time" /></label></div><div class="call-days">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => `<label><input type="checkbox" name="weekly_day" value="${index + 1}" />${label}</label>`).join('')}</div></div>
      <p id="call-create-error" class="call-form__error hidden"></p>
      <button class="btn btn-primary call-form__submit" type="submit">${Icon('calendar', 16)} Crear agenda</button>
    </form>
  </section>`
}

function renderSlotRow(index: number): string {
  return `<div class="call-slot-row" data-call-slot><input name="custom_date" type="date" required aria-label="Fecha de sesión ${index + 1}" /><input name="custom_time" type="time" required aria-label="Hora de sesión ${index + 1}" /><button type="button" class="call-icon-button call-remove-slot" title="Eliminar día">${Icon('trash', 14)}</button></div>`
}

function bindCreateForm(page: HTMLElement): void {
  const panel = document.getElementById('call-create-panel')!
  const form = document.getElementById('call-create-form') as HTMLFormElement
  const scheduleType = document.getElementById('call-schedule-type') as HTMLSelectElement
  const custom = document.getElementById('call-custom-slots')!
  const weekly = document.getElementById('call-weekly-options')!
  document.getElementById('call-create-toggle')?.addEventListener('click', () => panel.classList.toggle('hidden'))
  document.getElementById('call-create-close')?.addEventListener('click', () => panel.classList.add('hidden'))
  scheduleType.addEventListener('change', () => {
    const isWeekly = scheduleType.value === 'weekly'
    custom.classList.toggle('hidden', isWeekly)
    weekly.classList.toggle('hidden', !isWeekly)
  })
  document.getElementById('call-add-slot')?.addEventListener('click', () => {
    document.getElementById('call-slot-list')?.insertAdjacentHTML('beforeend', renderSlotRow(document.querySelectorAll('[data-call-slot]').length))
  })
  page.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.call-remove-slot')
    if (!button) return
    const rows = document.querySelectorAll('[data-call-slot]')
    if (rows.length <= 1) return
    button.closest('[data-call-slot]')?.remove()
  })
  form.addEventListener('submit', event => { event.preventDefault(); void createCallSchedule(form) })
}

async function createCallSchedule(form: HTMLFormElement): Promise<void> {
  const errorElement = document.getElementById('call-create-error')!
  const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement
  const data = new FormData(form)
  const scheduleType = String(data.get('schedule_type') || 'custom') as 'custom' | 'weekly'
  const duration = Number(data.get('duration') || 60)
  const title = String(data.get('title') || '').trim()
  const meetUrl = String(data.get('meet_url') || '').trim() || null
  const slots = scheduleType === 'custom' ? Array.from(document.querySelectorAll<HTMLElement>('[data-call-slot]')).map(row => ({ date: (row.querySelector('[name="custom_date"]') as HTMLInputElement).value, time: (row.querySelector('[name="custom_time"]') as HTMLInputElement).value })) : buildWeeklySlots(data)
  errorElement.classList.add('hidden')
  if (!title || slots.length === 0 || slots.some(slot => !slot.date || !slot.time)) {
    errorElement.textContent = 'Completa el título y al menos una fecha y hora.'
    errorElement.classList.remove('hidden')
    return
  }
  submit.disabled = true
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return
  const { data: room, error: roomError } = await supabase.from('call_rooms').insert({
    created_by: session.user.id,
    course_id: String(data.get('course_id') || '') || null,
    title,
    description: String(data.get('description') || '').trim() || null,
    schedule_type: scheduleType,
    timezone: localTimeZone,
    duration_minutes: duration,
    meet_url: meetUrl,
  }).select('id').single()
  if (roomError || !room) {
    submit.disabled = false
    errorElement.textContent = roomError?.message || 'No se pudo crear la sala.'
    errorElement.classList.remove('hidden')
    return
  }

  const sessions = slots.map(slot => {
    const starts = new Date(`${slot.date}T${slot.time}:00`)
    return { room_id: room.id, created_by: session.user.id, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + duration * 60000).toISOString() }
  })
  const { error: sessionError } = await supabase.from('call_sessions').insert(sessions)
  submit.disabled = false
  if (sessionError) {
    await supabase.from('call_rooms').delete().eq('id', room.id)
    errorElement.textContent = sessionError.message
    errorElement.classList.remove('hidden')
    return
  }
  toast('success', 'Llamada agendada correctamente')
  const currentPath = location.hash
  location.hash = currentPath
}

function buildWeeklySlots(data: FormData): Array<{ date: string; time: string }> {
  const startValue = String(data.get('weekly_start') || '')
  const endValue = String(data.get('weekly_end') || '')
  const time = String(data.get('weekly_time') || '')
  const days = data.getAll('weekly_day').map(value => Number(value))
  if (!startValue || !endValue || !time || days.length === 0) return []
  const current = new Date(`${startValue}T12:00:00`)
  const end = new Date(`${endValue}T12:00:00`)
  const slots: Array<{ date: string; time: string }> = []
  while (current <= end && slots.length < 366) {
    const day = current.getDay() === 0 ? 7 : current.getDay()
    if (days.includes(day)) slots.push({ date: current.toISOString().slice(0, 10), time })
    current.setDate(current.getDate() + 1)
  }
  return slots
}

function formatCallDate(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone }).format(new Date(value))
}

function formatCallTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(value))
}

async function joinCall(room: CallRoom, _session: CallSession): Promise<void> {
  if (!room.meet_url) {
    toast('error', 'El coach todavía no agregó el enlace de Google Meet para esta sala.')
    return
  }
  await navigator.clipboard?.writeText(`${window.location.origin}/#/calls?room=${room.id}`).catch(() => undefined)
  toast('success', 'Abriendo Google Meet en una pestaña nueva…')
  window.open(room.meet_url, '_blank', 'noopener,noreferrer')
}

async function configureMeetUrl(room: CallRoom): Promise<void> {
  const url = window.prompt('Pega el enlace de Google Meet de la sala:', room.meet_url || 'https://meet.google.com/')
  if (url === null) return
  const trimmed = url.trim()
  if (!/^https:\/\/meet\.google\.com\//.test(trimmed)) {
    toast('error', 'El enlace debe ser de Google Meet (https://meet.google.com/…)')
    return
  }
  const { error } = await supabase.from('call_rooms').update({ meet_url: trimmed }).eq('id', room.id)
  if (error) {
    toast('error', error.message)
    return
  }
  toast('success', 'Enlace de Google Meet guardado')
  const currentPath = location.hash
  location.hash = currentPath
}