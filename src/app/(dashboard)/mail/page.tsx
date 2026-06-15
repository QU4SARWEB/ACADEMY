'use client'

import { useEffect, useState, useActionState } from 'react'
import { Mail, Send, Inbox, Reply, Archive, Plus, Loader } from 'lucide-react'
import { fetchInbox, fetchSent, sendMail, markRead, archive, fetchAllUsers } from '@/features/mail/actions'
import { useRouter } from 'next/navigation'

type View = 'inbox' | 'sent' | 'compose'

export default function MailPage() {
  const [view, setView] = useState<View>('inbox')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const router = useRouter()

  const [composeState, composeAction, composePending] = useActionState(sendMail as any, { error: '' as string | undefined })

  useEffect(() => {
    loadView(view)
    fetchAllUsers().then(setUsers)
  }, [view])

  async function loadView(v: View) {
    setLoading(true)
    setSelectedMsg(null)
    const data = v === 'inbox' ? await fetchInbox() : v === 'sent' ? await fetchSent() : []
    setMessages(data)
    setLoading(false)
  }

  async function handleMarkRead(msg: any) {
    await markRead(msg.message_id)
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
    )
  }

  async function handleArchive(msg: any) {
    await archive(msg.message_id)
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
  }

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <button
          onClick={() => setView('compose')}
          className="flex w-full items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7C3AED]"
        >
          <Plus size={16} /> Nuevo mensaje
        </button>

        <div className="space-y-1">
          <button
            onClick={() => setView('inbox')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
              view === 'inbox' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Inbox size={16} />
            Recibidos
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('sent')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition ${
              view === 'sent' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Send size={16} />
            Enviados
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {view === 'compose' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="glass rounded-xl p-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Nuevo mensaje</h2>
              <form action={composeAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Destinatarios</label>
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-zinc-700 bg-[#0A0A0A] p-2">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
                        <input type="checkbox" value={u.id} name="recipientIds" className="accent-[#8B5CF6]" />
                        <span>{u.full_name}</span>
                        <span className="ml-auto text-xs text-zinc-500 capitalize">{u.role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Asunto</label>
                  <input name="subject" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Mensaje</label>
                  <textarea name="body" rows={8} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                {composeState?.error && (
                  <p className="text-sm text-red-400">{composeState.error}</p>
                )}
                <button
                  type="submit"
                  disabled={composePending}
                  className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
                >
                  {composePending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar
                </button>
              </form>
            </div>
          </div>
        ) : selectedMsg ? (
          <div className="flex-1 overflow-y-auto">
            <div className="glass rounded-xl p-6">
              <button
                onClick={() => setSelectedMsg(null)}
                className="mb-4 text-sm text-purple-400 hover:underline"
              >
                ← Volver
              </button>
              <h2 className="font-heading text-lg font-bold text-white">
                {selectedMsg.message?.subject ?? selectedMsg.subject}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                De: {selectedMsg.message?.sender?.full_name ?? selectedMsg.sender?.full_name ?? 'Desconocido'}
              </p>
              <p className="text-xs text-zinc-600">
                {new Date(selectedMsg.created_at ?? selectedMsg.message?.created_at).toLocaleString('es-ES')}
              </p>
              <div className="mt-4 whitespace-pre-wrap text-sm text-zinc-300">
                {selectedMsg.message?.body ?? selectedMsg.body}
              </div>
              {view === 'inbox' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { handleMarkRead(selectedMsg); setSelectedMsg(null) }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Marcar leído
                  </button>
                  <button
                    onClick={() => { handleArchive(selectedMsg); setSelectedMsg(null) }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Archivar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <h2 className="mb-4 font-heading text-lg font-bold text-white capitalize">
              {view === 'inbox' ? 'Recibidos' : 'Enviados'}
            </h2>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="glass animate-pulse rounded-xl p-4">
                    <div className="h-4 w-3/4 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Mail size={32} className="mx-auto text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">No hay mensajes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg: any) => {
                  const m = msg.message ?? msg
                  const sender = m.sender
                  return (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedMsg(msg)
                        if (!msg.read && view === 'inbox') handleMarkRead(msg)
                      }}
                      className={`glass w-full rounded-xl p-4 text-left transition hover:bg-zinc-800/50 ${!msg.read && view === 'inbox' ? 'border-l-2 border-[#8B5CF6]' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                            {sender?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm truncate ${!msg.read && view === 'inbox' ? 'font-bold text-white' : 'text-zinc-300'}`}>
                              {sender?.full_name ?? 'Desconocido'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{m.subject}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-xs text-zinc-600">
                          {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
