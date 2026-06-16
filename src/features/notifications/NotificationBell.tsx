'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check, Loader, ExternalLink } from 'lucide-react'
import { getUnreadCount, getNotifications, markAsRead } from './actions'
import { useNotificationsRealtime } from './useNotificationsRealtime'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  task: { label: 'Tarea', color: '#8B5CF6' },
  grade: { label: 'Nota', color: '#10B981' },
  evaluation: { label: 'Evaluación', color: '#F59E0B' },
  payment: { label: 'Pago', color: '#EF4444' },
  schedule: { label: 'Horario', color: '#3B82F6' },
  message: { label: 'Mensaje', color: '#06B6D4' },
  promotion: { label: 'Promoción', color: '#8B5CF6' },
}

export default function NotificationBell({ profileId }: { profileId: string }) {
  const [unread, setUnread] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const newNotif = useNotificationsRealtime(profileId)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refreshCount = useCallback(async () => {
    const count = await getUnreadCount()
    setUnread(count)
  }, [])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (newNotif) {
      setUnread((prev) => prev + 1)
      if (isOpen) {
        setNotifications((prev) => [newNotif, ...prev].slice(0, 5))
      }
    }
  }, [newNotif, isOpen])

  useEffect(() => {
    const handleFocus = () => refreshCount()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshCount])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function toggleDropdown() {
    const next = !isOpen
    setIsOpen(next)
    if (next) {
      setLoadingNotifs(true)
      const data = await getNotifications({ unreadOnly: true, limit: 5 })
      setNotifications(data)
      setLoadingNotifs(false)
    }
  }

  async function handleMarkRead(id: string) {
    await markAsRead(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnread((prev) => Math.max(0, prev - 1))
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggleDropdown}
        className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        <span className="hidden md:inline">Notificaciones</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-[#0A0A0A] shadow-2xl shadow-black/50">
          <div className="border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notificaciones</span>
              {unread > 0 && (
                <span className="text-xs text-zinc-500">{unread} sin leer</span>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadingNotifs ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No hay notificaciones nuevas
              </div>
            ) : (
              notifications.map((n: any) => {
                const typeInfo = TYPE_LABELS[n.type] ?? { label: n.type, color: '#8B5CF6' }
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b border-zinc-800/50 px-4 py-3 transition hover:bg-zinc-900"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: typeInfo.color }}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{typeInfo.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-white truncate">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">{n.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {new Date(n.created_at).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {n.link && (
                        <Link
                          href={n.link}
                          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-green-400"
                          title="Marcar como leído"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center border-t border-zinc-800 px-4 py-2.5 text-xs font-medium text-[#8B5CF6] transition hover:bg-zinc-900"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  )
}
