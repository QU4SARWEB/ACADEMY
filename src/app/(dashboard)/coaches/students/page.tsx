'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PaymentStatusBadge from '@/app/(dashboard)/payments/PaymentStatusBadge'
import { formatDate } from '@/lib/formatDate'

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [paymentMap, setPaymentMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()

      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, riot_id, rank, is_active, scholarship, created_at')
        .eq('role', 'student')
        .order('full_name')
      setStudents(studentsData ?? [])

      const pm = new Map<string, string>()
      if (activeSeason && studentsData) {
        const { data: payments } = await supabase
          .from('payments')
          .select('profile_id, status')
          .eq('season_id', activeSeason.id)
          .in('profile_id', studentsData.map(s => s.id))
        for (const p of payments ?? []) {
          pm.set(p.profile_id, p.status)
        }
      }
      setPaymentMap(pm)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-zinc-800" />
        <div className="h-8 w-48 rounded bg-zinc-800" />
        <div className="h-4 w-36 rounded bg-zinc-800" />
        <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900/50" />
      </div>
    )
  }

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Estudiantes</h1>
        <p className="mt-1 text-sm text-zinc-400">{students?.length ?? 0} estudiantes registrados</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#111]">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Riot ID</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Rango</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Beca</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Pago</th>
              <th className="px-4 py-3 text-center font-medium text-zinc-400">Activo</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Registro</th>
            </tr>
          </thead>
          <tbody>
            {(students ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">Sin estudiantes registrados.</td>
              </tr>
            )}
            {(students ?? []).map((s) => (
              <tr key={s.id} className="border-b border-zinc-800 transition hover:bg-[#111]">
                <td className="px-4 py-3">
                  <Link href={`/coaches/students/${s.id}`} className="flex items-center gap-3">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                        {s.full_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-white">{s.full_name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400">{s.email}</td>
                <td className="px-4 py-3 text-zinc-400">{s.riot_id ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{s.rank}</td>
                <td className="px-4 py-3 text-center">
                  {s.scholarship ? <span className="text-green-400">Sí</span> : <span className="text-zinc-500">No</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {paymentMap.has(s.id) ? (
                    <PaymentStatusBadge status={paymentMap.get(s.id)!} />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {formatDate(s.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
