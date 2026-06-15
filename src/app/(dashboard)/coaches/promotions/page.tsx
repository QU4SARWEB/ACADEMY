import { createClient } from '@/lib/supabase/server'
import { GraduationCap } from 'lucide-react'
import { getPromotionHistory } from '@/services/promotions'

export default async function PromotionsPage() {
  const supabase = await createClient()
  const promotions = await getPromotionHistory(supabase)

  return (
    <div>
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
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                  {p.profiles?.full_name?.charAt(0) ?? '?'}
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
                <p>{new Date(p.created_at).toLocaleDateString()}</p>
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
