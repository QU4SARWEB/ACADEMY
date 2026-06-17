'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getAllPayments } from '@/features/payments/actions'
import PaymentStatusBadge from './PaymentStatusBadge'
import PaymentActions from './PaymentActions'
import { formatDate } from '@/lib/formatDate'

export default function CoachPaymentsView() {
  const [seasons, setSeasons] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [totalStudents, setTotalStudents] = useState<number>(0)
  const [totalPlayers, setTotalPlayers] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: seasonsData } = await supabase.from('seasons').select('id, name, is_active').order('start_date', { ascending: false })
      setSeasons(seasonsData ?? [])
      const activeSeason = seasonsData?.find((s: any) => s.is_active)

      const paymentsData = await getAllPayments(activeSeason?.id)
      setPayments(paymentsData)

      const { count: sCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
      setTotalStudents(sCount ?? 0)

      const { count: pCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'player')
      setTotalPlayers(pCount ?? 0)

      setLoading(false)
    })()
  }, [])

  const activeSeason = seasons.find((s) => s.is_active)
  const paid = payments.filter((p: any) => p.status === 'paid').length
  const pending = payments.filter((p: any) => p.status === 'pending').length
  const scholarships = payments.filter((p: any) => p.status === 'scholarship').length

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="h-64 w-full animate-pulse rounded-xl bg-zinc-800" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Pagos</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-zinc-500">Estudiantes</p>
          <p className="text-2xl font-bold text-white">{totalStudents}</p>
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
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Comprobante</th>
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
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                      {p.profiles?.avatar_url ? (
                        <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        p.profiles?.full_name?.charAt(0) ?? '?'
                      )}
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
                <td className="px-4 py-3">
                  {p.receipt_url ? (
                    <a href={p.receipt_url} target="_blank"
                      className="text-xs text-[#8B5CF6] hover:underline">Ver comprobante</a>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {p.paid_at ? formatDate(p.paid_at) : '—'}
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
