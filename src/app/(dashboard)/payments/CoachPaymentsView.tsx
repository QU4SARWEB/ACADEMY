import { createClient } from '@/lib/supabase/server'
import { getAllPayments } from '@/features/payments/actions'
import PaymentStatusBadge from './PaymentStatusBadge'
import PaymentActions from './PaymentActions'

export default async function CoachPaymentsView() {
  const supabase = await createClient()
  const { data: seasons } = await supabase.from('seasons').select('id, name, is_active').order('start_date', { ascending: false })
  const activeSeason = seasons?.find((s) => s.is_active)

  const payments = await getAllPayments(activeSeason?.id)
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'player')

  const paid = payments.filter((p: any) => p.status === 'paid').length
  const pending = payments.filter((p: any) => p.status === 'pending').length
  const scholarships = payments.filter((p: any) => p.status === 'scholarship').length

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Pagos</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Estudiantes</p>
          <p className="text-2xl font-bold text-white">{totalStudents ?? 0}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Pagados</p>
          <p className="text-2xl font-bold text-green-400">{paid}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-400">{pending}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Becas</p>
          <p className="text-2xl font-bold text-blue-400">{scholarships}</p>
        </div>
      </div>

      {activeSeason && (
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
          <span>Mostrando pagos de la temporada activa:</span>
          <span className="font-medium text-white">{activeSeason.name}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#111]">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Monto</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Pagado</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Sin pagos registrados en esta temporada.
                </td>
              </tr>
            )}
            {payments.map((p: any) => (
              <tr key={p.id} className="border-b border-zinc-800 transition hover:bg-[#111]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                      {p.profiles?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{p.profiles?.full_name}</p>
                      <p className="text-xs text-zinc-500">{p.profiles?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-zinc-300">{p.type}</td>
                <td className="px-4 py-3 text-zinc-300">${p.amount}</td>
                <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3"><PaymentActions paymentId={p.id} currentStatus={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
