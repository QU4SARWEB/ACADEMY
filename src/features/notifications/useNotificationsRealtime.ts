'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useNotificationsRealtime(profileId: string) {
  const [newNotification, setNewNotification] = useState<any | null>(null)

  useEffect(() => {
    if (!profileId) return

    const supabase = createClient()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          setNewNotification(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId])

  return newNotification
}
