'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Swords, ArrowLeft } from 'lucide-react'
import { TimeDisplay } from '@/components/TimeDisplay'

export default function PlayerScrimsPage() {
  const [scrims, setScrims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      const { data: scrimsData } = await supabase
        .from('scrims')
        .select('*')
        .eq('team_id', teamMember?.team_id ?? 'none')
        .order('scheduled_at', { ascending: false })

      setScrims(scrimsData ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/players/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Scrims</h1>

      {scrims.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Swords size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No hay scrims registrados todavía.</p>
        </div>
      )}

      <div className="space-y-3">
        {scrims.map((scrim) => (
          <div key={scrim.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords size={18} className="text-green-400" />
                <div>
                  <div className="flex items-center gap-2">
                    {scrim.rival_logo && (
                      <img src={scrim.rival_logo} alt="" className="h-6 w-6 rounded-full object-cover" />
                    )}
                    <h3 className="font-medium text-white">{scrim.rival}</h3>
                  </div>
                  <p className="text-sm text-zinc-500"><TimeDisplay date={scrim.scheduled_at} /></p>
                </div>
              </div>
              <div className="text-right">
                {scrim.result ? (
                  <>
                    <p className={`text-sm font-bold ${scrim.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                      {scrim.result === 'win' ? 'Victoria' : scrim.result === 'loss' ? 'Derrota' : scrim.result === 'draw' ? 'Empate' : scrim.result}
                    </p>
                    {scrim.score && <p className="text-xs text-zinc-500">{scrim.score}</p>}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Programado</p>
                )}
              </div>
            </div>
            {scrim.notes && (
              <p className="mt-2 border-t border-zinc-800 pt-2 text-sm text-zinc-400">{scrim.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
