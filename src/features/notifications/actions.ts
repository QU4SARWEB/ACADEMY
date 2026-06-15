'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  getNotifications as fetchNotifications,
  getUnreadCount as fetchUnreadCount,
  markAsRead as doMarkRead,
  markAllAsRead as doMarkAllRead,
} from '@/services/notifications'

export async function getNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return fetchNotifications(supabase, user.id, options)
}

export async function getUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  return fetchUnreadCount(supabase, user.id)
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()
  await doMarkRead(supabase, notificationId)
  revalidatePath('/notifications', 'layout')
}

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await doMarkAllRead(supabase, user.id)
  revalidatePath('/notifications', 'layout')
}
