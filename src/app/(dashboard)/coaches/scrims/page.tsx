import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Swords, Plus, ArrowLeft } from 'lucide-react'
import { TimeDisplay } from '@/components/TimeDisplay'

async function createScrim(formData: FormData) {
  'use server'
  const supabase = await createClient()

  const rivalLogo = formData.get('rivalLogo') as File | null
  let rivalLogoUrl: string | null = null
  if (rivalLogo && rivalLogo.size > 0) {
    const ext = rivalLogo.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, rivalLogo, { upsert: true, contentType: rivalLogo.type || 'application/octet-stream' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      rivalLogoUrl = publicUrl
    }
  }

  const scoreQu4sar = formData.get('scoreQu4sar') as string
  const scoreOpponent = formData.get('scoreOpponent') as string
  const score = scoreQu4sar && scoreOpponent ? `${scoreQu4sar}-${scoreOpponent}` : null

  await supabase.from('scrims').insert({
    team_id: formData.get('teamId') as string,
    season_id: formData.get('seasonId') as string || null,
    rival: formData.get('rival') as string,
    scheduled_at: new Date(formData.get('scheduledAt') as string).toISOString(),
    result: formData.get('result') as string || null,
    score,
    rival_logo: rivalLogoUrl,
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
  const { data: seasons } = await supabase.from('seasons').select('id, name').order('start_date', { ascending: false })
  const { data: scrims } = await supabase
    .from('scrims')
    .select('*, teams(name), seasons(name)')
    .order('scheduled_at', { ascending: false })

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Scrims</h1>
        <details className="relative">
          <summary className="btn-glow flex cursor-pointer items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
            <Plus size={16} /> Nuevo scrim
          </summary>
          <div className="glass absolute right-0 top-full z-10 mt-2 w-96 rounded-xl p-4">
            <form action={createScrim} className="space-y-3" encType="multipart/form-data">
              <select name="teamId" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Seleccionar equipo...</option>
                {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select name="seasonId"
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                <option value="">Sin temporada</option>
                {(seasons ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input name="rival" placeholder="Rival" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <input name="scheduledAt" type="datetime-local" required
                className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-500">
                  Score QU4SAR
                  <input name="scoreQu4sar" type="number" min="0" placeholder="13"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </label>
                <label className="text-xs text-zinc-500">
                  Score Rival
                  <input name="scoreOpponent" type="number" min="0" placeholder="5"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="result"
                  className="rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]">
                  <option value="">Sin resultado</option>
                  <option value="win">Victoria</option>
                  <option value="loss">Derrota</option>
                  <option value="draw">Empate</option>
                </select>
                <input name="rivalLogo" type="file" accept="image/*"
                  className="w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-[#8B5CF6]/20 file:px-2 file:py-1 file:text-xs file:text-[#8B5CF6]" />
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
                    {scrim.rival_logo && (
                      <img src={scrim.rival_logo} alt="" className="h-6 w-6 rounded-full object-cover" />
                    )}
                    <h3 className="font-medium text-white">{scrim.rival}</h3>
                    <span className="text-xs text-zinc-500">{scrim.teams?.name}</span>
                  </div>
                  <p className="text-sm text-zinc-500"><TimeDisplay date={scrim.scheduled_at} /></p>
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
