import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Swords, Plus } from 'lucide-react'

async function createScrim(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('scrims').insert({
    team_id: formData.get('teamId') as string,
    rival: formData.get('rival') as string,
    scheduled_at: new Date(formData.get('scheduledAt') as string).toISOString(),
    result: formData.get('result') as string || null,
    score: formData.get('score') as string || null,
    notes: formData.get('notes') as string || null,
  })
  revalidatePath('/coaches/scrims')
  redirect('/coaches/scrims')
}

async function deleteScrim(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('scrims').delete().eq('id', formData.get('id') as string)
  revalidatePath('/coaches/scrims')
}

export default async function CoachScrimsPage() {
  const supabase = await createClient()

  const { data: teams } = await supabase.from('teams').select('id, name')
  const { data: scrims } = await supabase
    .from('scrims')
    .select('*, teams(name)')
    .order('scheduled_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Scrims</h1>
        <details className="relative">
          <summary className="btn-glow flex cursor-pointer items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            <Plus size={16} /> Nuevo scrim
          </summary>
          <div className="glass absolute right-0 top-full z-10 mt-2 w-80 rounded-xl p-4">
            <form action={createScrim} className="space-y-3">
              <select name="teamId" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Seleccionar equipo...</option>
                {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input name="rival" placeholder="Rival" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <input name="scheduledAt" type="datetime-local" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <div className="grid grid-cols-2 gap-2">
                <select name="result"
                  className="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Sin resultado</option>
                  <option value="win">Victoria</option>
                  <option value="loss">Derrota</option>
                  <option value="draw">Empate</option>
                </select>
                <input name="score" placeholder="Score (ej: 13-5)"
                  className="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              </div>
              <textarea name="notes" rows={2} placeholder="Notas..."
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <button type="submit" className="w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                Crear scrim
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="space-y-3">
        {(scrims ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">No hay scrims registrados.</p>
        )}
        {(scrims ?? []).map((scrim) => (
          <div key={scrim.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords size={18} className={scrim.result === 'win' ? 'text-green-400' : scrim.result === 'loss' ? 'text-red-400' : 'text-zinc-400'} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{scrim.rival}</h3>
                    <span className="text-xs text-zinc-500">{scrim.teams?.name}</span>
                  </div>
                  <p className="text-sm text-zinc-500">{new Date(scrim.scheduled_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {scrim.result && (
                  <span className={`text-sm font-bold ${scrim.result === 'win' ? 'text-green-400' : scrim.result === 'loss' ? 'text-red-400' : 'text-zinc-400'}`}>
                    {scrim.result === 'win' ? 'W' : scrim.result === 'loss' ? 'L' : 'D'}
                    {scrim.score && ` ${scrim.score}`}
                  </span>
                )}
                <form action={deleteScrim}>
                  <input type="hidden" name="id" value={scrim.id} />
                  <button type="submit" className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                </form>
              </div>
            </div>
            {scrim.notes && <p className="mt-2 border-t border-zinc-800 pt-2 text-sm text-zinc-400">{scrim.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
