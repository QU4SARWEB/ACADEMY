import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types'

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    profile_id: string
    type: NotificationType
    title: string
    body?: string
    link?: string
  }
) {
  const { error } = await supabase.from('notifications').insert({
    profile_id: params.profile_id,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  })

  if (error) console.error('Error creating notification:', error)
}

export async function getNotifications(
  supabase: SupabaseClient,
  profileId: string,
  options?: { unreadOnly?: boolean; limit?: number }
) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (options?.unreadOnly) {
    query = query.eq('read', false)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data } = await query
  return (data ?? []) as any[]
}

export async function markAsRead(supabase: SupabaseClient, notificationId: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
}

export async function markAllAsRead(supabase: SupabaseClient, profileId: string) {
  await supabase.from('notifications').update({ read: true }).eq('profile_id', profileId).eq('read', false)
}

export async function getUnreadCount(supabase: SupabaseClient, profileId: string) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  return count ?? 0
}
