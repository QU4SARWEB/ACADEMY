'use client'

import { useEffect, useState, useActionState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Send, Inbox, Plus, Loader, Paperclip, X, FileText, FileImage, FileVideo, File, Image, ChevronDown, ChevronRight } from 'lucide-react'
import { fetchInbox, fetchSent, sendMail, markRead, archive, deleteMsg, fetchAllUsers, fetchUnreadCount } from '@/features/mail/actions'
import { uploadFile } from '@/services/upload'
import { formatDate } from '@/lib/formatDate'

type View = 'inbox' | 'sent' | 'compose'

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

export default function MailPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('inbox')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [composeState, composeAction, composePending] = useActionState(sendMail as any, { error: '' as string | undefined })
  const [inboxUnread, setInboxUnread] = useState(0)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    student: true,
    player: true,
    coach: false,
  })

  useEffect(() => {
    loadView(view)
    fetchAllUsers().then(setUsers)
    fetchUnreadCount().then(setInboxUnread)
  }, [view])

  async function loadView(v: View) {
    setLoading(true)
    setSelectedMsg(null)
    const data = v === 'inbox' ? await fetchInbox() : v === 'sent' ? await fetchSent() : []
    setMessages(data)
    setLoading(false)
  }

  useEffect(() => {
    if (view === 'inbox') {
      fetchUnreadCount().then(setInboxUnread)
    }
  }, [messages, view])

  async function handleMarkRead(msg: any) {
    await markRead(msg.message_id)
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
    )
    router.refresh()
  }

  async function handleArchive(msg: any) {
    await archive(msg.message_id)
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    router.refresh()
  }

  async function handleDelete(msg: any) {
    const msgId = msg.message_id ?? msg.id
    await deleteMsg(msgId)
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    setSelectedMsg(null)
    router.refresh()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingFiles(true)

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `mail/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const url = await uploadFile('attachments', path, file)
      if (url) {
        setAttachments((prev) => [...prev, {
          name: file.name,
          url,
          type: file.type,
          size: file.size,
        }])
      }
    }
    setUploadingFiles(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function fileIcon(mime: string) {
    if (mime.startsWith('image/')) return <FileImage size={14} className="text-green-400" />
    if (mime.startsWith('video/')) return <FileVideo size={14} className="text-blue-400" />
    if (mime.includes('pdf')) return <FileText size={14} className="text-red-400" />
    return <File size={14} className="text-zinc-400" />
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const unreadCount = inboxUnread

  const groupedUsers = users.reduce<Record<string, any[]>>((acc, u) => {
    const role = u.role || 'other'
    if (!acc[role]) acc[role] = []
    acc[role].push(u)
    return acc
  }, {})

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
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

      {/* Main content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {view === 'compose' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="glass rounded-xl p-6">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Nuevo mensaje</h2>
              <form action={composeAction} className="space-y-4">
                {/* Recipients - Collapsible by role */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Destinatarios</label>
                  <div className="rounded-lg border border-zinc-700 bg-[#0A0A0A] p-2 max-h-64 overflow-y-auto">
                    {Object.entries(groupedUsers).map(([role, roleUsers]) => (
                      <div key={role}>
                        <button
                          type="button"
                          onClick={() => setCollapsedGroups((prev) => ({ ...prev, [role]: !prev[role] }))}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          {collapsedGroups[role] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                          {role === 'student' ? 'Estudiantes' : role === 'player' ? 'Jugadores' : role === 'coach' ? 'Coaches' : role}
                          <span className="ml-auto text-zinc-600">({roleUsers.length})</span>
                        </button>
                        {!collapsedGroups[role] && (
                          <div className="ml-4 space-y-0.5">
                            {roleUsers.map((u: any) => (
                              <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
                                <input type="checkbox" value={u.id} name="recipientIds" className="accent-[#8B5CF6]" />
                                <span>{u.full_name}</span>
                                <span className="ml-auto text-xs text-zinc-500">{u.email}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
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

                {/* File attachments */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Archivos adjuntos</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf,.doc,.docx,.zip,.rar"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                  >
                    {uploadingFiles ? <Loader size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    {uploadingFiles ? 'Subiendo...' : 'Adjuntar archivos'}
                  </button>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                          {fileIcon(att.type)}
                          <span className="flex-1 truncate text-xs text-zinc-300">{att.name}</span>
                          <span className="text-[10px] text-zinc-600">{formatSize(att.size)}</span>
                          <input type="hidden" name="fileNames" value={att.name} />
                          <input type="hidden" name="fileUrls" value={att.url} />
                          <input type="hidden" name="fileTypes" value={att.type} />
                          <button type="button" onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-400">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Attachments in message detail */}
              {(() => {
                const files: Attachment[] = selectedMsg.message?.files ?? selectedMsg.files ?? []
                return files.length > 0 ? (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-xs font-medium text-zinc-400 flex items-center gap-1">
                      <Paperclip size={12} /> Archivos adjuntos ({files.length})
                    </p>
                    <div className="space-y-1">
                      {files.map((f: Attachment, i: number) => (
                        <a
                          key={i}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 transition hover:border-zinc-700"
                        >
                          {fileIcon(f.type)}
                          <span className="flex-1 truncate text-xs text-zinc-300">{f.name}</span>
                          <span className="text-[10px] text-zinc-600">{formatSize(f.size)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

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
                  <button
                    onClick={() => handleDelete(selectedMsg)}
                    className="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20"
                  >
                    Eliminar
                  </button>
                </div>
              )}
              {view === 'sent' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleDelete(selectedMsg)}
                    className="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20"
                  >
                    Eliminar
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
                  const hasFiles = (m.files?.length ?? 0) > 0
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                            {sender?.avatar_url ? (
                              <img src={sender.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              sender?.full_name?.charAt(0) ?? '?'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm truncate flex items-center gap-1 ${!msg.read && view === 'inbox' ? 'font-bold text-white' : 'text-zinc-300'}`}>
                              {sender?.full_name ?? 'Desconocido'}
                              {hasFiles && <Paperclip size={10} className="shrink-0 text-zinc-500" />}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{m.subject}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-xs text-zinc-600">
                          {formatDate(m.created_at)}
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
