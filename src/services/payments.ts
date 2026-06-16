import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentStatus } from '@/types'

export async function getPayments(supabase: SupabaseClient, options?: { profileId?: string; seasonId?: string }) {
  let query = supabase
    .from('payments')
    .select('*, seasons(name), profiles(full_name, email, avatar_url)')
    .order('created_at', { ascending: false })

  if (options?.profileId) {
    query = query.eq('profile_id', options.profileId)
  }
  if (options?.seasonId) {
    query = query.eq('season_id', options.seasonId)
  }

  const { data, error } = await query
  if (error) console.error('getPayments error:', error)
  return (data ?? []) as any[]
}

export async function updatePaymentStatus(
  supabase: SupabaseClient,
  paymentId: string,
  status: PaymentStatus
) {
  const update: Record<string, any> = { status }
  if (status === 'paid') {
    update.paid_at = new Date().toISOString()
  }
  const { error } = await supabase.from('payments').update(update).eq('id', paymentId)
  if (error) console.error('updatePaymentStatus error:', error)
}

export async function createPayment(
  supabase: SupabaseClient,
  params: {
    profile_id: string
    season_id: string
    type: 'student' | 'player'
    amount?: number
    status?: PaymentStatus
  }
) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      profile_id: params.profile_id,
      season_id: params.season_id,
      type: params.type,
      amount: params.amount ?? 1.00,
      status: params.status ?? 'pending',
    })
    .select()
    .maybeSingle()

  if (error || !data) {
    console.error('createPayment error:', error)
    return null
  }
  return data
}

export async function getActiveEnrollmentsWithPaymentStatus(
  supabase: SupabaseClient,
  profileId: string
) {
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('*, courses(name, slug), seasons!inner(id, name, is_active)')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  if (enrollError) console.error('getActiveEnrollmentsWithPaymentStatus enrollments error:', enrollError)

  const results = await Promise.all(
    (enrollments ?? []).map(async (enr: any) => {
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('profile_id', profileId)
        .eq('season_id', enr.season_id)
        .order('created_at', { ascending: false })
        .maybeSingle()

      if (payError) console.error('getActiveEnrollmentsWithPaymentStatus payment error:', payError)
      return { ...enr, payment }
    })
  )

  return results
}

export async function hasDebt(supabase: SupabaseClient, profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('status', ['pending', 'expired'])

  if (error) console.error('hasDebt error:', error)
  return (count ?? 0) > 0
}
