'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getActiveEnrollmentsWithPaymentStatus } from '@/services/payments'
import PaymentStatusBadge from './PaymentStatusBadge'
import { uploadReceiptAction } from '@/features/payments/actions'
import { formatDate } from '@/lib/formatDate'

export default function StudentPaymentsView() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const enr = await getActiveEnrollmentsWithPaymentStatus(supabase, user.id)
      setEnrollments(enr)
      setLoading(false)
    })()
  }, [])

  const needsPayment = enrollments.filter((e: any) => !e.payment || e.payment?.status === 'pending' || e.payment?.status === 'expired')
  const totalPaid = enrollments.filter((e: any) => e.payment?.status === 'paid').length
  const totalScholarship = enrollments.filter((e: any) => e.payment?.status === 'scholarship').length

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mis Pagos</h1>

      {needsPayment.length > 0 && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Tienes {needsPayment.length} curso(s) con pago pendiente. Sube tu comprobante para continuar.
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Cursos activos</p>
          <p className="text-2xl font-bold text-white">{enrollments.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Pagados</p>
          <p className="text-2xl font-bold text-green-400">{totalPaid}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Beca</p>
          <p className="text-2xl font-bold text-blue-400">{totalScholarship}</p>
        </div>
      </div>

      <div className="space-y-3">
        {enrollments.length === 0 && (
          <div className="glass rounded-xl p-6 text-center text-sm text-zinc-500">
            No tienes cursos activos.
          </div>
        )}
        {enrollments.map((enr: any) => {
          const status = enr.payment?.status ?? 'pending'
          return (
            <div key={enr.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{enr.courses?.name}</h3>
                  <p className="text-xs text-zinc-500">{enr.seasons?.name}</p>
                </div>
                <div className="text-right">
                  <PaymentStatusBadge status={status} />
                  {enr.payment?.amount && (
                    <p className="mt-0.5 text-xs text-zinc-500">${enr.payment.amount}</p>
                  )}
                  {enr.payment?.paid_at && (
                    <p className="text-xs text-zinc-600">
                      {formatDate(enr.payment.paid_at)}
                    </p>
                  )}
                </div>
              </div>
              {(status === 'pending' || status === 'expired') && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  {enr.payment?.receipt_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400">Comprobante subido</span>
                      <a href={enr.payment.receipt_url} target="_blank"
                        className="text-xs text-[#8B5CF6] hover:underline">Ver</a>
                    </div>
                  ) : (
                    <form action={uploadReceiptAction} className="flex items-center gap-2">
                      <input type="hidden" name="paymentId" value={enr.payment?.id ?? ''} />
                      <input type="hidden" name="enrollmentId" value={enr.id} />
                      <input type="hidden" name="seasonId" value={enr.season_id} />
                      <input type="hidden" name="type" value={enr.type} />
                      <input type="file" name="receipt" required accept="image/*,.pdf"
                        className="w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-[#8B5CF6]/20 file:px-2 file:py-1 file:text-xs file:text-[#8B5CF6]" />
                      <button type="submit"
                        className="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7C3AED]">
                        Subir
                      </button>
                    </form>
                  )}
                </div>
              )}
              {status === 'scholarship' && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-blue-400">Tu curso está cubierto por una beca. No necesitas realizar ningún pago.</p>
                </div>
              )}
              {status === 'paid' && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs text-green-400">Pago confirmado. ¡Gracias!</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
