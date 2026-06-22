import { supabase } from '@/304244'

export type PaymentStatus = 'paid' | 'pending' | 'scholarship' | 'expired' | 'none'

export interface PaymentInfo {
  status: PaymentStatus
  amount: number
  paidAt: string | null
  enrollmentId: string | null
  isFree: boolean
}

/**
 * Single source of truth for payment status.
 * 
 * Rules:
 * - Free course → status 'paid', amount 0 (no payment record needed)
 * - Scholarship → status 'scholarship', amount 0
 * - Has payment record → use its status
 * - No payment record → status 'none'
 * - If multiple payments exist, the latest (by created_at) determines status
 */
export async function getPaymentStatus(profileId: string, courseId?: string): Promise<PaymentInfo> {
  // Check if course is free
  let isFree = false
  if (courseId) {
    const { data: course } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle()
    isFree = !course?.price || course?.price <= 0
  }

  if (isFree) {
    return { status: 'paid', amount: 0, paidAt: null, enrollmentId: null, isFree: true }
  }

  // Get latest payment
  const { data: payment } = await supabase
    .from('payments')
    .select('status, amount, paid_at, enrollment_id')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!payment) {
    return { status: 'none', amount: 0, paidAt: null, enrollmentId: null, isFree: false }
  }

  return {
    status: payment.status as PaymentStatus,
    amount: payment.amount || 0,
    paidAt: payment.paid_at,
    enrollmentId: payment.enrollment_id,
    isFree: false,
  }
}

/**
 * Get payment status per course for a specific enrollment.
 * Uses enrollment_id to find the specific payment.
 */
export async function getCoursePaymentStatus(enrollmentId: string): Promise<PaymentInfo> {
  const { data: payment } = await supabase
    .from('payments')
    .select('status, amount, paid_at, enrollment_id')
    .eq('enrollment_id', enrollmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!payment) {
    return { status: 'none', amount: 0, paidAt: null, enrollmentId: null, isFree: false }
  }

  return {
    status: payment.status as PaymentStatus,
    amount: payment.amount || 0,
    paidAt: payment.paid_at,
    enrollmentId: payment.enrollment_id,
    isFree: !payment.amount || payment.amount <= 0,
  }
}

export function getStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: 'Pagado',
    pending: 'Pendiente',
    scholarship: 'Beca',
    expired: 'Vencido',
    none: 'Sin pago',
  }
  return labels[status] || status
}

export function getStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    paid: 'text-green-400 bg-green-500/10 border-green-500/30',
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    scholarship: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    expired: 'text-red-400 bg-red-500/10 border-red-500/30',
    none: 'text-zinc-500 bg-zinc-800/30 border-zinc-700/30',
  }
  return colors[status] || colors.none
}
