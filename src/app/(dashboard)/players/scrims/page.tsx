import { createClient } from '@/lib/supabase/server'
import { Swords } from 'lucide-react'

export default async function PlayerScrimsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const { data: scrims } = await supabase
    .from('scrims')
    .select('*')
    .eq('team_id', teamMember?.team_id ?? 'none')
    .order('scheduled_at', { ascending: false })

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-white">Scrims</h1>

      {(scrims ?? []).length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <Swords size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No hay scrims registrados todavía.</p>
        </div>
      )}

      <div className="space-y-3">
        {(scrims ?? []).map((scrim) => (
          <div key={scrim.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords size={18} className="text-green-400" />
                <div>
                  <h3 className="font-medium text-white">{scrim.rival}</h3>
                  <p className="text-sm text-zinc-500">{new Date(scrim.scheduled_at).toLocaleString()}</p>
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
