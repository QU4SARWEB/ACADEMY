'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMessage, getInbox, getSentMessages, markMessageRead, archiveMessage, getUnreadMessageCount } from '@/services/mail'
import { createNotification } from '@/services/notifications'

export async function sendMail(prev: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const rawIds = formData.getAll('recipientIds')
  if (!rawIds || rawIds.length === 0) return { error: 'Selecciona al menos un destinatario' }
  const recipientIds = rawIds as string[]
  const subject = formData.get('subject') as string
  const body = formData.get('body') as string

  if (!subject || !body || recipientIds.length === 0) {
    return { error: 'Completa todos los campos' }
  }

  const result = await sendMessage(supabase, {
    sender_id: user.id,
    subject,
    body,
    recipient_ids: recipientIds,
  })

  if (result.success) {
    for (const rid of recipientIds) {
      await createNotification(supabase, {
        profile_id: rid,
        type: 'message',
        title: `Nuevo mensaje: ${subject}`,
        body: `De: ${user.email}`,
        link: '/mail',
      })
    }
  }

  revalidatePath('/mail')
  return result
}

export async function fetchInbox() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return getInbox(supabase, user.id)
}

export async function fetchSent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return getSentMessages(supabase, user.id)
}

export async function markRead(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await markMessageRead(supabase, user.id, messageId)
  revalidatePath('/mail')
}

export async function archive(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await archiveMessage(supabase, user.id, messageId)
  revalidatePath('/mail')
}

export async function fetchUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  return getUnreadMessageCount(supabase, user.id)
}

export async function fetchAllUsers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('is_active', true)
    .order('full_name')

  return data ?? []
}
