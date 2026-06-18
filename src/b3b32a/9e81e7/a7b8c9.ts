import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { uploadFileFromInput } from '@/2b3583/76ee3d'
import { confirmDialog } from '@/4725dc/b9f3a2'
import { store } from '@/9ed39e/8cd892'

let activeConvId: string | null = null
let activeChannel: any = null
let typingChannel: any = null
let typingTimer: any = null
const EMOJIS = ['😀','😂','❤️','🔥','👍','👏','🎉','💯','✨','🚀','💪','😍','🤣','🙏','😎','🥺','😅','😭','😤','😡','🥳','🤔','🤯','😱','🥶','😈','💀','☠️','👀','🍿','🎮','🏆','💻','📱','🖥️','⌨️','🖱️','🎯','🧠','💡','📚','🎓','🏅','⭐','🌟','💫','⚡','🔥']

export function renderChat(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initChat(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    await renderChatLayout()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar el chat</p>'
  }
}

async function renderChatLayout(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return
  const profile = store.get<any>('profile')
  const isCoach = profile?.role === 'coach'

  const convList = await loadConversations(session.user.id)
  const participants: Record<string, any[]> = convList.length > 0 ? await loadParticipants(convList.map((c: any) => c.id)) : {}
  const unreadCounts: Record<string, number> = convList.length > 0 ? await loadUnreadCounts(session.user.id, convList.map((c: any) => c.id)) : {}
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const html = `
    <div class="flex h-[calc(100vh-6rem)] gap-0">
      <div class="w-80 shrink-0 border-r border-zinc-800 flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 class="font-heading text-lg font-bold text-white">Chat${totalUnread > 0 ? ` <span class="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">${totalUnread}</span>` : ''}</h2>
          <button id="btn-new-chat" class="rounded-lg bg-[#8B5CF6] p-1.5 text-white transition hover:bg-[#7C3AED]">
            ${Icon('plus', 16)}
          </button>
        </div>
        <div id="conv-list" class="flex-1 overflow-y-auto space-y-0.5 p-2">
          ${convList.length === 0
            ? '<p class="p-4 text-sm text-zinc-500 text-center">Sin conversaciones. <button id="btn-start-chat" class="text-[#8B5CF6] hover:underline">Inicia una</button></p>'
            : convList.map((c: any) => {
                const part = participants[c.id] || []
                const other = part.find((p: any) => p.profile_id !== session.user.id)
                const name = other?.profiles?.display_name || other?.profiles?.full_name || 'Desconocido'
                const lastMsg = c.last_message
                const unread = unreadCounts[c.id] || 0
                return `
                  <button class="conv-item w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-zinc-800/50 ${activeConvId === c.id ? 'bg-zinc-800' : ''}"
                    data-conv-id="${escapeHtml(c.id)}">
                    <div class="flex items-center gap-3">
                      <div class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6] overflow-hidden">
                        ${other?.profiles?.avatar_url
                          ? `<img src="${escapeHtml(other.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : escapeHtml(name.charAt(0).toUpperCase())
                        }
                        ${unread > 0 ? `<span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">${unread > 9 ? '9+' : unread}</span>` : ''}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-white truncate">${escapeHtml(name)}</p>
                        <p class="text-xs ${unread > 0 ? 'text-white font-medium' : 'text-zinc-500'} truncate">${lastMsg ? escapeHtml(lastMsg.content || '(archivo)') : 'Sin mensajes'}</p>
                      </div>
                      ${lastMsg ? `<span class="text-[10px] text-zinc-600 shrink-0">${formatDate(lastMsg.created_at)}</span>` : ''}
                    </div>
                  </button>`
              }).join('')
          }
        </div>
      </div>

      <div id="chat-main" class="flex-1 flex flex-col ${activeConvId ? '' : 'items-center justify-center'}">
        ${activeConvId
          ? `<div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
               <span class="text-xs text-zinc-500">${isCoach ? 'Coach' : ''}</span>
               ${isCoach ? `<button class="btn-del-conv text-red-400 hover:text-red-300 transition text-xs flex items-center gap-1" data-conv-id="${escapeHtml(activeConvId)}">${Icon('trash', 12)} Eliminar conversación</button>` : ''}
             </div>
             <div id="typing-indicator" class="hidden px-4 pt-2 text-xs text-zinc-500 italic"></div>
             <div id="msg-area" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
             <div class="border-t border-zinc-800 p-4">
               <form id="msg-form" class="flex gap-2 items-end">
                 <div class="flex-1 relative">
                   <textarea id="msg-input" rows="1" placeholder="Escribe un mensaje..."
                     class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] resize-none pr-10"></textarea>
                   <button type="button" id="btn-emoji" class="absolute right-2 bottom-2 text-zinc-500 hover:text-white transition cursor-pointer">😀</button>
                   <div id="emoji-picker" class="absolute bottom-full right-0 mb-2 hidden glass rounded-xl p-3 shadow-xl z-50">
                     <div class="grid grid-cols-8 gap-1.5 w-[280px] max-h-[200px] overflow-y-auto">
                       ${EMOJIS.map(e => `<button type="button" class="emoji-btn h-7 w-7 rounded-lg hover:bg-zinc-700 text-base transition cursor-pointer">${e}</button>`).join('')}
                     </div>
                   </div>
                 </div>
                 <label class="cursor-pointer rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white hover:border-zinc-500 transition">
                   ${Icon('paperclip', 16)}
                   <input type="file" id="msg-attach" accept="image/*,.pdf,.doc,.docx,.zip" class="hidden" />
                 </label>
                 <button type="submit" class="rounded-lg bg-[#8B5CF6] p-2 text-white transition hover:bg-[#7C3AED]">
                   ${Icon('arrowUpRight', 16)}
                 </button>
               </form>
               <p id="attach-name" class="mt-1 hidden text-xs text-zinc-500"></p>
             </div>`
          : `<div class="text-center">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                ${Icon('mail', 28)}
              </div>
              <h3 class="text-lg font-medium text-white">Selecciona una conversación</h3>
              <p class="mt-1 text-sm text-zinc-500">O inicia una nueva desde el botón <span class="text-[#8B5CF6]">+</span></p>
            </div>`
        }
      </div>
    </div>

    <div id="new-chat-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-black/60">
      <div class="glass max-w-md w-full mx-4 rounded-xl p-6">
        <h3 class="mb-4 font-heading text-lg font-bold text-white">Nueva conversación</h3>
        <div class="mb-4">
          <label class="mb-1 block text-sm text-zinc-400">Buscar usuario</label>
          <select id="new-chat-user" class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
            <option value="">Cargando...</option>
          </select>
        </div>
        <p id="new-chat-error" class="hidden mb-3 text-xs text-red-400"></p>
        <div class="flex gap-3">
          <button id="btn-start-conv" class="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C3AED]">Iniciar</button>
          <button id="btn-cancel-conv" class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
        </div>
      </div>
    </div>`

  document.getElementById('page-content')!.innerHTML = html
  await initChatEvents(session!.user.id)
  if (activeConvId) {
    loadMessages(activeConvId)
    markAsRead(activeConvId, session.user.id)
    subscribeToTyping(activeConvId, session.user.id)
  }
}

