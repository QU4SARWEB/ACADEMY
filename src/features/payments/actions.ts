'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getPayments, updatePaymentStatus, createPayment } from '@/services/payments'
import { notifyUser } from '@/services/notify'
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
  const { data: { user } } = await supabase.auth.getUser()
  const { data: oldPayment } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle()

  await updatePaymentStatus(supabase, paymentId, status)

  if (user && oldPayment) {
    await logAudit(supabase, {
      profile_id: user.id,
      action: `payment_${status}`,
      module: 'payments',
      description: `Pago ${oldPayment.type} cambiado de ${oldPayment.status} a ${status}`,
      metadata: { payment_id: paymentId, old_status: oldPayment.status, new_status: status, amount: oldPayment.amount },
    })
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*, profiles(email)')
    .eq('id', paymentId)
    .maybeSingle() as any

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
