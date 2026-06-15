import { createClient } from '@/lib/supabase/server'
import { getActiveEnrollmentsWithPaymentStatus } from '@/services/payments'
import PaymentStatusBadge from './PaymentStatusBadge'

export default async function StudentPaymentsView() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const enrollments = await getActiveEnrollmentsWithPaymentStatus(supabase, user.id)

  const hasDue = enrollments.some((e: any) => e.payment?.status === 'pending' || e.payment?.status === 'expired')
  const totalPaid = enrollments.filter((e: any) => e.payment?.status === 'paid').length
  const totalScholarship = enrollments.filter((e: any) => e.payment?.status === 'scholarship').length

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Mis Pagos</h1>

      {hasDue && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          Tienes pagos pendientes. Por favor, ponte al día para continuar con tus cursos.
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
        {enrollments.map((enr: any) => (
          <div key={enr.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">{enr.courses?.name}</h3>
                <p className="text-xs text-zinc-500">{enr.seasons?.name}</p>
              </div>
              <div className="text-right">
                {enr.payment ? (
                  <>
                    <PaymentStatusBadge status={enr.payment.status} />
                    <p className="mt-0.5 text-xs text-zinc-500">${enr.payment.amount}</p>
                    {enr.payment.paid_at && (
                      <p className="text-xs text-zinc-600">
                        {new Date(enr.payment.paid_at).toLocaleDateString()}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-zinc-600">Sin registro</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