async function loadConversations(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', userId)

  const convIds = (data ?? []).map((p: any) => p.conversation_id)
  if (convIds.length === 0) return []

  const { data: msgData } = await supabase
    .from('chat_messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })

  const lastMsgByConv: Record<string, any> = {}
  for (const m of msgData ?? []) {
    if (!lastMsgByConv[m.conversation_id]) lastMsgByConv[m.conversation_id] = m
  }

  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .in('id', convIds)
    .order('created_at', { ascending: false })

  return (convs ?? []).map((c: any) => ({
    ...c,
    last_message: lastMsgByConv[c.id] || null,
  }))
}

async function loadParticipants(convIds: string[]): Promise<Record<string, any[]>> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('*, profiles(full_name, display_name, avatar_url)')
    .in('conversation_id', convIds)

  const byConv: Record<string, any[]> = {}
  for (const p of data ?? []) {
    if (!byConv[p.conversation_id]) byConv[p.conversation_id] = []
    byConv[p.conversation_id].push(p)
  }
  return byConv
}

async function loadUnreadCounts(userId: string, convIds: string[]): Promise<Record<string, number>> {
  const { data: myParts } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .in('conversation_id', convIds)
    .eq('profile_id', userId)

  const result: Record<string, number> = {}
  for (const part of myParts ?? []) {
    let query = supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', part.conversation_id)
      .neq('sender_id', userId)
    if (part.last_read_at) query = query.gt('created_at', part.last_read_at)
    const { count } = await query
    result[part.conversation_id] = count ?? 0
  }
  return result
}

