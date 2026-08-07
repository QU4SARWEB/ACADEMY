import { supabase } from '@/304244'
import { Icon } from '@/2b3583/bd2119'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { toast } from '@/4725dc/4f2900'
import { uploadFile } from '@/2b3583/76ee3d'
import { confirmDialog } from '@/4725dc/b9f3a2'

type ChatProfile = { id: string; display_name?: string | null; full_name?: string | null; role?: string }
type ChatConversation = { id: string; kind?: string; title?: string | null; updated_at: string; created_by: string }

let activeChatChannel: any = null

export function renderChat(): string {
  return `<div id="chat-page" class="dashboard-chat">
    <div class="dashboard-chat__loading">Cargando conversaciones...</div>
  </div>`
}

export async function initChat(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return
  const userId = session.user.id
  const queryParams = new URLSearchParams(location.hash.split('?')[1] || '')
  const courseContextId = queryParams.get('course') || ''
  const withUserId = queryParams.get('with') || ''
  const courseContextName = courseContextId
    ? (await supabase.from('courses').select('name').eq('id', courseContextId).maybeSingle()).data?.name || ''
    : ''

  if (activeChatChannel) {
    supabase.removeChannel(activeChatChannel)
    activeChatChannel = null
  }

  const page = document.getElementById('chat-page')
  if (!page) return

  const { data: participantRows } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', userId)

  const conversationIds = [...new Set((participantRows ?? []).map((row: any) => row.conversation_id).filter(Boolean))]
  const { data: conversationData } = conversationIds.length > 0
    ? await supabase.from('conversations').select('id, kind, title, updated_at, created_by').in('id', conversationIds).order('updated_at', { ascending: false })
    : { data: [] as any[] }
  let conversations: ChatConversation[] = conversationData ?? []
  if (courseContextId && courseContextName) {
    conversations = conversations.filter(conversation => conversation.kind === 'course' && conversation.title === courseContextName)
  }

  const participantData = conversationIds.length > 0
    ? (await supabase.from('conversation_participants').select('conversation_id, profile_id').in('conversation_id', conversationIds)).data ?? []
    : []
  const profileIds = [...new Set(participantData.map((row: any) => row.profile_id).filter((id: string) => id && id !== userId))]
  const profiles = profileIds.length > 0
    ? (await supabase.from('profiles').select('id, display_name, full_name, role').in('id', profileIds)).data ?? []
    : []
  const profileMap = new Map<string, ChatProfile>((profiles as ChatProfile[]).map(profile => [profile.id, profile]))
  const participantMap = new Map<string, string[]>()
  participantData.forEach((row: any) => {
    const current = participantMap.get(row.conversation_id) || []
    if (row.profile_id !== userId) current.push(row.profile_id)
    participantMap.set(row.conversation_id, current)
  })

  const recipientRole = (await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()).data?.role
  const recipientQuery = recipientRole === 'coach'
    ? supabase.from('profiles').select('id, display_name, full_name, role').in('role', ['student', 'player']).order('full_name')
    : supabase.from('profiles').select('id, display_name, full_name, role').eq('role', 'coach').order('full_name')
  const recipients = (await recipientQuery).data ?? []
  const courseOptions = recipientRole === 'coach'
    ? (await supabase.from('courses').select('id, name').eq('is_active', true).order('display_order')).data ?? []
    : ((await supabase.from('enrollments').select('course_id, courses(id, name)').eq('profile_id', userId).eq('status', 'active')).data ?? []).map((row: any) => row.courses).filter(Boolean)
  const teamMemberships = await supabase.from('team_members').select('team_id').eq('profile_id', userId)
  const teamIds = [...new Set((teamMemberships.data ?? []).map((row: any) => row.team_id).filter(Boolean))]
  const teamOptions = teamIds.length > 0
    ? (await supabase.from('teams').select('id, name').in('id', teamIds).order('name')).data ?? []
    : []
  const allRecipients = (await supabase.from('profiles').select('id, display_name, full_name, role').order('full_name')).data ?? []

  let activeId = conversations?.[0]?.id || ''

  // Si llegamos desde la página de Coaches o con ?with=, abrimos/creamos un directo con esa persona
  if (withUserId) {
    const existing = conversations.find(c => c.kind === 'direct' && (participantMap.get(c.id) || []).includes(withUserId))
    if (existing) {
      activeId = existing.id
    } else {
      const { data: otherProfile } = await supabase.from('profiles').select('id, display_name, full_name, role').eq('id', withUserId).maybeSingle()
      if (otherProfile) {
        const { data: conversation } = await supabase.from('conversations').insert({ kind: 'direct', title: null, created_by: userId }).select('id, kind, title, updated_at, created_by').single()
        if (conversation) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: conversation.id, profile_id: userId },
            { conversation_id: conversation.id, profile_id: withUserId },
          ])
          conversations = [conversation, ...conversations]
          participantMap.set(conversation.id, [withUserId])
          profileMap.set(withUserId, { id: withUserId, display_name: otherProfile.display_name, full_name: otherProfile.full_name, role: otherProfile.role })
          activeId = conversation.id
        }
      }
    }
  }

  const nameForConversation = (conversation: ChatConversation): string => {
    const otherId = participantMap.get(conversation.id)?.[0]
    const other = otherId ? profileMap.get(otherId) : undefined
    return conversation.title || other?.display_name || other?.full_name || 'Conversación'
  }

  page.innerHTML = `
    <div class="dashboard-chat__head">
      <div>
        <span class="section-head__eyebrow">Comunicación académica</span>
        <h1>Mensajes</h1>
        <p>${courseContextName ? `Conversación del curso: ${escapeHtml(courseContextName)}` : 'Habla con tu coach y mantén tu entrenamiento en movimiento.'}</p>
      </div>
      <button id="chat-new-btn" class="dashboard-chat__new">${Icon('plus', 16)} Nueva conversación</button>
    </div>
    <div class="dashboard-chat__layout">
      <aside class="dashboard-chat__list-panel">
        <div class="dashboard-chat__list-head"><span>Conversaciones</span><span>${conversations?.length || 0}</span></div>
        <div id="chat-conversation-list" class="dashboard-chat__list"></div>
      </aside>
      <section id="chat-thread" class="dashboard-chat__thread"></section>
    </div>
    <div id="chat-new-panel" class="dashboard-chat__new-panel" aria-hidden="true">
      <div class="dashboard-chat__new-card">
        <div class="dashboard-chat__new-head"><h2>Nueva conversación</h2><button id="chat-new-close" type="button" aria-label="Cerrar">${Icon('x', 18)}</button></div>
        <p>Elige una conversación directa o un espacio académico.</p>
        <select id="chat-kind" class="dashboard-chat__select">
          <option value="direct">Persona</option>
          <option value="course" ${courseContextId ? 'selected' : ''}>Curso</option>
          <option value="team">Equipo</option>
          <option value="group">Grupo</option>
        </select>
        <select id="chat-recipient" class="dashboard-chat__select">
          <option value="">Seleccionar destinatario</option>
          ${recipients.map((recipient: any) => `<option value="${escapeHtml(recipient.id)}">${escapeHtml(recipient.display_name || recipient.full_name || 'Usuario')}</option>`).join('')}
        </select>
        <select id="chat-context" class="dashboard-chat__select hidden">
          <option value="">Seleccionar contexto</option>
          ${courseOptions.map((course: any) => `<option data-context-kind="course" value="${escapeHtml(course.id)}" ${course.id === courseContextId ? 'selected' : ''}>${escapeHtml(course.name || 'Curso')}</option>`).join('')}
          ${teamOptions.map((team: any) => `<option data-context-kind="team" value="${escapeHtml(team.id)}">${escapeHtml(team.name || 'Equipo')}</option>`).join('')}
        </select>
        <div id="chat-group-fields" class="dashboard-chat__group-fields hidden">
          <input id="chat-group-name" class="dashboard-chat__select dashboard-chat__group-name" placeholder="Nombre del grupo" />
          <select id="chat-group-members" class="dashboard-chat__select dashboard-chat__group-members" multiple size="5">
            ${allRecipients.filter((person: any) => person.id !== userId).map((person: any) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.display_name || person.full_name || 'Usuario')}</option>`).join('')}
          </select>
          <p class="dashboard-chat__group-hint">Mantén Ctrl/Cmd para elegir varios integrantes.</p>
        </div>
        <button id="chat-create-btn" type="button" class="btn btn-primary w-full">Abrir conversación</button>
      </div>
    </div>`

  const listElement = document.getElementById('chat-conversation-list')!
  const threadElement = document.getElementById('chat-thread')!
  const renderList = () => {
    listElement.innerHTML = conversations && conversations.length > 0
      ? conversations.map((conversation: ChatConversation) => {
        const name = nameForConversation(conversation)
        const kindLabel = conversation.kind === 'course' ? 'Curso' : conversation.kind === 'team' ? 'Equipo' : conversation.kind === 'group' ? 'Grupo' : 'Conversación directa'
        const isActive = conversation.id === activeId
        return `<button type="button" class="dashboard-chat__conversation${isActive ? ' active' : ''}" data-conversation-id="${escapeHtml(conversation.id)}">
          <span class="dashboard-chat__avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
          <span class="dashboard-chat__conversation-copy"><strong>${escapeHtml(name)}</strong><small>${kindLabel}</small></span>
          ${isActive ? `<span class="dashboard-chat__active-dot"></span>` : ''}
        </button>`
      }).join('')
      : `<div class="dashboard-chat__empty"><span>${Icon('mail', 24)}</span><strong>Aún no tienes mensajes</strong><p>Inicia una conversación con tu coach.</p></div>`
  }

  const renderThread = async () => {
    const current = conversations?.find((conversation: ChatConversation) => conversation.id === activeId)
    if (!current) {
      threadElement.innerHTML = `<div class="dashboard-chat__empty dashboard-chat__empty--thread"><span>${Icon('messageCircle', 28)}</span><strong>Tu espacio de comunicación</strong><p>Selecciona una conversación o inicia una nueva.</p></div>`
      return
    }

    const name = nameForConversation(current)
    threadElement.innerHTML = `
      <div class="dashboard-chat__thread-head">
        <span class="dashboard-chat__avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
        <div><strong>${escapeHtml(name)}</strong><small>${current.kind === 'course' ? 'Conversación del curso' : current.kind === 'team' ? 'Conversación del equipo' : current.kind === 'group' ? 'Grupo QU4SAR' : 'Mensajería QU4SAR'}</small></div>
        <button id="chat-delete-conversation" type="button" class="dashboard-chat__delete-conv" title="Salir y eliminar esta conversación" aria-label="Eliminar conversación">${Icon('trash', 16)}</button>
      </div>
      <div id="chat-message-list" class="dashboard-chat__messages"><p class="text-xs text-zinc-500">Cargando mensajes...</p></div>
      <form id="chat-message-form" class="dashboard-chat__composer">
        <label class="dashboard-chat__attach" title="Adjuntar archivo o foto">
          <input id="chat-attach-input" type="file" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" hidden />
          ${Icon('paperclip', 17)}
        </label>
        <input id="chat-message-input" autocomplete="off" placeholder="Escribe un mensaje..." />
        <button type="submit" aria-label="Enviar">${Icon('arrowRight', 18)}</button>
      </form>
      <div id="chat-attach-preview" class="dashboard-chat__attach-preview hidden"></div>`

    const messageList = document.getElementById('chat-message-list')!
    const loadMessages = async () => {
      const { data } = await supabase.from('chat_messages').select('id, sender_id, content, attachment_url, attachment_name, attachment_type, created_at').eq('conversation_id', current.id).order('created_at', { ascending: true })
      messageList.innerHTML = data && data.length > 0
        ? data.map((message: any) => {
          const mine = message.sender_id === userId
          return `<div class="dashboard-chat__message${mine ? ' mine' : ''}" data-message-id="${escapeHtml(message.id)}">
            ${renderMessageBubble(message)}
            <span class="dashboard-chat__message-meta">
              ${mine ? `<button type="button" class="dashboard-chat__delete-msg" data-message-id="${escapeHtml(message.id)}" title="Eliminar mensaje" aria-label="Eliminar mensaje">${Icon('trash', 12)}</button>` : ''}
              <small>${formatChatTime(message.created_at)}</small>
            </span>
          </div>`
        }).join('')
        : '<p class="dashboard-chat__empty-message">Escribe el primer mensaje de esta conversación.</p>'
      messageList.scrollTop = messageList.scrollHeight
      messageList.querySelectorAll<HTMLElement>('.dashboard-chat__delete-msg').forEach(button => {
        button.addEventListener('click', async (event) => {
          event.stopPropagation()
          const messageId = button.dataset.messageId
          if (!messageId || !(await confirmDialog('¿Eliminar este mensaje?'))) return
          const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('sender_id', userId)
          if (error) { toast('error', error.message); return }
          void loadMessages()
        })
      })
    }
    await loadMessages()

    document.getElementById('chat-delete-conversation')?.addEventListener('click', async () => {
      if (!(await confirmDialog(current.kind === 'group' ? '¿Eliminar este grupo para todos sus integrantes?' : '¿Eliminar esta conversación? Se quitará de tu lista.'))) return
      if (current.created_by === userId) {
        const { error } = await supabase.from('conversations').delete().eq('id', current.id)
        if (error) { toast('error', error.message); return }
      } else {
        const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', current.id).eq('profile_id', userId)
        if (error) { toast('error', error.message); return }
      }
      conversations = conversations.filter((conversation: ChatConversation) => conversation.id !== current.id)
      activeId = conversations?.[0]?.id || ''
      renderList()
      await renderThread()
    })

    // Adjuntar archivo en el composer
    const attachInput = document.getElementById('chat-attach-input') as HTMLInputElement | null
    const attachPreview = document.getElementById('chat-attach-preview') as HTMLElement | null
    let pendingFile: File | null = null
    document.getElementById('chat-attach-input')?.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0] ?? null
      pendingFile = file
      if (!attachPreview) return
      if (!file) { attachPreview.classList.add('hidden'); attachPreview.innerHTML = ''; return }
      const isImage = file.type.startsWith('image/')
      const thumb = isImage ? `<img src="${URL.createObjectURL(file)}" class="dashboard-chat__attach-thumb" alt="" decoding="async" />` : `${Icon('fileText', 16)} ${escapeHtml(file.name)}`
      attachPreview.innerHTML = `
        <div class="dashboard-chat__attach-chip">${thumb}<button type="button" id="chat-attach-clear" aria-label="Quitar adjunto">${Icon('x', 13)}</button></div>`
      attachPreview.classList.remove('hidden')
      attachPreview.querySelector('#chat-attach-clear')?.addEventListener('click', () => {
        pendingFile = null
        if (attachInput) attachInput.value = ''
        attachPreview.classList.add('hidden')
        attachPreview.innerHTML = ''
      })
    })

    document.getElementById('chat-message-form')?.addEventListener('submit', async (event) => {
      event.preventDefault()
      const input = document.getElementById('chat-message-input') as HTMLInputElement | null
      const content = input?.value.trim() || ''
      if ((!content && !pendingFile) || !input) return
      input.disabled = true
      const submitBtn = document.querySelector('#chat-message-form button[type="submit"]') as HTMLButtonElement
      if (submitBtn) submitBtn.disabled = true
      try {
        let attachmentUrl: string | null = null
        let attachmentName: string | null = null
        let attachmentType: string | null = null
        if (pendingFile) {
          const path = `${userId}/${Date.now()}-${pendingFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`
          const { url, error: upErr } = await uploadFile('chat', path, pendingFile)
          if (upErr) { toast('error', upErr); return }
          attachmentUrl = url ?? null
          attachmentName = pendingFile.name
          attachmentType = pendingFile.type || null
        }
        const { error } = await supabase.from('chat_messages').insert({
          conversation_id: current.id,
          sender_id: userId,
          content: content || (attachmentName ? `[${attachmentName}]` : ''),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
        })
        if (error && !attachmentUrl) { toast('error', error.message); return }
        if (!error) {
          if (input) input.value = ''
          if (attachInput) attachInput.value = ''
          if (attachPreview) { attachPreview.classList.add('hidden'); attachPreview.innerHTML = '' }
          pendingFile = null
        }
      } finally {
        input.disabled = false
        if (submitBtn) submitBtn.disabled = false
        void loadMessages()
      }
    })

    if (activeChatChannel) supabase.removeChannel(activeChatChannel)
    activeChatChannel = supabase.channel(`chat-thread-${current.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${current.id}` }, () => { void loadMessages() }).subscribe()
  }

  const openConversation = async (id: string) => {
    activeId = id
    renderList()
    await renderThread()
  }

  listElement.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-conversation-id]')
    if (button?.dataset.conversationId) void openConversation(button.dataset.conversationId)
  })
  document.getElementById('chat-new-btn')?.addEventListener('click', () => document.getElementById('chat-new-panel')?.classList.add('open'))
  document.getElementById('chat-new-close')?.addEventListener('click', () => document.getElementById('chat-new-panel')?.classList.remove('open'))
  document.getElementById('chat-kind')?.addEventListener('change', (event) => {
    const kind = (event.target as HTMLSelectElement).value
    const recipient = document.getElementById('chat-recipient')
    const context = document.getElementById('chat-context')
    const groupFields = document.getElementById('chat-group-fields')
    recipient?.classList.toggle('hidden', kind !== 'direct')
    context?.classList.toggle('hidden', !(kind === 'course' || kind === 'team'))
    groupFields?.classList.toggle('hidden', kind !== 'group')
  })
  document.getElementById('chat-create-btn')?.addEventListener('click', async () => {
    const kind = (document.getElementById('chat-kind') as HTMLSelectElement | null)?.value || 'direct'
    const recipient = document.getElementById('chat-recipient') as HTMLSelectElement | null
    const context = document.getElementById('chat-context') as HTMLSelectElement | null
    const groupName = document.getElementById('chat-group-name') as HTMLInputElement | null
    const groupMembers = document.getElementById('chat-group-members') as HTMLSelectElement | null
    const contextId = context?.value || ''
    let participantIds: string[] = [userId]
    let title: string | null = null

    if (kind === 'direct') {
      if (!recipient?.value) return
      participantIds.push(recipient.value)
    } else if (kind === 'course') {
      const course = courseOptions.find((item: any) => item.id === contextId)
      if (!course) return
      title = course.name
      const [{ data: enrollments }, { data: assignments }] = await Promise.all([
        supabase.from('enrollments').select('profile_id').eq('course_id', contextId).eq('status', 'active'),
        supabase.from('course_assignments').select('coach_id').eq('course_id', contextId),
      ])
      participantIds.push(...(enrollments ?? []).map((row: any) => row.profile_id), ...(assignments ?? []).map((row: any) => row.coach_id))
    } else if (kind === 'team') {
      const team = teamOptions.find((item: any) => item.id === contextId)
      if (!team) return
      title = team.name
      const { data: members } = await supabase.from('team_members').select('profile_id').eq('team_id', contextId)
      participantIds.push(...(members ?? []).map((row: any) => row.profile_id))
    } else {
      // Grupo personalizado
      const name = groupName?.value.trim() || ''
      const selected = Array.from(groupMembers?.selectedOptions ?? []).map((option: HTMLOptionElement) => option.value)
      if (!name) { toast('error', 'Ponle un nombre al grupo'); return }
      if (selected.length === 0) { toast('error', 'Elige al menos un integrante'); return }
      title = name
      participantIds.push(...selected)
    }

    participantIds = [...new Set(participantIds.filter(Boolean))]
    if (participantIds.length < 2) return

    const { data: conversation, error } = await supabase.from('conversations').insert({ kind: kind === 'group' ? 'group' : kind, title, created_by: userId }).select('id, kind, title, updated_at, created_by').single()
    if (error || !conversation) {
      if (error) toast('error', error.message)
      return
    }
    await supabase.from('conversation_participants').insert(participantIds.map(profileId => ({ conversation_id: conversation.id, profile_id: profileId })))
    conversations = [conversation, ...(conversations || [])]
    participantMap.set(conversation.id, participantIds.filter(profileId => profileId !== userId))
    participantIds.filter(profileId => profileId !== userId).forEach(profileId => {
      const profile = (recipients as ChatProfile[]).find(item => item.id === profileId) || (allRecipients as ChatProfile[]).find(item => item.id === profileId)
      if (profile) profileMap.set(profileId, profile)
    })
    activeId = conversation.id
    document.getElementById('chat-new-panel')?.classList.remove('open')
    renderList()
    await renderThread()
  })

  renderList()
  await renderThread()
}

function formatChatTime(value: string): string {
  return value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : ''
}

function renderMessageBubble(message: any): string {
  const parts: string[] = []
  const isImage = message.attachment_type?.startsWith('image/')
  if (message.attachment_url) {
    if (isImage) {
      parts.push(`<a href="${escapeHtml(message.attachment_url)}" target="_blank" rel="noopener" class="dashboard-chat__attachment dashboard-chat__attachment--image"><img src="${escapeHtml(message.attachment_url)}" alt="${escapeHtml(message.attachment_name || 'imagen')}" loading="lazy" decoding="async" /></a>`)
    } else if (message.attachment_type?.startsWith('video/')) {
      parts.push(`<video src="${escapeHtml(message.attachment_url)}" controls preload="metadata" class="dashboard-chat__attachment dashboard-chat__attachment--video"></video>`)
    } else {
      parts.push(`<a href="${escapeHtml(message.attachment_url)}" target="_blank" rel="noopener" class="dashboard-chat__attachment dashboard-chat__attachment--file">${Icon('fileText', 15)} <span>${escapeHtml(message.attachment_name || 'archivo')}</span></a>`)
    }
  }
  if (message.content && !(message.content.startsWith('[') && message.content.endsWith(']'))) {
    parts.push(`<p>${escapeHtml(message.content)}</p>`)
  }
  return parts.join('') || `<p>${escapeHtml(message.content)}</p>`
}
