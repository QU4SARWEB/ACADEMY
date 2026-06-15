'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getUnreadCount } from './actions'
import { useNotificationsRealtime } from './useNotificationsRealtime'

export default function NotificationBell({ profileId }: { profileId: string }) {
  const [unread, setUnread] = useState(0)
  const newNotif = useNotificationsRealtime(profileId)

  useEffect(() => {
    getUnreadCount().then(setUnread)
  }, [])

  useEffect(() => {
    if (newNotif) {
      setUnread((prev) => prev + 1)
    }
  }, [newNotif])

  return (
    <Link
      href="/notifications"
      className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      <span className="hidden md:inline">Notificaciones</span>
    </Link>
  )
}