async function loadMessages(convId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return

  const profile = store.get<any>('profile')
  const isCoach = profile?.role === 'coach'

  const { data } = await supabase
    .from('chat_messages')
    .select('*, sender:sender_id(full_name, display_name, avatar_url)')
    .eq('conversation_id', convId)
    .order('created_at')

  const area = document.getElementById('msg-area')
  if (!area) return

  area.innerHTML = (data ?? []).length === 0
    ? '<p class="text-center text-sm text-zinc-500 pt-8">No hay mensajes. Envía el primero.</p>'
    : (data ?? []).map((m: any) => {
        const isMe = m.sender_id === session.user.id
        const name = m.sender?.display_name || m.sender?.full_name || 'Desconocido'
        return `
          <div class="flex ${isMe ? 'justify-end' : 'justify-start'} group">
            <div class="max-w-[75%] ${isMe ? 'bg-[#8B5CF6]/20 rounded-2xl rounded-br-md' : 'bg-zinc-800 rounded-2xl rounded-bl-md'} px-4 py-2.5 relative">
              ${!isMe ? `<p class="text-[10px] text-[#8B5CF6] mb-0.5">${escapeHtml(name)}</p>` : ''}
              ${m.content ? `<p class="text-sm text-white">${escapeHtml(m.content)}</p>` : ''}
              ${m.attachment_url
                ? `<div class="mt-1">
                    <a href="${escapeHtml(m.attachment_url)}" target="_blank" rel="noopener noreferrer"
                      class="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white transition">
                      ${Icon('paperclip', 12)} ${escapeHtml(m.attachment_url.split('/').pop() || 'archivo')}
                    </a>
                  </div>`
                : ''
              }
              <p class="text-[10px] text-zinc-500 mt-0.5 ${isMe ? 'text-right' : ''}">${formatDate(m.created_at)}</p>
              ${isCoach ? `<button class="btn-del-msg absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500 transition" data-msg-id="${escapeHtml(m.id)}">${Icon('x', 10)}</button>` : ''}
            </div>
          </div>`
      }).join('')

  area.scrollTop = area.scrollHeight

  subscribeToMessages(convId)

  // Restore localStorage draft
  const input = document.getElementById('msg-input') as HTMLTextAreaElement
  const saved = localStorage.getItem(`chat_draft_${convId}`)
  if (input && saved) input.value = saved
}

