import type { SupabaseClient } from '@supabase/supabase-js'

export async function sendMessage(
  supabase: SupabaseClient,
  params: {
    sender_id: string
    subject: string
    body: string
    recipient_ids: string[]
  }
) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      sender_id: params.sender_id,
      subject: params.subject,
      body: params.body,
    })
    .select()
    .single()

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
  const { data } = await supabase
    .from('message_recipients')
    .select('*, message:messages!inner(*, sender:sender_id(full_name, avatar_url, email))')
    .eq('recipient_id', profileId)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  return (data ?? []) as any[]
}

export async function getSentMessages(supabase: SupabaseClient, profileId: string) {
  const { data } = await supabase
    .from('messages')
    .select('*, recipients:message_recipients(recipient_id, read, profiles!inner(full_name, avatar_url))')
    .eq('sender_id', profileId)
    .order('created_at', { ascending: false })

  return (data ?? []) as any[]
}

export async function markMessageRead(supabase: SupabaseClient, recipientId: string, messageId: string) {
  await supabase
    .from('message_recipients')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('message_id', messageId)
}

export async function archiveMessage(supabase: SupabaseClient, recipientId: string, messageId: string) {
  await supabase
    .from('message_recipients')
    .update({ archived: true })
    .eq('recipient_id', recipientId)
    .eq('message_id', messageId)
}

export async function getUnreadMessageCount(supabase: SupabaseClient, profileId: string) {
  const { count } = await supabase
    .from('message_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .eq('read', false)
    .eq('archived', false)

  return count ?? 0
}
