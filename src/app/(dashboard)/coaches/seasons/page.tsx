'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, CheckCircle, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { formatDate } from '@/lib/formatDate'
import { createSeason, activateSeason, updateSeason, deleteSeason } from './actions'

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
      setSeasons(data ?? [])
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-800" />
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-zinc-800" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href="/coaches/dashboard" className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Seasons</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="space-y-3">
            {seasons.length === 0 && (
              <p className="text-sm text-zinc-500">No hay seasons creadas.</p>
            )}
            {seasons.map((s) => (
              <details key={s.id} className="glass rounded-xl transition">
                <summary className="flex cursor-pointer items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{s.name}</h3>
                      {s.is_active && <CheckCircle size={14} className="text-green-400" />}
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {formatDate(s.start_date)} — {formatDate(s.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.is_active && (
                      <form action={activateSeason}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs text-green-400 transition hover:bg-green-500/10">
                          Activar
                        </button>
                      </form>
                    )}
                  </div>
                </summary>
                <div className="border-t border-zinc-800 px-4 py-4">
                  <form action={updateSeason} className="space-y-3">
                    <input type="hidden" name="id" value={s.id} />
                    <div>
                      <label className="block text-xs font-medium text-zinc-400">Nombre</label>
                      <input name="name" defaultValue={s.name} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">Inicio</label>
                        <input name="startDate" type="date" defaultValue={s.start_date?.slice(0, 10)} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">Fin</label>
                        <input name="endDate" type="date" defaultValue={s.end_date?.slice(0, 10)} required className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7C3AED]">
                        Guardar
                      </button>
                    </div>
                  </form>
                  <div className="mt-3">
                    <ConfirmDeleteForm message="¿Eliminar esta season?" action={deleteSeason}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10">
                        Eliminar
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </div>
              </details>
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
