'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendMessage, getInbox, getSentMessages, markMessageRead, archiveMessage, deleteMessageRecipient, deleteMessage, getUnreadMessageCount } from '@/services/mail'
import { createNotification } from '@/services/notifications'

export async function sendMail(_prev: any, formData: FormData) {
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

  const fileNames = formData.getAll('fileNames') as string[]
  const fileUrls = formData.getAll('fileUrls') as string[]
  const fileTypes = formData.getAll('fileTypes') as string[]

  const files = fileNames.map((name, i) => ({
    name,
    url: fileUrls[i] ?? '',
    type: fileTypes[i] ?? '',
    size: 0,
  }))

  const result = await sendMessage(supabase, {
    sender_id: user.id,
    subject,
    body,
    recipient_ids: recipientIds,
    files: files.length > 0 ? files : undefined,
  })

  if (result.success) {
    for (const rid of recipientIds) {
      await createNotification(supabase, {
        profile_id: rid,
        type: 'message',
        title: `Nuevo mensaje: ${subject}`,
        body: `De: ${user.email}${files.length > 0 ? ` (${files.length} archivo${files.length > 1 ? 's' : ''})` : ''}`,
        link: '/mail',
      })
    }
  }

  revalidatePath('/mail', 'layout')
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
  revalidatePath('/mail', 'layout')
}

export async function archive(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await archiveMessage(supabase, user.id, messageId)
  revalidatePath('/mail', 'layout')
}

export async function deleteMsg(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: msg } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .maybeSingle()

  if (!msg) {
    await deleteMessageRecipient(supabase, user.id, messageId)
  } else if (msg.sender_id === user.id) {
    await deleteMessage(supabase, messageId)
  } else {
    await deleteMessageRecipient(supabase, user.id, messageId)
  }

  revalidatePath('/mail', 'layout')
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
