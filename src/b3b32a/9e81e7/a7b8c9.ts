import { Spinner } from '@/4725dc/a14fa2'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { Icon } from '@/2b3583/bd2119'
import { formatDate } from '@/2b3583/6b239c'
import { toast } from '@/4725dc/4f2900'
import { uploadFileFromInput } from '@/2b3583/76ee3d'

let activeConvId: string | null = null
let activeChannel: any = null
const draftStorage: Record<string, string> = {}

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

  const convList = await loadConversations(session.user.id)
  const participants: Record<string, any[]> = convList.length > 0 ? await loadParticipants(convList.map((c: any) => c.id)) : {}

  const html = `
    <div class="flex h-[calc(100vh-6rem)] gap-0">
      <div class="w-80 shrink-0 border-r border-zinc-800 flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 class="font-heading text-lg font-bold text-white">Chat</h2>
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
                return `
                  <button class="conv-item w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-zinc-800/50 ${activeConvId === c.id ? 'bg-zinc-800' : ''}"
                    data-conv-id="${escapeHtml(c.id)}">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6] overflow-hidden">
                        ${other?.profiles?.avatar_url
                          ? `<img src="${escapeHtml(other.profiles.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                          : escapeHtml(name.charAt(0).toUpperCase())
                        }
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-white truncate">${escapeHtml(name)}</p>
                        <p class="text-xs text-zinc-500 truncate">${lastMsg ? escapeHtml(lastMsg.content || '(archivo)') : 'Sin mensajes'}</p>
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
          ? `<div id="msg-area" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
             <div class="border-t border-zinc-800 p-4">
               <form id="msg-form" class="flex gap-2 items-end">
                 <div class="flex-1">
                   <textarea id="msg-input" rows="1" placeholder="Escribe un mensaje..."
                     class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] resize-none"></textarea>
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
  initChatEvents(session!.user.id)
  if (activeConvId) loadMessages(activeConvId)
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

async function loadMessages(convId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return

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
          <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[75%] ${isMe ? 'bg-[#8B5CF6]/20 rounded-2xl rounded-br-md' : 'bg-zinc-800 rounded-2xl rounded-bl-md'} px-4 py-2.5">
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
            </div>
          </div>`
      }).join('')

  area.scrollTop = area.scrollHeight

  // Subscribe to realtime
  subscribeToMessages(convId)

  // Restore draft
  const input = document.getElementById('msg-input') as HTMLTextAreaElement
  if (input && draftStorage[convId]) input.value = draftStorage[convId]
}

function subscribeToMessages(convId: string): void {
  if (activeChannel) supabase.removeChannel(activeChannel)

  activeChannel = supabase.channel(`chat-${convId}`)
  activeChannel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convId}` },
    () => loadMessages(convId)
  ).subscribe()
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
    delete draftStorage[convId]
    const input = document.getElementById('msg-input') as HTMLTextAreaElement
    if (input) input.value = ''
    document.getElementById('attach-name')?.classList.add('hidden')
    document.getElementById('attach-name')!.textContent = ''
  }
}

function initChatEvents(userId: string): void {
  // Select conversation
  document.querySelectorAll('.conv-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeConvId = (btn as HTMLElement).dataset.convId || null
      renderChatLayout()
    })
  })

  // New chat modal
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

    // Check existing conversation
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
      const { data: conv } = await supabase.from('conversations').insert({}).select().maybeSingle()
      if (!conv) { toast('error', 'Error al crear conversación'); return }

      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, profile_id: userId },
        { conversation_id: conv.id, profile_id: targetId },
      ])
      activeConvId = conv.id
    }

    document.getElementById('new-chat-modal')!.classList.add('hidden')
    renderChatLayout()
  })

  // Send message
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

  // Auto-resize textarea + draft
  const textarea = document.getElementById('msg-input') as HTMLTextAreaElement
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      if (activeConvId) draftStorage[activeConvId] = textarea.value
    })
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const form = document.getElementById('msg-form') as HTMLFormElement
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    })
  }

  // Attach file
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
}
