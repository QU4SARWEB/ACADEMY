import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Plus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

async function createSeason(formData: FormData) {
  'use server'
  const supabase = await createClient()

  await supabase.from('seasons').insert({
    name: formData.get('name') as string,
    start_date: formData.get('startDate') as string,
    end_date: formData.get('endDate') as string,
    is_active: formData.get('isActive') === 'true',
  })

  revalidatePath('/coaches/seasons')
  redirect('/coaches/seasons')
}

async function activateSeason(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string

  await supabase.from('seasons').update({ is_active: false }).neq('id', id)
  await supabase.from('seasons').update({ is_active: true }).eq('id', id)

  revalidatePath('/coaches/seasons')
}

export default async function SeasonsPage() {
  const supabase = await createClient()
  const { data: seasons } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Seasons</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="space-y-3">
            {(seasons ?? []).length === 0 && (
              <p className="text-sm text-zinc-500">No hay seasons creadas.</p>
            )}
            {(seasons ?? []).map((s) => (
              <div key={s.id} className="glass glass-hover flex items-center justify-between rounded-xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{s.name}</h3>
                    {s.is_active && <CheckCircle size={14} className="text-green-400" />}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {new Date(s.start_date).toLocaleDateString()} — {new Date(s.end_date).toLocaleDateString()}
                  </p>
                </div>
                {!s.is_active && (
                  <form action={activateSeason}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs text-green-400 transition hover:bg-green-500/10">
                      Activar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="glass rounded-xl p-5">
            <h2 className="font-heading text-lg font-bold text-white">Nueva season</h2>
            <form action={createSeason} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400">Nombre</label>
                <input name="name" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" placeholder="Season 1 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Inicio</label>
                  <input name="startDate" type="date" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400">Fin</label>
                  <input name="endDate" type="date" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="isActive" value="true" className="accent-[#8B5CF6]" />
                Activar inmediatamente
              </label>
              <button type="submit" className="btn-glow w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                Crear season
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
