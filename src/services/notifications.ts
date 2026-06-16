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

  const { data, error } = await query
  if (error) console.error(error)
  return (data ?? []) as any[]
}

export async function markAsRead(supabase: SupabaseClient, notificationId: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
  if (error) console.error(error)
}

export async function markAllAsRead(supabase: SupabaseClient, profileId: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('profile_id', profileId).eq('read', false)
  if (error) console.error(error)
}

export async function getUnreadCount(supabase: SupabaseClient, profileId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('read', false)

  if (error) console.error(error)
  return count ?? 0
}
