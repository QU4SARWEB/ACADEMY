import { Spinner } from '@/4725dc/a14fa2'
import { toast } from '@/4725dc/4f2900'
import { supabase } from '@/304244'
import { escapeHtml } from '@/2b3583/e0ebc3'
import { formatDate } from '@/2b3583/6b239c'
import { Icon } from '@/2b3583/bd2119'

let currentTab: 'inbox' | 'sent' = 'inbox'

export function renderMail(): string {
  return `<div id="page-content">${Spinner()}</div>`
}

export async function initMail(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const profileId = session.user.id

    const [{ data: inboxRaw }, { data: sentMessages }, { data: profiles }] = await Promise.all([
      supabase
        .from('message_recipients')
        .select('*, message:messages!inner(*, sender:sender_id(full_name, avatar_url, email))')
        .eq('recipient_id', profileId)
        .eq('archived', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*, sender:sender_id(full_name, avatar_url), recipients:message_recipients(recipient_id, read, profiles!inner(full_name, avatar_url))')
        .eq('sender_id', profileId)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .order('full_name'),
    ])

    const recipientOptions = (profiles ?? [])
      .filter((p: any) => p.id !== profileId)
      .map((p: any) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.full_name)} (${escapeHtml(p.role)})</option>`)
      .join('')

    const inbox = (inboxRaw ?? []) as any[]
    const sent = (sentMessages ?? []) as any[]

    const unreadCount = inbox.filter((r: any) => !r.read).length

    const inboxHtml = inbox.length === 0
      ? '<p class="text-sm text-zinc-500">No hay mensajes.</p>'
      : inbox.map((r: any) => {
          const msg = r.message
          const senderName = msg?.sender?.full_name || 'Desconocido'
          return `
            <div class="glass rounded-xl p-4 ${!r.read ? 'border-l-2 border-[#8B5CF6]' : ''}">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-xs font-bold text-[#8B5CF6] overflow-hidden">
                    ${msg?.sender?.avatar_url
                      ? `<img src="${escapeHtml(msg.sender.avatar_url)}" alt="" class="h-full w-full object-cover" />`
                      : escapeHtml(senderName.charAt(0).toUpperCase())
                    }
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-white truncate">${escapeHtml(msg?.subject || 'Sin asunto')}</p>
                    <p class="text-xs text-zinc-500 truncate">${escapeHtml(senderName)}</p>
                  </div>
                </div>
                <span class="shrink-0 text-xs text-zinc-600">${formatDate(r.created_at)}</span>
              </div>
              ${msg?.body ? `<p class="mt-2 text-sm text-zinc-400 line-clamp-2">${escapeHtml(msg.body)}</p>` : ''}
            </div>`
        }).join('')

    const sentHtml = sent.length === 0
      ? '<p class="text-sm text-zinc-500">No hay mensajes enviados.</p>'
      : sent.map((m: any) => {
          const recipients = (m.recipients ?? []).map((r: any) => r.profiles?.full_name || 'Desconocido').join(', ')
          return `
            <div class="glass rounded-xl p-4">
              <div class="flex items-start justify-between">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-white truncate">${escapeHtml(m.subject || 'Sin asunto')}</p>
                  <p class="text-xs text-zinc-500 truncate">Para: ${escapeHtml(recipients)}</p>
                </div>
                <span class="shrink-0 text-xs text-zinc-600">${formatDate(m.created_at)}</span>
              </div>
              ${m.body ? `<p class="mt-2 text-sm text-zinc-400 line-clamp-2">${escapeHtml(m.body)}</p>` : ''}
            </div>`
        }).join('')

    const html = `
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="font-heading text-2xl font-bold text-white">Mensajes</h1>
          <p class="mt-1 text-sm text-zinc-500">Bandeja de mensajes internos</p>
        </div>
        <button id="new-message-btn" class="btn-glow flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
          ${Icon('plus', 14)} Nuevo mensaje
        </button>
      </div>

      <div class="mb-4 flex gap-2 border-b border-zinc-800">
        <button class="mail-tab px-4 py-2 text-sm font-medium transition ${currentTab === 'inbox' ? 'border-b-2 border-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}" data-tab="inbox">
          Recibidos ${unreadCount > 0 ? `<span class="ml-1 rounded-full bg-[#8B5CF6] px-1.5 py-0.5 text-xs text-white">${unreadCount}</span>` : ''}
        </button>
        <button class="mail-tab px-4 py-2 text-sm font-medium transition ${currentTab === 'sent' ? 'border-b-2 border-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}" data-tab="sent">
          Enviados
        </button>
      </div>

      <div id="compose-form" class="glass mb-6 hidden rounded-xl p-4">
        <h3 class="mb-4 font-medium text-white">Nuevo mensaje</h3>
        <form id="message-form" class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Destinatarios</label>
            <select name="recipientIds" multiple required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] min-h-[100px]">
              ${recipientOptions}
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Asunto</label>
            <input type="text" name="subject" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-zinc-400">Mensaje</label>
            <textarea name="body" rows="4" required
              class="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"></textarea>
          </div>
          <p id="message-error" class="hidden text-xs text-red-400"></p>
          <div class="flex gap-2">
            <button type="submit"
              class="btn-glow rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
              Enviar
            </button>
            <button type="button" id="cancel-message-btn"
              class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <div id="mail-list" class="space-y-2">
        ${currentTab === 'inbox' ? inboxHtml : sentHtml}
      </div>`

    document.getElementById('page-content')!.innerHTML = html

    document.querySelectorAll('.mail-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as 'inbox' | 'sent'
        if (tab !== currentTab) {
          currentTab = tab
          initMail()
        }
      })
    })

    const composeForm = document.getElementById('compose-form')!
    const newMsgBtn = document.getElementById('new-message-btn')!
    const cancelBtn = document.getElementById('cancel-message-btn')!

    newMsgBtn.addEventListener('click', () => {
      composeForm.classList.remove('hidden')
      newMsgBtn.classList.add('hidden')
    })

    cancelBtn.addEventListener('click', () => {
      composeForm.classList.add('hidden')
      newMsgBtn.classList.remove('hidden')
      const form = document.getElementById('message-form') as HTMLFormElement
      if (form) form.reset()
    })

    document.getElementById('message-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.target as HTMLFormElement)
      const recipientIdsRaw = fd.getAll('recipientIds') as string[]
      const subject = fd.get('subject') as string
      const body = fd.get('body') as string

      if (recipientIdsRaw.length === 0) {
        const errEl = document.getElementById('message-error')!
        errEl.textContent = 'Selecciona al menos un destinatario.'
        errEl.classList.remove('hidden')
        return
      }

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({ sender_id: profileId, subject, body })
        .select()
        .maybeSingle()

      if (msgError || !message) {
        const errEl = document.getElementById('message-error')!
        errEl.textContent = msgError?.message || 'Error al enviar mensaje'
        errEl.classList.remove('hidden')
        return
      }

      const recipients = recipientIdsRaw.map((rid: string) => ({
        message_id: message.id,
        recipient_id: rid,
      }))

      const { error: recipError } = await supabase
        .from('message_recipients')
        .insert(recipients)

      if (recipError) {
        await supabase.from('messages').delete().eq('id', message.id)
        const errEl = document.getElementById('message-error')!
        errEl.textContent = recipError.message
        errEl.classList.remove('hidden')
        return
      }

      toast('success', 'Mensaje enviado')
      composeForm.classList.add('hidden')
      newMsgBtn.classList.remove('hidden')
      const form = e.target as HTMLFormElement
      form.reset()
      initMail()
    })

    if ((window as any).__channels?.mail) {
      supabase.removeChannel((window as any).__channels.mail)
    }
    const channel = supabase.channel('mail-realtime')
    if (!(window as any).__channels) (window as any).__channels = {}
    ;(window as any).__channels.mail = channel
    channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_recipients', filter: `recipient_id=eq.${profileId}` },
        () => { if (currentTab === 'inbox') initMail() }
      )
      .subscribe()
  } catch (err) {
    console.error(err)
    document.getElementById('page-content')!.innerHTML = '<p class="text-red-400 text-sm">Error al cargar mensajes</p>'
  }
}
