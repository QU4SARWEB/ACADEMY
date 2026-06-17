'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileText, ArrowLeft } from 'lucide-react'
import StudentGradeCard from './StudentGradeCard'
import PaymentStatusBadge from '@/app/(dashboard)/payments/PaymentStatusBadge'

export default function StudentGradesPage() {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [paymentMap, setPaymentMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: enr } = await supabase
        .from('enrollments')
        .select('*, courses(name, slug, min_rank), seasons(name)')
        .eq('profile_id', user.id)
        .order('enrolled_at', { ascending: false })

      setEnrollments(enr ?? [])

      const seasonIds = [...new Set((enr ?? []).map((e: any) => e.season_id))]
      const map = new Map<string, string>()
      if (seasonIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('season_id, status')
          .eq('profile_id', user.id)
          .in('season_id', seasonIds)
        for (const p of payments ?? []) {
          map.set(p.season_id, p.status)
        }
      }
      setPaymentMap(map)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
      <Link href="/students/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Notas y Promociones</h1>

      {enrollments.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <FileText size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No tienes cursos inscritos.</p>
        </div>
      )}

      <div className="space-y-4">
        {enrollments.map((enr) => (
          <div key={enr.id}>
            {paymentMap.has(enr.season_id) && (
              <div className="mb-1 flex justify-end">
                <PaymentStatusBadge status={paymentMap.get(enr.season_id)!} />
              </div>
            )}
            <StudentGradeCard enrollmentId={enr.id} enrollment={enr} />
          </div>
        ))}
      </div>
    </div>
  )
}
