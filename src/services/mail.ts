import type { SupabaseClient } from '@supabase/supabase-js'

export async function sendMessage(
  supabase: SupabaseClient,
  params: {
    sender_id: string
    subject: string
    body: string
    recipient_ids: string[]
    files?: { name: string; url: string; type: string; size: number }[]
  }
) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      sender_id: params.sender_id,
      subject: params.subject,
      body: params.body,
      files: params.files ?? [],
    })
    .select()
    .maybeSingle()

  if (error || !message) return { error: error?.message ?? 'Error sending message' }

  const recipients = params.recipient_ids.map((rid) => ({
    message_id: message.id,
    recipient_id: rid,
  }))

  const { error: recipError } = await supabase.from('message_recipients').insert(recipients)

  if (recipError) {
    await supabase.from('messages').delete().eq('id', message.id)
    return { error: recipError.message }
  }

  return { success: true, message }
}

export async function getInbox(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from('message_recipients')
    .select('*, message:messages!inner(*, sender:sender_id(full_name, avatar_url, email))')
    .eq('recipient_id', profileId)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return (data ?? []) as any[]
}

export async function getSentMessages(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:sender_id(full_name, avatar_url), recipients:message_recipients(recipient_id, read, profiles!inner(full_name, avatar_url))')
    .eq('sender_id', profileId)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return (data ?? []) as any[]
}

export async function markMessageRead(supabase: SupabaseClient, recipientId: string, messageId: string) {
  const { error } = await supabase
    .from('message_recipients')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('message_id', messageId)
  if (error) throw new Error(`Error al marcar como leído: ${error.message}`)
}

export async function archiveMessage(supabase: SupabaseClient, recipientId: string, messageId: string) {
  const { error } = await supabase
    .from('message_recipients')
    .update({ archived: true })
    .eq('recipient_id', recipientId)
    .eq('message_id', messageId)
  if (error) throw new Error(`Error al archivar: ${error.message}`)
}

export async function deleteMessageRecipient(supabase: SupabaseClient, recipientId: string, messageId: string) {
  const { error } = await supabase
    .from('message_recipients')
    .delete()
    .eq('recipient_id', recipientId)
    .eq('message_id', messageId)
  if (error) throw new Error(`Error al eliminar: ${error.message}`)
}

export async function deleteMessage(supabase: SupabaseClient, messageId: string) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
  if (error) throw new Error(`Error al eliminar mensaje: ${error.message}`)
}

export async function getUnreadMessageCount(supabase: SupabaseClient, profileId: string) {
  const { count, error } = await supabase
    .from('message_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .eq('read', false)
    .eq('archived', false)

  if (error) console.error(error)
  return count ?? 0
}
