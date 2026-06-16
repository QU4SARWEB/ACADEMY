'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getPayments, createPayment } from '@/services/payments'
import { notifyUser } from '@/services/notify'
import { notifyMultipleUsers } from '@/services/notify'
import { logAudit } from '@/services/audit'
import type { PaymentStatus } from '@/types'

export async function getAllPayments(seasonId?: string) {
  const supabase = await createClient()
  return getPayments(supabase, { seasonId })
}

export async function getMyPayments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return getPayments(supabase, { profileId: user.id })
}

export async function updatePayment(paymentId: string, status: PaymentStatus) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error(authErr)
  if (!user) return

  const { data: oldPayment, error: oldErr } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle()
  if (oldErr) console.error(oldErr)
  if (!oldPayment) return

  const { error: updateError } = await supabase
    .from('payments')
    .update(status === 'paid' ? { status, paid_at: new Date().toISOString() } : { status })
    .eq('id', paymentId)

  if (updateError) return

  await logAudit(supabase, {
    profile_id: user.id,
    action: `payment_${status}`,
    module: 'payments',
    description: `Pago ${oldPayment.type} cambiado de ${oldPayment.status} a ${status}`,
    metadata: { payment_id: paymentId, old_status: oldPayment.status, new_status: status, amount: oldPayment.amount },
  })

  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('*, profiles(email)')
    .eq('id', paymentId)
    .maybeSingle()

  if (payErr) console.error(payErr)

  if (status === 'scholarship' && payment) {
    const { error: scholErr } = await supabase.from('profiles').update({ scholarship: true }).eq('id', payment.profile_id)
    if (scholErr) console.error(scholErr)
  } else if (oldPayment.status === 'scholarship' && payment) {
    const { count, error: countErr } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', payment.profile_id)
      .eq('status', 'scholarship')
      .neq('id', paymentId)
    if (countErr) console.error(countErr)
    if ((count ?? 0) === 0) {
      const { error: updErr } = await supabase.from('profiles').update({ scholarship: false }).eq('id', payment.profile_id)
      if (updErr) console.error(updErr)
    }
  }

  if (payment && status === 'paid') {
    await notifyUser(
      payment.profile_id,
      'payment',
      'Pago confirmado',
      'Tu pago de inscripción ha sido confirmado. Bienvenido a la temporada.',
      '/payments'
    )
  }

  revalidatePath('/payments', 'layout')
  revalidatePath('/(dashboard)', 'layout')
}

export async function addPayment(
  profileId: string,
  seasonId: string,
  type: 'student' | 'player',
  status: PaymentStatus = 'pending'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await createPayment(supabase, { profile_id: profileId, season_id: seasonId, type, status })

  if (user) {
    await logAudit(supabase, {
      profile_id: user.id,
      action: 'payment_created',
      module: 'payments',
      description: `Registro de pago creado para ${type}`,
      metadata: { target_profile: profileId, type, status },
    })
  }

  revalidatePath('/payments', 'layout')
}

export async function uploadReceiptAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  let paymentId = formData.get('paymentId') as string
  const file = formData.get('receipt') as File
  if (!file) return

  if (!paymentId) {
    const enrollmentId = formData.get('enrollmentId') as string
    const seasonId = formData.get('seasonId') as string
    const type = formData.get('type') as 'student' | 'player'
    if (!enrollmentId || !seasonId || !type) return
    await createPayment(supabase, { profile_id: user.id, season_id: seasonId, type, status: 'pending' })
    const { data: newPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('profile_id', user.id)
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!newPayment) return
    paymentId = newPayment.id
  }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${paymentId}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' })

  if (uploadError) return

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)

  await supabase.from('payments').update({ receipt_url: publicUrl }).eq('id', paymentId)

  const { data: coaches, error: coachesErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'coach')
    .eq('is_active', true)

  if (coachesErr) console.error(coachesErr)
  if (coaches && coaches.length > 0) {
    await notifyMultipleUsers(
      coaches.map((c) => c.id),
      'payment',
      'Nuevo comprobante de pago',
      'Un estudiante ha subido un comprobante. Revisa en pagos.',
      '/payments'
    )
  }

  revalidatePath('/payments', 'layout')
}
