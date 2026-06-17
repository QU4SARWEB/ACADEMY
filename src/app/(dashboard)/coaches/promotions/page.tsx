'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { getPromotionHistory } from '@/services/promotions'
import { formatDate } from '@/lib/formatDate'

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const data = await getPromotionHistory(supabase)
      setPromotions(data)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Historial de Promociones</h1>

      {promotions.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <GraduationCap size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No hay promociones registradas.</p>
        </div>
      )}

      <div className="space-y-3">
        {promotions.map((p: any) => (
          <div key={p.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    p.profiles?.full_name?.charAt(0) ?? '?'
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{p.profiles?.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{p.from_course?.name}</span>
                    {p.to_course && (
                      <>
                        <span>→</span>
                        <span>{p.to_course?.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>{formatDate(p.created_at)}</p>
                {p.grade_at_time && <p>Nota: {p.grade_at_time}</p>}
                {p.rank_at_time && <p>Rango: {p.rank_at_time}</p>}
                {p.promoter && <p className="mt-1 text-purple-400">Por: {p.promoter.full_name}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