function subscribeToMessages(convId: string): void {
  if (activeChannel) supabase.removeChannel(activeChannel)

  activeChannel = supabase.channel(`chat-${convId}`)
  activeChannel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` },
    async () => {
      loadMessages(convId)
      const sesh = await supabase.auth.getSession()
      if (sesh.data?.session?.user?.id) markAsRead(convId, sesh.data.session.user.id)
    }
  ).subscribe()
}

function subscribeToTyping(convId: string, userId: string): void {
  if (typingChannel) supabase.removeChannel(typingChannel)
  typingChannel = supabase.channel(`typing-${convId}`)
  typingChannel.on('broadcast', { event: 'typing' }, (payload: any) => {
    if (payload.sender_id !== userId) {
      const el = document.getElementById('typing-indicator')
      if (el) {
        el.textContent = `${escapeHtml(payload.name || 'Alguien')} está escribiendo...`
        el.classList.remove('hidden')
        clearTimeout(typingTimer)
        typingTimer = setTimeout(() => { if (el) el.classList.add('hidden') }, 2000)
      }
    }
  }).subscribe()
}

async function markAsRead(convId: string, userId: string): Promise<void> {
  await supabase.from('conversation_participants').update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', convId)
    .eq('profile_id', userId)
}

async function sendMessage(convId: string, content: string, file?: File): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return

  let attachmentUrl: string | null = null
  if (file) {
    try {
      attachmentUrl = await uploadFileFromInput('chat', convId, 'attachments', file)
    } catch {
      toast('error', 'Error al subir archivo')
      return
    }
  }

  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: convId,
    sender_id: session.user.id,
    content: content || null,
    attachment_url: attachmentUrl,
  })

  if (error) {
    toast('error', error.message)
  } else {
    localStorage.removeItem(`chat_draft_${convId}`)
    const input = document.getElementById('msg-input') as HTMLTextAreaElement
    if (input) input.value = ''
    document.getElementById('attach-name')?.classList.add('hidden')
    document.getElementById('attach-name')!.textContent = ''
    loadMessages(convId)
  }
}

function emitTyping(convId: string, userId: string, userName: string): void {
  if (typingChannel) {
    typingChannel.send({ type: 'broadcast', event: 'typing', payload: { sender_id: userId, name: userName } })
  }
}

async function initChatEvents(userId: string): Promise<void> {
  document.querySelectorAll('.conv-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeConvId = (btn as HTMLElement).dataset.convId || null
      renderChatLayout()
    })
  })

  document.getElementById('btn-new-chat')?.addEventListener('click', async () => {
    const modal = document.getElementById('new-chat-modal')!
    modal.classList.remove('hidden')

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, role')
      .neq('id', userId)
      .eq('is_active', true)
      .order('full_name')

    const select = document.getElementById('new-chat-user') as HTMLSelectElement
    select.innerHTML = '<option value="">— Seleccionar —</option>' +
      (profiles ?? []).map((p: any) =>
        `<option value="${escapeHtml(p.id)}">${escapeHtml(p.display_name || p.full_name)} (${escapeHtml(p.role)})</option>`
      ).join('')
  })

  document.getElementById('btn-cancel-conv')?.addEventListener('click', () => {
    document.getElementById('new-chat-modal')!.classList.add('hidden')
  })

  document.getElementById('btn-start-conv')?.addEventListener('click', async () => {
    const select = document.getElementById('new-chat-user') as HTMLSelectElement
    const targetId = select.value
    if (!targetId) {
      document.getElementById('new-chat-error')!.textContent = 'Selecciona un usuario'
      document.getElementById('new-chat-error')!.classList.remove('hidden')
      return
    }
    document.getElementById('new-chat-error')!.classList.add('hidden')

    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', userId)

    const myConvIds = (myConvs ?? []).map((c: any) => c.conversation_id)

    const { data: theirParticipation } = myConvIds.length > 0
      ? await supabase.from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', myConvIds)
          .eq('profile_id', targetId)
          .maybeSingle()
      : { data: null }

    if (theirParticipation) {
      activeConvId = theirParticipation.conversation_id
    } else {
      const convId = crypto.randomUUID()
      const { error: convErr } = await supabase.from('conversations').insert({ id: convId })
      if (convErr) { toast('error', 'Error al crear conversación'); return }

      const { error: p1Err } = await supabase.from('conversation_participants').insert({ conversation_id: convId, profile_id: userId })
      if (p1Err) { toast('error', 'Error al agregar participante'); return }
      const { error: p2Err } = await supabase.from('conversation_participants').insert({ conversation_id: convId, profile_id: targetId })
      if (p2Err) { toast('error', p2Err.message); return }
      activeConvId = convId
    }

    document.getElementById('new-chat-modal')!.classList.add('hidden')
    renderChatLayout()
  })

  document.getElementById('msg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!activeConvId) return
    const input = document.getElementById('msg-input') as HTMLTextAreaElement
    const fileInput = document.getElementById('msg-attach') as HTMLInputElement
    const content = input?.value?.trim() || ''
    const file = fileInput?.files?.[0]

    if (!content && !file) return
    await sendMessage(activeConvId, content, file)
    if (fileInput) fileInput.value = ''
  })

  // Emoji picker toggle
  document.getElementById('btn-emoji')?.addEventListener('click', (e) => {
    e.stopPropagation()
    document.getElementById('emoji-picker')?.classList.toggle('hidden')
  })

  document.addEventListener('click', () => {
    document.getElementById('emoji-picker')?.classList.add('hidden')
  })

  document.querySelectorAll('.emoji-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('msg-input') as HTMLTextAreaElement
      if (input) {
        input.value += (btn as HTMLElement).textContent
        input.dispatchEvent(new Event('input'))
        input.focus()
      }
    })
  })

  const textarea = document.getElementById('msg-input') as HTMLTextAreaElement
  const profile = store.get<any>('profile')
  const isCoach = profile?.role === 'coach'
  const profileData = await supabase.from('profiles').select('display_name, full_name').eq('id', userId).maybeSingle()
  const profileName = (profileData.data as any)?.display_name || (profileData.data as any)?.full_name || ''
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      if (activeConvId) {
        localStorage.setItem(`chat_draft_${activeConvId}`, textarea.value)
        if (textarea.value) emitTyping(activeConvId, userId, profileName)
      }
    })
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const form = document.getElementById('msg-form') as HTMLFormElement
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    })
  }

  document.getElementById('msg-attach')?.addEventListener('change', () => {
    const input = document.getElementById('msg-attach') as HTMLInputElement
    const label = document.getElementById('attach-name')!
    if (input?.files?.[0]) {
      label.textContent = `📎 ${input.files[0].name}`
      label.classList.remove('hidden')
    } else {
      label.classList.add('hidden')
    }
  })

  // Delete conversation (coach)
  document.querySelectorAll('.btn-del-conv').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const convId = (btn as HTMLElement).dataset.convId
      if (!convId || !(await confirmDialog('¿Eliminar esta conversación y todos sus mensajes?'))) return
      const { error } = await supabase.from('conversations').delete().eq('id', convId)
      if (error) { toast('error', error.message); return }
      toast('success', 'Conversación eliminada')
      activeConvId = null
      renderChatLayout()
    })
  })

  // Delete message (coach) — delegated listener because messages are loaded dynamically
  document.getElementById('msg-area')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('.btn-del-msg') as HTMLElement
    if (!btn) return
    const msgId = btn.dataset.msgId
    if (!msgId || !(await confirmDialog('¿Eliminar este mensaje?'))) return
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId)
    if (error) { toast('error', error.message); return }
    if (activeConvId) loadMessages(activeConvId)
  })
}
