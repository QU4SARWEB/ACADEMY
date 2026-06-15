'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getNotifications, markAsRead, markAllAsRead } from '@/features/notifications/actions'

const TYPE_LABELS: Record<string, string> = {
  task: 'Tarea',
  evaluation: 'Evaluación',
  schedule: 'Horario',
  payment: 'Pago',
  scrim: 'Scrim',
  system: 'Sistema',
  message: 'Mensaje',
  grade: 'Nota',
  promotion: 'Promoción',
}

const TYPE_COLORS: Record<string, string> = {
  task: 'text-blue-400',
  evaluation: 'text-purple-400',
  schedule: 'text-green-400',
  payment: 'text-yellow-400',
  scrim: 'text-orange-400',
  system: 'text-zinc-400',
  message: 'text-cyan-400',
  grade: 'text-emerald-400',
  promotion: 'text-pink-400',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications().then((data) => {
      setNotifications(data)
      setLoading(false)
    })
  }, [])

  async function handleMarkRead(id: string) {
    await markAsRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  async function handleMarkAll() {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Centro de Notificaciones</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {unread > 0 ? `${unread} sin leer` : 'Todas leídas'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <CheckCheck size={16} />
            Marcar todas leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass animate-pulse rounded-xl p-4">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Bell size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No hay notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass rounded-xl p-4 transition ${n.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase ${TYPE_COLORS[n.type]}`}>
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-white">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-zinc-400">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-600">
                    {new Date(n.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && (
                    <Link
                      href={n.link}
                      className="rounded-lg px-3 py-1.5 text-xs text-purple-400 transition hover:bg-purple-500/10"
                    >
                      Ver
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Leer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
